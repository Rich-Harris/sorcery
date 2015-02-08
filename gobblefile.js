var gobble = require( 'gobble' );

gobble.cwd( __dirname );

module.exports = gobble( 'src' )
.transform( '6to5', {
	blacklist: [ 'es6.modules', 'useStrict' ],
	sourceMap: false
})
.transform( 'esperanto-bundle', {
	entry: 'index',
	dest: 'sorcery',
	type: 'cjs',
	strict: true,
	sourceMap: false
});