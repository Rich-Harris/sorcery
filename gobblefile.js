var gobble = require( 'gobble' );

gobble.cwd( __dirname );

module.exports = gobble( 'src' )
	.transform( 'rollup-babel', {
		entry: 'index.js',
		dest: 'sorcery.js',
		format: 'cjs',
		external: [ 'path', 'sander', 'buffer-crc32' ],
		sourceMap: true
	});
