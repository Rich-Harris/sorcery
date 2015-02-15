var gobble = require( 'gobble' );

gobble.cwd( __dirname );

var src = gobble( 'src' );
var js = src.transform( 'coffee' );
var min = js.transform( 'uglifyjs', {
	ext: '.min.js'
});

module.exports = gobble([ src, js, min ]);
