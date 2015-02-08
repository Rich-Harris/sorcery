import path from 'path';
import sander from 'sander';
import atob from './atob';

export default function getMapFromUrl ( url, base, sync ) {
	var json, map, match;

	if ( /^data/.test( url ) ) {
		match = /base64,(.+)$/.exec( url );

		if ( !match ) {
			throw new Error( 'sourceMappingURL is not base64-encoded' );
		}

		json = atob( match[1] );
		map = JSON.parse( json );
		return sync ? map : sander.Promise.resolve( map );
	}

	url = path.resolve( path.dirname( base ), url );

	if ( sync ) {
		return JSON.parse( sander.readFileSync( url ).toString() );
	} else {
		return sander.readFile( url ).then( String ).then( JSON.parse );
	}
}