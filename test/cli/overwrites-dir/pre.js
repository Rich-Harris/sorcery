var sander = require( 'sander' );

module.exports = function () {
	sander.copydirSync( __dirname, 'files' ).to( __dirname, 'actual' );
};
