var gobble = require( 'gobble' );
var renameMapFiles = require( '../../renameMapFiles' );

gobble.cwd( __dirname );

var src = gobble( 'src' );
var bundle = src.transform( 'browserify', {
	entries: [ './main' ],
	dest: 'bundle.js',
	debug: true
});
var min = bundle.transform( 'uglifyjs', {
	ext: '.min.js'
});

module.exports = gobble([ src, bundle, min ]).transform( renameMapFiles );
