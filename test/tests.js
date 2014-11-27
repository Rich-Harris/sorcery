var path = require( 'path' ),
	assert = require( 'assert' ),
	SourceMapConsumer = require( 'source-map' ).SourceMapConsumer,
	sorcery = require( '../' );

process.chdir( __dirname );

describe( 'sorcery', function () {
	describe( 'chain.trace()', function () {
		it( 'follows a mapping back to its origin', function () {
			return sorcery.load( 'samples/1/helloworld.min.js' ).then( function ( chain ) {
				var actual, expected;

				actual = chain.trace( 1, 31 );

				expected = {
					source: path.resolve( 'samples/1/helloworld.coffee' ),
					line: 2,
					column: 8,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});
	});

	describe( 'chain.apply()', function () {
		it( 'creates a flattened sourcemap', function () {
			return sorcery.load( 'samples/1/helloworld.min.js' ).then( function ( chain ) {
				var map, smc;

				map = chain.apply({ includeContent: true });
				smc = new SourceMapConsumer( map );

				assert.equal( map.version, 3 );
				assert.deepEqual( map.file, 'helloworld.min.js' );
				assert.deepEqual( map.sources, [ 'helloworld.coffee' ]);
				assert.deepEqual( map.sourcesContent, [ 'answer = 40 + 2\nconsole.log "the answer is #{answer}"' ]);

				loc = smc.originalPositionFor({ line: 1, column: 31 });
				assert.equal( loc.source, 'helloworld.coffee' );
				assert.equal( loc.line, 2 );
				assert.equal( loc.column, 8 );
				assert.equal( loc.name, 'log' );
			});
		});
	});
});

describe( 'sorcery (sync)', function () {
	describe( 'chain.trace()', function () {
		it( 'follows a mapping back to its origin', function () {
			var chain, actual, expected;

			chain = sorcery.loadSync( 'samples/1/helloworld.min.js' );

			actual = chain.trace( 1, 31 );

			expected = {
				source: path.resolve( 'samples/1/helloworld.coffee' ),
				line: 2,
				column: 8,
				name: 'log'
			};

			assert.deepEqual( actual, expected );
		});
	});
});
