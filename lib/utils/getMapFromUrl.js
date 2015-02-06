var path = require( 'path' ),
	sander = require( 'sander' ),
	atob = require( './atob' );

module.exports = function getMapFromUrl ( url, base, sync ) {
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
};