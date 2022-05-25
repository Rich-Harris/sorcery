/**
 * Decodes a base64 string
 * @param {string} base64 - the string to decode
 * @returns {string}
 */
export default function atob ( base64 ) {
	return Buffer.from( base64, 'base64' ).toString( 'utf8' );
}