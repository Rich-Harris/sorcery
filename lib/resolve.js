var sander = require( 'sander' ),
	Node = require( './Node' );

module.exports = function ( filename, options ) {
	var node = new Node( filename );

	return node.init().then( function () {
		if ( node.isOriginalSource ) {
			return null;
		}

		return node.build( options );
	});
};