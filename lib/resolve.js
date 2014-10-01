var sander = require( 'sander' ),
	Node = require( './Node' );

module.exports = function ( filename, options ) {
	var node = new Node( filename );

	return node.init().then( function () {
		return node.build( options );
	});
};