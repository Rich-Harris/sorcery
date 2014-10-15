var sorcery = require( '../../' ),
	path = require( 'path' ),
	sander = require( 'sander' ),
	coffee = require( 'coffee-script' ),
	uglifyjs = require( 'uglify-js' ),

	origin,
	compiled,
	minified,
	final;

origin   = path.resolve( 'src/helloworld.coffee' );
compiled = path.resolve( 'tmp/helloworld.js' );
minified = path.resolve( 'tmp/helloworld.min.js' );
final    = path.resolve( 'dist/helloworld.min.js' );

compileCoffeeScript()
	.then( minifyJavaScript )
	.then( resolveSourceMapChain )
	.catch( function ( err ) {
		setTimeout( function () {
			throw err;
		});
	});

function compileCoffeeScript () {
	return sander.readFile( origin ).then( String ).then( function ( code ) {
		var result, srcmap;

		result = coffee.compile( code, {
			filename: 'helloworld.js',
			sourceMap: true
		});

		srcmap = JSON.parse( result.v3SourceMap );

		srcmap.sources = [ '../src/helloworld.coffee' ];
		result.js += '\n//#sourceMappingURL=helloworld.js.map';

		return sander.Promise.all([
			sander.writeFile( compiled, result.js ),
			sander.writeFile( compiled + '.map', JSON.stringify( srcmap ) )
		]);
	});
}

function minifyJavaScript () {
	return sander.readFile( 'tmp/helloworld.js' ).then( String ).then( function ( code ) {
		var result, srcmap;

		result = uglifyjs.minify([ compiled ], {
			outSourceMap: 'helloworld.min.js.map'
		});

		return sander.Promise.all([
			sander.writeFile( minified, result.code ),
			sander.writeFile( minified + '.map', result.map )
		]);
	});
}

function resolveSourceMapChain () {
	return sorcery.resolve( minified ).then( function ( map ) {
		return sander.readFile( minified ).then( String ).then( function ( code ) {
			// replace sourceMappingURL
			code = code.replace( minified, final );

			return sander.Promise.all([
				sander.writeFile( final, code ),
				sander.writeFile( final + '.map', map ),
				sander.copyFile( 'src/index.html' ).to( 'dist/index.html' )
			]);
		});
	});
}