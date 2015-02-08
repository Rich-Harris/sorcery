export default function atob ( base64 ) {
	return new Buffer( base64, 'base64' ).toString( 'utf8' );
}