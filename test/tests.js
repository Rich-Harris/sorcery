var path = require( 'path' );
var sander = require( 'sander' );
var assert = require( 'assert' );
var promiseMapSeries = require( 'promise-map-series' );
var SourceMapConsumer = require( 'source-map' ).SourceMapConsumer;

process.chdir( __dirname );

describe( 'sorcery', function () {
	var sorcery;

	this.timeout( 20000 );

	before( function () {
		function buildLib () {
			return require( '../gobblefile' ).build({
				dest: path.resolve( __dirname, '../.tmp' ),
				force: true
			}).then( function () {
				sorcery = require( '../.tmp/sorcery' );
			});
		}

		function buildSamples () {
			return sander.readdir( 'samples' ).then( function ( samples ) {
				var filtered = samples.filter( function ( dir ) {
					return /^\d+$/.test( dir );
				});

				return promiseMapSeries( filtered, function ( dir ) {
					var buildDefinitionPath = path.resolve( 'samples', dir, 'gobblefile.js' );

					return require( buildDefinitionPath ).build({
						dest: path.resolve( '.tmp/samples', dir ),
						gobbledir: path.resolve( '.gobble-build', dir ),
						force: true
					});
				});
			});
		}

		return buildLib().then( buildSamples );
	});

	beforeEach( function () {
		return sander.rimraf( 'tmp' );
	});

	afterEach( function () {
		return sander.rimraf( 'tmp' );
	});

	describe( 'sorcery.load()', function () {
		it( 'resolves to null if target has no sourcemap', function () {
			return sorcery.load( '.tmp/samples/1/helloworld.coffee', function ( chain ) {
				assert.equal( chain, null );
			});
		});
	});

	describe( 'chain.trace()', function () {
		it( 'follows a mapping back to its origin', function () {
			return sorcery.load( '.tmp/samples/1/helloworld.min.js' ).then( function ( chain ) {
				var actual, expected;

				actual = chain.trace( 1, 31 );

				expected = {
					source: path.resolve( 'samples/1/src/helloworld.coffee' ),
					line: 2,
					column: 8,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'handles browserify-style line mappings', function () {
			return sorcery.load( '.tmp/samples/2/bundle.min.js' ).then( function ( chain ) {
				var actual, expected;

				actual = chain.trace( 1, 531 );

				expected = {
					source: path.resolve( 'samples/2/src/a.js' ),
					line: 2,
					column: 0,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'uses inline sources if provided', function () {
			return sorcery.load( '.tmp/samples/3/app.js' ).then( function ( chain ) {
				var actual, expected;

				actual = chain.trace( 4, 8 );

				expected = {
					source: path.resolve( 'samples/3/src/app.js' ),
					line: 2,
					column: 8,
					name: null
				};

				assert.deepEqual( actual, expected );
			});
		});
	});

	describe( 'chain.apply()', function () {
		it( 'creates a flattened sourcemap', function () {
			return sorcery.load( '.tmp/samples/1/helloworld.min.js' ).then( function ( chain ) {
				var map, smc;

				map = chain.apply();
				smc = new SourceMapConsumer( map );

				assert.equal( map.version, 3 );
				assert.deepEqual( map.file, 'helloworld.min.js' );
				assert.deepEqual( map.sources, [ '../../../samples/1/src/helloworld.coffee' ]);
				assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/1/src/helloworld.coffee' ).toString() ]);

				var loc = smc.originalPositionFor({ line: 1, column: 31 });
				assert.equal( loc.source, '../../../samples/1/src/helloworld.coffee' );
				assert.equal( loc.line, 2 );
				assert.equal( loc.column, 8 );
				assert.equal( loc.name, 'log' );
			});
		});

		it( 'handles sourceMappingURLs with spaces (#6)', function () {
			return sorcery.load( '.tmp/samples/4/file with spaces.js' ).then( function ( chain ) {
				var map, smc;

				map = chain.apply();
				smc = new SourceMapConsumer( map );

				assert.equal( map.version, 3 );
				assert.deepEqual( map.file, 'file with spaces.js' );
				assert.deepEqual( map.sources, [ '../../../samples/4/src/file with spaces.js' ]);
				assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/4/src/file with spaces.js' ).toString() ]);

				var loc = smc.originalPositionFor({ line: 4, column: 8 });
				assert.equal( loc.source, '../../../samples/4/src/file with spaces.js' );
				assert.equal( loc.line, 2 );
				assert.equal( loc.column, 8 );
				assert.equal( loc.name, null );
			});
		});
	});

	describe( 'chain.write()', function () {
		it( 'writes a file and accompanying sourcemap', function () {
			return sorcery.load( '.tmp/samples/1/helloworld.min.js' ).then( function ( chain ) {
				return chain.write( '.tmp/write-file/helloworld.min.js' ).then( function () {
					return sorcery.load( '.tmp/write-file/helloworld.min.js' ).then( function ( chain ) {
						var map, smc;

						map = chain.apply();
						smc = new SourceMapConsumer( map );

						assert.equal( map.version, 3 );
						assert.deepEqual( map.file, 'helloworld.min.js' );
						assert.deepEqual( map.sources, [ '../../samples/1/src/helloworld.coffee' ]);
						assert.deepEqual( map.sourcesContent, [ sander.readFileSync( __dirname, 'samples/1/src/helloworld.coffee' ).toString() ]);

						var loc = smc.originalPositionFor({ line: 1, column: 31 });
						assert.equal( loc.source, '../../samples/1/src/helloworld.coffee' );
						assert.equal( loc.line, 2 );
						assert.equal( loc.column, 8 );
						assert.equal( loc.name, 'log' );
					});
				});
			});
		});

		it( 'overwrites existing file', function () {
			return sander.copydir( '.tmp/samples/1' ).to( '.tmp/overwrite-file' ).then( function () {
				return sorcery.load( '.tmp/overwrite-file/helloworld.min.js' ).then( function ( chain ) {
					return chain.write().then( function () {
						return sander.readFile( '.tmp/overwrite-file/helloworld.min.js.map' ).then( String ).then( JSON.parse ).then( function ( map ) {
							var smc = new SourceMapConsumer( map );

							assert.equal( map.version, 3 );
							assert.deepEqual( map.file, 'helloworld.min.js' );
							assert.deepEqual( map.sources, [ '../../samples/1/src/helloworld.coffee' ]);
							assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/1/src/helloworld.coffee' ).toString() ]);

							var loc = smc.originalPositionFor({ line: 1, column: 31 });
							assert.equal( loc.source, '../../samples/1/src/helloworld.coffee' );
							assert.equal( loc.line, 2 );
							assert.equal( loc.column, 8 );
							assert.equal( loc.name, 'log' );
						});
					});
				});
			});
		});

		it( 'allows sourceMappingURL to be an absolute path', function () {
			return sorcery.load( '.tmp/samples/1/helloworld.min.js' ).then( function ( chain ) {
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

		it( 'adds a trailing newline after sourceMappingURL comment (#4)', function () {
			return sorcery.load( '.tmp/samples/1/helloworld.min.js' ).then( function ( chain ) {
				return chain.write( '.tmp/write-file/helloworld.min.js' ).then( function () {
					return sander.readFile( '.tmp/write-file/helloworld.min.js' ).then( String ).then( function ( file ) {
						var lines = file.split( '\n' );

						// sourceMappingURL comment should be on penultimate line
						assert.ok( /sourceMappingURL/.test( lines[ lines.length - 2 ] ) );

						// last line should be empty
						assert.equal( lines[ lines.length - 1 ], '' );
					});
				});
			});
		});

		it( 'ensures sourceMappingURL is encoded (#6)', function () {
			return sorcery.load( '.tmp/samples/4/file with spaces.js' ).then( function ( chain ) {
				chain.write( '.tmp/with-spaces/file with spaces.js' ).then( function () {
					return sander.readFile( '.tmp/with-spaces/file with spaces.js' )
						.then( String )
						.then( function ( result ) {
							var sourceMappingURL = /sourceMappingURL=([^\r\n]+)/.exec( result )[0];
							assert.equal( sourceMappingURL, 'file%20with%20spaces.js.map' );
						});
				});
			});
		});
	});

	describe( 'sorcery (sync)', function () {
		describe( 'chain.trace()', function () {
			it( 'follows a mapping back to its origin', function () {
				var chain, actual, expected;

				chain = sorcery.loadSync( '.tmp/samples/1/helloworld.min.js' );

				actual = chain.trace( 1, 31 );

				expected = {
					source: path.resolve( 'samples/1/src/helloworld.coffee' ),
					line: 2,
					column: 8,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});
	});
});
