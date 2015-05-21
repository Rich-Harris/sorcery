import { dirname, resolve } from 'path';
import { readFile, readFileSync, Promise } from 'sander';
import atob from './atob';

/**
 * Turns a sourceMappingURL into a sourcemap
 * @param {string} url - the URL (i.e. sourceMappingURL=url). Can
   be a base64-encoded data URI
 * @param {string} base - the URL against which relative URLS
   should be resolved
 * @param {boolean} sync - if `true`, return a promise, otherwise
   return the sourcemap
 * @returns {object} - a version 3 sourcemap
 */
export default function getMapFromUrl ( url, base, sync ) {
	if ( /^data:/.test( url ) ) { // TODO beef this up
		const match = /base64,(.+)$/.exec( url );

		if ( !match ) {
			throw new Error( 'sourceMappingURL is not base64-encoded' );
		}

		const json = atob( match[1] );
		const map = JSON.parse( json );
		return sync ? map : Promise.resolve( map );
	}

	url = resolve( dirname( base ), decodeURI( url ) );

	if ( sync ) {
		return JSON.parse( readFileSync( url ).toString() );
	} else {
		return readFile( url ).then( String ).then( JSON.parse );
	}
}
