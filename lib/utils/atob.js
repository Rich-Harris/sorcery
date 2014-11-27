module.exports = function ( base64 ) {
	return new Buffer( base64, 'base64' ).toString( 'utf8' );
};