var gobble = require( 'gobble' );
var renameMapFiles = require( '../../renameMapFiles' );

gobble.cwd( __dirname );

var src = gobble( 'src' );
var js = src
	.transform( 'babel', {
		blacklist: [ 'es6.modules', 'useStrict' ]
	})
	.transform( 'esperanto', {
		type: 'cjs'
	});

module.exports = gobble([ src, js ]).transform( renameMapFiles );
