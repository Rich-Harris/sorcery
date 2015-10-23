var gobble = require( 'gobble' );

gobble.cwd( __dirname );

module.exports = gobble([
	// CommonJS build
	gobble( 'src' ).transform( 'rollup-babel', {
		entry: 'index.js',
		dest: 'sorcery.cjs.js',
		format: 'cjs',
		external: [ 'path', 'sander', 'buffer-crc32' ],
		sourceMap: true
	}),

	// ES6 build
	gobble( 'src' ).transform( 'rollup-babel', {
		entry: 'index.js',
		dest: 'sorcery.es6.js',
		format: 'es6',
		external: [ 'path', 'sander', 'buffer-crc32' ],
		sourceMap: true
	})
]);
