var gobble = require( 'gobble' );

gobble.cwd( __dirname );

module.exports = gobble( 'src' )
	.transform( 'babel', {
		whitelist: [
			'es6.arrowFunctions',
			'es6.blockScoping',
			'es6.constants',
			'es6.destructuring',
			'es6.parameters.default',
			'es6.parameters.rest',
			'es6.properties.shorthand',
			'es6.templateLiterals',
			'es6.classes'
		],
		loose: [ 'es6.classes' ],
		sourceMap: true
	})
	.transform( 'rollup', {
		entry: 'index',
		dest: 'sorcery',
		format: 'cjs'
	});
