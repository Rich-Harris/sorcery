var path = require( 'path' ),
	sander = require( 'sander' ),
	assert = require( 'assert' ),
	SourceMapConsumer = require( 'source-map' ).SourceMapConsumer;

process.chdir( __dirname );

describe( 'sorcery', function () {
	var sorcery;

	before( function () {
		return require( '../gobblefile' ).build({
			dest: path.resolve( __dirname, '../.tmp' ),
			force: true
		}).then( function () {
			sorcery = require( '../.tmp/sorcery' );
		});
	});

	beforeEach( function () {
		return sander.rimraf( 'tmp' );
	});

	afterEach( function () {
		return sander.rimraf( 'tmp' );
	});

	describe( 'sorcery.load()', function () {
		it( 'resolves to null if target has no sourcemap', function () {
			return sorcery.load( 'samples/1/helloworld.coffee', function ( chain ) {
				assert.equal( chain, null );
			});
		});
	});

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

		it( 'handles browserify-style line mappings', function () {
			return sorcery.load( 'samples/2/bundle.min.js' ).then( function ( chain ) {
				var actual, expected;

				actual = chain.trace( 1, 451 );

				expected = {
					source: path.resolve( 'samples/2/a.js' ),
					line: 2,
					column: 0,
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

				map = chain.apply();
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

	describe( 'chain.write()', function () {
		it( 'writes a file and accompanying sourcemap', function () {
			return sorcery.load( 'samples/1/helloworld.min.js' ).then( function ( chain ) {
				return chain.write( 'tmp/helloworld.min.js' ).then( function () {
					return sorcery.load( 'tmp/helloworld.min.js' ).then( function ( chain ) {
						var map, smc;

						map = chain.apply();
						smc = new SourceMapConsumer( map );

						assert.equal( map.version, 3 );
						assert.deepEqual( map.file, 'helloworld.min.js' );
						assert.deepEqual( map.sources, [ '../samples/1/helloworld.coffee' ]);
						assert.deepEqual( map.sourcesContent, [ 'answer = 40 + 2\nconsole.log "the answer is #{answer}"' ]);

						loc = smc.originalPositionFor({ line: 1, column: 31 });
						assert.equal( loc.source, '../samples/1/helloworld.coffee' );
						assert.equal( loc.line, 2 );
						assert.equal( loc.column, 8 );
						assert.equal( loc.name, 'log' );
					});
				});
			});
		});

		it( 'overwrites existing file', function () {
			return sander.copydir( 'samples/1' ).to( 'tmp' ).then( function () {
				return sorcery.load( 'tmp/helloworld.min.js' ).then( function ( chain ) {
					return chain.write().then( function () {
						return sander.readFile( 'tmp/helloworld.min.js.map' ).then( String ).then( JSON.parse ).then( function ( map ) {
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
		});

		it( 'allows sourceMappingURL to be an absolute path', function () {
			return sorcery.load( 'samples/1/helloworld.min.js' ).then( function ( chain ) {
				return chain.write( 'tmp/helloworld.min.js', {
					absolutePath: true
				}).then( function () {
					return sander.readFile( 'tmp/helloworld.min.js' ).then( String ).then( function ( generated ) {
						var mappingURL = /sourceMappingURL=([^\s]+)/.exec( generated )[1];
						assert.equal( mappingURL, path.resolve( 'tmp/helloworld.min.js.map' ) );
					});
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
});
