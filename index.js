'use strict';
const got = require('got');
const cacha = require('cacha');
const postcss = require('postcss');
const replaceAsync = require('string-replace-async');
const fs = require( 'fs' );
const path =require( 'path' );

const cache = cacha('.material-icons/cache');
const FN_REGEX = /material\(([^\)!]*)\)/g;

function toBase64(body) {
	return new Buffer(body).toString('base64');
}

function fetchIcon(id) {
	//https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/
	return got(`https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/${id}`)
		.then(res => cache.set(id, res.body))
		.catch( error =>{ 
			return fs.readFileSync( path.resolve( __dirname, 'images', id ) );} );
}

function getIcon(name, color, size) {
	name = name.replace(/\s/g, '_');
	color = color || 'black';
	color =color.replace( /'|"/g, '' )
	size = size || 24;

	//ic_notifications_none_white_36px.svg
	const id = `ic_${name}_${color}_${size}px.svg`;

	return cache.get(id)
		.then(res => res || fetchIcon(id))
		.then(toBase64);
}

module.exports = postcss.plugin('material-icons', opts => {
	opts = opts || {};

	return css => {
		const promises = [];

		css.walkDecls(decl => {
			const replacer = (match, args) => {
				args = args.split(',').map(arg => arg.trim());

				return getIcon.apply(null, args)
					.then(res => `url(data:image/svg+xml;base64,${res})`);
			};

			const apply = res => {
				decl.value = res;
			};

			const promise = replaceAsync(decl.value, FN_REGEX, replacer).then(apply);

			promises.push(promise);
		});

		return Promise.all(promises);
	};
});
