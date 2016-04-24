var sander = require( 'sander' );

module.exports = function () {
	sander.rimrafSync( __dirname, 'actual', 'foo.coffee' );
	sander.rimrafSync( __dirname, 'actual', 'bar.coffee' );

	sander.rimrafSync( __dirname, 'actual', 'foo.js' );
	sander.rimrafSync( __dirname, 'actual', 'bar.js' );

	sander.rimrafSync( __dirname, 'actual', 'foo.js.map' );
	sander.rimrafSync( __dirname, 'actual', 'bar.js.map' );
};
