var path = require( 'path' ),
	sander = require( 'sander' ),
	SourceMap = require( './SourceMap' ),
	getRelativePath = require( './utils/getRelativePath' ),
	extractMap = require( './utils/extractMap' ),
	encodeMappings = require( './utils/encodeMappings' ),
	decodeMappings = require( './utils/decodeMappings' ),
	getSourceMappingUrl = require( './utils/getSourceMappingUrl' ),
	getMapFromUrl = require( './utils/getMapFromUrl' );

var Node = function ( file ) {
	this.file = path.resolve( file );
	this.sourcesContentByPath = {};
};

Node.prototype = {
	_load: function () {
		var self = this;

		return sander.readFile( this.file ).then( String ).then( function ( content ) {
			var url;

			self.content = content;
			self.lines = content.split( '\n' );

			url = getSourceMappingUrl( content );

			if ( !url ) {
				self.isOriginalSource = true;
				return self;
			} else {
				return getMapFromUrl( url, self.file ).then( function ( map ) {
					var promises;

					self.map = map;
					self.mappings = decodeMappings( map.mappings );

					self.sources = map.sources.map( function ( source ) {
						return new Node( resolveSourcePath( self, source ) );
					});

					promises = self.sources.map( function ( node ) {
						return node._load();
					});

					return sander.Promise.all( promises );
				}).then( function () {
					getSourcesContent( self );
					return self;
				});
			}
		});
	},

	_loadSync: function () {
		var self = this, url, map;

		this.content = sander.readFileSync( this.file ).toString();
		this.lines = this.content.split( '\n' );

		url = getSourceMappingUrl( this.content );

		if ( !url ) {
			self.isOriginalSource = true;
		} else {
			self.map = getMapFromUrl( url, this.file, true );
			self.mappings = decodeMappings( self.map.mappings );

			self.sources = self.map.sources.map( function ( source ) {
				return new Node( resolveSourcePath( self, source ) )._loadSync();
			});

			getSourcesContent( self );
		}

		return this;
	},

	apply: function ( options ) {
		var self = this,
			resolved,
			map,
			names = [],
			nameIndices = {},
			sources = [],
			sourceIndices = {},
			mappings,
			includeContent;

		options = options || {};
		includeContent = options.includeContent !== false;

		resolved = this.mappings.map( function ( line ) {
			var result = [];

			line.forEach( function ( segment ) {
				var source, traced, newSegment, sourceIndex, nameIndex;

				if ( segment.length === 1 ) {
					// TODO not sure what to do here...?
					resolved.push([ segment[0] ]);
					return;
				}

				source = self.sources[ segment[1] ];
				traced = source.trace( segment[2] + 1, segment[3], self.map.names[ segment[4] ] );

				if ( !traced ) {
					return;
				}

				sourceIndex = sources.indexOf( traced.source );
				if ( !~sourceIndex ) {
					sourceIndex = sources.length;
					sources.push( traced.source );
				}

				newSegment = [ segment[0], sourceIndex, traced.line - 1, traced.column ];

				if ( traced.name ) {
					nameIndex = names.indexOf( traced.name );
					if ( !~nameIndex ) {
						nameIndex = names.length;
						names.push( traced.name );
					}

					newSegment.push( nameIndex );
				}

				result.push( newSegment );
			});

			return result;
		});

		mappings = encodeMappings( resolved );

		return new SourceMap({
			file: this.file.split( '/' ).pop(),
			sources: sources.map( function ( source ) {
				return getRelativePath( self.file, source );
			}),
			sourcesContent: sources.map( function ( source ) {
				return options.includeContent ? self.sourcesContentByPath[ source ] : null;
			}),
			names: names,
			mappings: mappings
		});
	},

	trace: function ( lineIndex, columnIndex, name ) {
		var segments, line, segment, lastSegment, len, i, parent;

		// If this node doesn't have a source map, we treat it as
		// the original source
		if ( this.isOriginalSource ) {
			return {
				source: this.file,
				line: lineIndex,
				column: columnIndex,
				name: name
			};
		}

		// Otherwise, we need to figure out what this position in
		// the intermediate file corresponds to in *its* source
		segments = this.mappings[ lineIndex - 1 ];

		if ( !segments ) {
			return null;
		}

		if ( columnIndex === undefined ) {
			// we only have a line to go on. Use the first non-whitespace character
			line = this.lines[ lineIndex - 1 ];
			leadingWhitespace = /^\s+/.exec( line );

			columnIndex = leadingWhitespace ? leadingWhitespace[0].length : 0;
		}

		len = segments.length;

		for ( i = 0; i < len; i += 1 ) {
			segment = segments[i];

			if ( segment[0] === columnIndex ) {
				parent = this.sources[ segment[1] ];
				return parent.trace( segment[2] + 1, segment[3], this.map.names[ segment[4] ] || name );
			}

			if ( segment[0] > columnIndex ) {
				return null;
			}
		}
	}
};

module.exports = Node;

function resolveSourcePath ( node, source ) {
	// TODO handle sourceRoot
	return path.resolve( path.dirname( node.file ), source );
}

function getSourcesContent ( node ) {
	node.sources.forEach( function ( source ) {
		node.sourcesContentByPath[ source.file ] = source.content;

		Object.keys( source.sourcesContentByPath ).forEach( function ( file ) {
			node.sourcesContentByPath[ file ] = source.sourcesContentByPath[ file ];
		});
	});
}