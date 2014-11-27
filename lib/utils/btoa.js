module.exports = function ( str ) {
	return new Buffer( str ).toString( 'base64' );
};