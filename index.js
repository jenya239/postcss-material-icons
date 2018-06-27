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
	//https://material.io/tools/icons/static/icons/outline-add_box-24px.svg
	//`https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/${id}`
	let url =`https://material.io/tools/icons/static/icons/${id}`;
	const cache_path =path.resolve( __dirname, 'cache', id );
	return got(url)
		.then( res => new Promise( ( resolve, reject ) =>{
			fs .writeFile( cache_path, res.body, ( err ) => {
				err ? reject( err ) : resolve( res.body );
				 } );
			 } ) )
		.catch( error =>{ 
			console .log( 'error', url );
			return fs.readFileSync( path.resolve( __dirname, 'images', id ) );} );
}

function getIcon(name, theme, size) {
	name = name.replace(/\s/g, '_');
	theme = theme || 'black';
	theme =theme.replace( /'|"/g, '' );
	if( theme =='black' ) theme ='baseline';
	if( theme =='white' ) theme ='outline';
	//size = size || 24;
	size = 24;

	//ic_notifications_none_white_36px.svg
	//outline-add_box-24px.svg
	//`ic_${name}_${color}_${size}px.svg`;
	const id = `${theme}-${name}-${size}px.svg`;
	const cache_path =path.resolve( __dirname, 'cache', id );
	let icon =null;
	if( fs.existsSync( cache_path ) ){
		icon =new Promise( ( resolve, reject ) =>{
			fs .readFile( cache_path, ( err, data ) => {
				err ? reject( err ) : resolve( data );
				 } );
			 } );
		 }
	else {
		icon =fetchIcon( id );
		 }

	return icon .then( toBase64 );
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
