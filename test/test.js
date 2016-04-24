require( 'source-map-support' ).install();

const path = require( 'path' );
const sander = require( 'sander' );
const assert = require( 'assert' );
const glob = require( 'glob' );
const child_process = require( 'child_process' );
const { describe, it, beforeEach, afterEach } = require( 'mocha' );
const SourceMapConsumer = require( 'source-map' ).SourceMapConsumer;
const sorcery = require( '../' );

process.chdir( __dirname );

describe( 'sorcery', function () {
	this.timeout( 20000 );

	beforeEach( () => sander.rimraf( '.tmp' ) );
	afterEach( () => sander.rimraf( '.tmp' ) );

	describe( 'sorcery.load()', () => {
		it( 'resolves to null if target has no sourcemap', () => {
			return sorcery.load( 'samples/1/src/helloworld.coffee' ).then( chain => {
				assert.equal( chain, null );
			});
		});

		it( 'allows user to specify content/sourcemaps', () => {
			return sorcery.load( 'example.js', {
				content: {
					'example.js': `(function() {
  var answer;

  answer = 40 + 2;

  console.log("the answer is " + answer);

}).call(this);`,
					'example.coffee': `answer = 40 + 2
console.log "the answer is #{answer}"`
				},
				sourcemaps: {
					'example.js': {
						version: 3,
						sources:[ 'example.coffee' ],
						sourcesContent: [ null ],
						names: [],
						mappings: 'AAAA;AAAA,MAAA,MAAA;;AAAA,EAAA,MAAA,GAAS,EAAA,GAAK,CAAd,CAAA;;AAAA,EACA,OAAO,CAAC,GAAR,CAAa,gBAAA,GAAe,MAA5B,CADA,CAAA;AAAA'
					}
				}
			}).then( chain => {
				const actual = chain.trace( 6, 10 );

				const expected = {
					source: path.resolve( 'example.coffee' ),
					line: 2,
					column: 8,
					name: null
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'handles URLs that look a bit like data URIs', () => {
			return sorcery.load( 'samples/8/datafile.js' ).then( chain => {
				const actual = chain.trace( 1, 0 );

				const expected = {
					source: path.resolve( 'samples/8/source.js' ),
					line: 1,
					column: 0,
					name: null
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'handles segments of length 1', () => {
			return sorcery.load( 'samples/8/datafile.js' ).then( chain => {
				// this will throw if 1-length segments are rejected
				chain.apply();
			});
		});
	});

	describe( 'chain.trace()', () => {
		it( 'follows a mapping back to its origin', () => {
			return sorcery.load( 'samples/1/tmp/helloworld.min.js' ).then( chain => {
				const actual = chain.trace( 1, 31 );

				const expected = {
					source: path.resolve( 'samples/1/tmp/helloworld.coffee' ),
					line: 2,
					column: 8,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'handles browserify-style line mappings', () => {
			return sorcery.load( 'samples/2/tmp/bundle.min.js' ).then( chain => {
				const actual = chain.trace( 1, 487 );

				const expected = {
					source: path.resolve( 'samples/2/tmp/a.js' ),
					line: 2,
					column: 0,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'uses inline sources if provided', () => {
			return sorcery.load( 'samples/3/tmp/app.esperanto.js' ).then( chain => {
				const actual = chain.trace( 4, 8 );

				assert.strictEqual( actual.line, 2 );
				assert.strictEqual( actual.column, 8 );
				assert.strictEqual( actual.name, null );
				assert.ok( /app\.js$/.test( actual.source ) );
			});
		});

		it( 'handles CSS sourcemap comments', () => {
			return sorcery.load( 'samples/5/tmp/styles.css' ).then( chain => {
				const actual = chain.trace( 1, 8 );

				const expected = {
					source: path.resolve( 'samples/5/tmp/styles.less' ),
					line: 5,
					column: 2,
					name: null
				};

				assert.deepEqual( actual, expected );
			});
		});

		it( 'resolves source paths using sourceRoot where applicable', () => {
			return sorcery.load( 'samples/7/foo.js' ).then( chain => {
				const actual = chain.trace( 1, 0 );

				const expected = {
					source: path.resolve( 'samples/7/sources/baz.js' ),
					line: 1,
					column: 0,
					name: null
				};

				assert.deepEqual( actual, expected );
			});
		});
	});

	describe( 'chain.apply()', () => {
		it( 'creates a flattened sourcemap', () => {
			return sorcery.load( 'samples/1/tmp/helloworld.min.js' ).then( chain => {
				const map = chain.apply();
				const smc = new SourceMapConsumer( map );

				assert.equal( map.version, 3 );
				assert.deepEqual( map.file, 'helloworld.min.js' );
				assert.deepEqual( map.sources, [ 'helloworld.coffee' ]);
				assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/1/src/helloworld.coffee' ).toString() ]);

				const loc = smc.originalPositionFor({ line: 1, column: 31 });
				assert.equal( loc.source, 'helloworld.coffee' );
				assert.equal( loc.line, 2 );
				assert.equal( loc.column, 8 );
				assert.equal( loc.name, 'log' );
			});
		});

		it( 'handles sourceMappingURLs with spaces (#6)', () => {
			return sorcery.load( 'samples/4/tmp/file with spaces.esperanto.js' ).then( chain => {
				const map = chain.apply();
				const smc = new SourceMapConsumer( map );

				assert.equal( map.version, 3 );
				assert.deepEqual( map.file, 'file with spaces.esperanto.js' );
				assert.deepEqual( map.sources, [ 'file with spaces.js' ]);
				assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/4/src/file with spaces.js' ).toString() ]);

				const loc = smc.originalPositionFor({ line: 4, column: 8 });
				assert.equal( loc.source, 'file with spaces.js' );
				assert.equal( loc.line, 2 );
				assert.equal( loc.column, 8 );
				assert.equal( loc.name, null );
			});
		});
	});

	describe( 'chain.write()', () => {
		it( 'writes a file and accompanying sourcemap', () => {
			return sorcery.load( 'samples/1/tmp/helloworld.min.js' ).then( chain => {
				return chain.write( '.tmp/write-file/helloworld.min.js' ).then( () => {
					return sorcery.load( '.tmp/write-file/helloworld.min.js' ).then( chain => {
						const map = chain.apply();
						const smc = new SourceMapConsumer( map );

						assert.equal( map.version, 3 );
						assert.deepEqual( map.file, 'helloworld.min.js' );
						assert.deepEqual( map.sources, [ '../../samples/1/tmp/helloworld.coffee' ]);
						assert.deepEqual( map.sourcesContent, [ sander.readFileSync( __dirname, 'samples/1/tmp/helloworld.coffee' ).toString() ]);

						const loc = smc.originalPositionFor({ line: 1, column: 31 });
						assert.equal( loc.source, '../../samples/1/tmp/helloworld.coffee' );
						assert.equal( loc.line, 2 );
						assert.equal( loc.column, 8 );
						assert.equal( loc.name, 'log' );
					});
				});
			});
		});

		it( 'overwrites existing file', () => {
			return sander.copydir( 'samples/1/tmp' ).to( '.tmp/overwrite-file' ).then( () => {
				return sorcery.load( '.tmp/overwrite-file/helloworld.min.js' ).then( chain => {
					return chain.write().then( () => {
						return sander.readFile( '.tmp/overwrite-file/helloworld.min.js.map' ).then( String ).then( JSON.parse ).then( map => {
							const smc = new SourceMapConsumer( map );

							assert.equal( map.version, 3 );
							assert.deepEqual( map.file, 'helloworld.min.js' );
							assert.deepEqual( map.sources, [ 'helloworld.coffee' ]);
							assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/1/src/helloworld.coffee' ).toString() ]);

							const loc = smc.originalPositionFor({ line: 1, column: 31 });
							assert.equal( loc.source, 'helloworld.coffee' );
							assert.equal( loc.line, 2 );
							assert.equal( loc.column, 8 );
							assert.equal( loc.name, 'log' );
						});
					});
				});
			});
		});

		it( 'allows sourceMappingURL to be an absolute path', () => {
			return sorcery.load( 'samples/1/tmp/helloworld.min.js' ).then( chain => {
				return chain.write( '.tmp/helloworld.min.js', {
					absolutePath: true
				}).then( () => {
					return sander.readFile( '.tmp/helloworld.min.js' ).then( String ).then( generated => {
						const mappingURL = /sourceMappingURL=([^\s]+)/.exec( generated )[1];
						assert.equal( mappingURL, encodeURI( path.resolve( '.tmp/helloworld.min.js.map' ) ) );
					});
				});
			});
		});

		it( 'adds a trailing newline after sourceMappingURL comment (#4)', () => {
			return sorcery.load( 'samples/1/tmp/helloworld.min.js' ).then( chain => {
				return chain.write( '.tmp/write-file/helloworld.min.js' ).then( () => {
					return sander.readFile( '.tmp/write-file/helloworld.min.js' ).then( String ).then( file => {
						const lines = file.split( '\n' );

						// sourceMappingURL comment should be on penultimate line
						assert.ok( /sourceMappingURL/.test( lines[ lines.length - 2 ] ) );

						// last line should be empty
						assert.equal( lines[ lines.length - 1 ], '' );
					});
				});
			});
		});

		it( 'ensures sourceMappingURL is encoded (#6)', () => {
			return sorcery.load( 'samples/4/tmp/file with spaces.esperanto.js' ).then( chain => {
				chain.write( '.tmp/with-spaces/file with spaces.js' ).then( () => {
					return sander.readFile( '.tmp/with-spaces/file with spaces.js' )
						.then( String )
						.then( result => {
							const sourceMappingURL = /sourceMappingURL=([^\r\n]+)/.exec( result )[0];
							assert.equal( sourceMappingURL, 'file%20with%20spaces.js.map' );
						});
				});
			});
		});

		it( 'allows the base to be specified as something other than the destination file', () => {
			return sorcery.load( 'samples/1/tmp/helloworld.min.js' ).then( chain => {
				return chain.write( '.tmp/write-file/helloworld.min.js', {
					base: 'x/y/z'
				}).then( () => {
					return sander.readFile( '.tmp/write-file/helloworld.min.js.map' )
						.then( String )
						.then( JSON.parse )
						.then( map => {
							assert.deepEqual( map.sources, [ '../../../samples/1/tmp/helloworld.coffee' ] );
						});
				});
			});
		});

		it( 'writes a block comment to CSS files', () => {
			return sorcery.load( 'samples/5/tmp/styles.css' ).then( chain => {
				return chain.write( '.tmp/write-file/styles.css' ).then( () => {
					return sander.readFile( '.tmp/write-file/styles.css' )
						.then( String )
						.then( css => {
							assert.ok( ~css.indexOf( '/*# sourceMappingURL=styles.css.map */' ) );
						});
				});
			});
		});

		it( 'decodes/encodes URIs', () => {
			return sorcery.load( 'samples/6/file with spaces.js' ).then( chain => {
				return chain.write( '.tmp/write-file/file with spaces.js' ).then( () => {
					return sander.readFile( '.tmp/write-file/file with spaces.js' )
						.then( String )
						.then( js => {
							assert.ok( ~js.indexOf( '//# sourceMappingURL=file%20with%20spaces.js.map' ) );
						});
				});
			});
		});
	});

	describe( 'sorcery (sync)', () => {
		describe( 'chain.trace()', () => {
			it( 'follows a mapping back to its origin', () => {
				const chain = sorcery.loadSync( 'samples/1/tmp/helloworld.min.js' );

				const actual = chain.trace( 1, 31 );

				const expected = {
					source: path.resolve( 'samples/1/tmp/helloworld.coffee' ),
					line: 2,
					column: 8,
					name: 'log'
				};

				assert.deepEqual( actual, expected );
			});
		});

		describe( 'chain.apply()', () => {
			it( 'includes sourcesContent', () => {
				const chain = sorcery.loadSync( 'samples/1/tmp/helloworld.min.js' );

				const map = chain.apply();
				const smc = new SourceMapConsumer( map );

				assert.equal( map.version, 3 );
				assert.deepEqual( map.file, 'helloworld.min.js' );
				assert.deepEqual( map.sources, [ 'helloworld.coffee' ]);
				assert.deepEqual( map.sourcesContent, [ sander.readFileSync( 'samples/1/src/helloworld.coffee' ).toString() ]);

				const loc = smc.originalPositionFor({ line: 1, column: 31 });
				assert.equal( loc.source, 'helloworld.coffee' );
				assert.equal( loc.line, 2 );
				assert.equal( loc.column, 8 );
				assert.equal( loc.name, 'log' );
			});

			it( 'includes user-specified content', () => {
				const javascript = `(function() {
var answer;

answer = 40 + 2;

console.log("the answer is " + answer);

}).call(this);`;

				const coffeescript = `answer = 40 + 2
console.log "the answer is #{answer}"`;

				const chain = sorcery.loadSync( 'example.js', {
					content: {
						'example.js': javascript,
						'example.coffee': coffeescript
					},
					sourcemaps: {
						'example.js': {
							version: 3,
							sources:[ 'example.coffee' ],
							sourcesContent: [ null ],
							names: [],
							mappings: 'AAAA;AAAA,MAAA,MAAA;;AAAA,EAAA,MAAA,GAAS,EAAA,GAAK,CAAd,CAAA;;AAAA,EACA,OAAO,CAAC,GAAR,CAAa,gBAAA,GAAe,MAA5B,CADA,CAAA;AAAA'
						}
					}
				});

				const map = chain.apply();

				assert.deepEqual( map.sourcesContent, [ coffeescript ] );
			});
		});

		describe( 'chain.writeSync()', () => {
			it( 'writes a file and accompanying sourcemap', () => {
				const chain = sorcery.loadSync( 'samples/1/tmp/helloworld.min.js' );

				chain.writeSync( '.tmp/write-file/helloworld.min.js' );

				return sorcery.load( '.tmp/write-file/helloworld.min.js' ).then( chain => {
					const map = chain.apply();
					const smc = new SourceMapConsumer( map );

					assert.equal( map.version, 3 );
					assert.deepEqual( map.file, 'helloworld.min.js' );
					assert.deepEqual( map.sources, [ '../../samples/1/tmp/helloworld.coffee' ]);
					assert.deepEqual( map.sourcesContent, [ sander.readFileSync( __dirname, 'samples/1/tmp/helloworld.coffee' ).toString() ]);

					const loc = smc.originalPositionFor({ line: 1, column: 31 });
					assert.equal( loc.source, '../../samples/1/tmp/helloworld.coffee' );
					assert.equal( loc.line, 2 );
					assert.equal( loc.column, 8 );
					assert.equal( loc.name, 'log' );
				});
			});
		});
	});

	describe( 'cli', () => {
		sander.readdirSync( 'cli' ).forEach( dir => {
			if ( dir[0] === '.' ) return;

			( /^solo-/.test( dir ) ? it.only : it )( dir, done => {
				dir = path.resolve( 'cli', dir );
				sander.rimrafSync( dir, 'actual' );
				sander.mkdirSync( dir, 'actual' );

				if ( sander.existsSync( dir, 'pre.js' ) ) {
					require( path.join( dir, 'pre.js' ) )();
				}

				var command = sander.readFileSync( dir, 'command.sh', { encoding: 'utf-8' })
					.replace( 'sorcery', 'node ' + path.resolve( __dirname, '../bin/sorcery' ) );

				child_process.exec( command, {
					cwd: dir
				}, ( err, stdout, stderr ) => {
					if ( err ) return done( err );

					if ( stdout ) console.log( stdout );
					if ( stderr ) console.error( stderr );

					if ( sander.existsSync( dir, 'post.js' ) ) {
						require( path.join( dir, 'post.js' ) )();
					}

					function catalogue ( subdir ) {
						subdir = path.resolve( dir, subdir );

						return glob.sync( '**/*.js?(.map)', { cwd: subdir })
							.sort()
							.map( name => {
								var contents = sander.readFileSync( subdir, name, { encoding: 'utf-8' }).trim();

								if ( path.extname( name ) === '.map' ) {
									contents = JSON.parse( contents );
								}

								return {
									name: name,
									contents: contents
								};
							});
					}

					var expected = catalogue( 'expected' );
					var actual = catalogue( 'actual' );

					try {
						assert.deepEqual( actual, expected );
						done();
					} catch ( err ) {
						done( err );
					}
				});
			});
		});
	});
});
