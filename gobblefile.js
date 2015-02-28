var gobble = require( 'gobble' );

gobble.cwd( __dirname );

module.exports = gobble( 'src' )
.transform( '6to5', {
	whitelist: [
		'es6.arrowFunctions',
		'es6.blockScoping',
		'es6.constants',
		'es6.destructuring',
		'es6.parameters.default',
		'es6.parameters.rest',
		'es6.properties.shorthand'
	],
	sourceMap: false
})
.transform( 'esperanto-bundle', {
	entry: 'index',
	dest: 'sorcery',
	type: 'cjs',
	strict: true,
	sourceMap: false
});
