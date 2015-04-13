var gobble = require( 'gobble' );
var renameMapFiles = require( '../../renameMapFiles' );

gobble.cwd( __dirname );

var src = gobble( 'src' );
var js = src
	.transform( 'babel', {
		blacklist: [ 'es6.modules', 'useStrict' ],
		sourceMaps: 'inline'
	})
	.transform( 'esperanto', {
		type: 'cjs',
		sourceMap: 'inline'
	});

module.exports = gobble([ src, js ]).transform( renameMapFiles );
