var fse = require( 'fs-extra' );
var path = require( 'path' );

module.exports = function () {
	fse.copySync( path.join(__dirname, 'files' ), path.join( __dirname, 'actual' ));
};
