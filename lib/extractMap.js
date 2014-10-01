var sander = require( 'sander' ),
	path = require( 'path' ),
	atob = require( './atob' );

module.exports = function ( node ) {
	var match, url, err;

	match = /\/\/#\s*sourceMappingURL=([^\s]+)/.exec( node.content );

	if ( !match ) {
		err = new Error( 'Could not find sourceMappingURL comment' );
		err.code = 'SOURCEMAP_COMMENT_NOTFOUND';
		throw err;
	}

	url = match[1];

	if ( /^data/.test( url ) ) {
		match = /base64,(.+)$/.exec( url );

		if ( !match ) {
			err = new Error( 'sourceMappingURL is not base64-encoded' );
			err.code = 'SOURCEMAP_BAD_ENCODING';
			throw err;
		}

		json = atob( match[1] );
		return JSON.parse( json );
	}

	url = path.resolve( path.dirname( node.file ), url );

	// resolve mapping url
	return sander.readFile( url ).then( String ).then( JSON.parse );
};