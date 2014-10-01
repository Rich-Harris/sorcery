var sander = require( 'sander' ),
	extractMap = require( './extractMap' ),
	encodeMappings = require( './encodeMappings' ),
	decodeMappings = require( './decodeMappings' );

var Node = function ( file ) {
	this.file = file;
};

Node.prototype = {
	getContent: function () {
		var self = this;

		return sander.readFile( this.file ).then( String ).then( function ( str ) {
			// store for later use
			return ( self.content = str );
		});
	},

	init: function () {
		var self = this;

		return this.getContent().then( function () {
			return extractMap( self );
		}).then( function ( map ) {
			var promises;

			self.map = map;
			self.mappings = decodeMappings( map.mappings );

			self.sources = map.sources.map( function ( source ) {
				return new Node( resolveSourcePath( self, source ) );
			});

			promises = self.sources.map( function ( node ) {
				return node.init();
			});

			return sander.Promise.all( promises );
		}, function ( err ) {
			if ( err.code === 'SOURCEMAP_COMMENT_NOTFOUND' ) {
				self.isOriginalSource = true;
			} else {
				throw err;
			}
		});
	},

	build: function () {
		var self = this,
			resolved,
			map,
			names = [],
			nameIndices = {},
			sources = [],
			sourceIndices = {},
			mappings;

		resolved = this.mappings.map( function ( line, i ) {
			var resolved = [];

			line.forEach( function ( segment ) {
				var result, parent, mapping, nameIndex, sourceIndex;

				if ( !segment.length ) {
					result = {};
				}

				if ( segment.length === 1 ) {
					// TODO not sure what to do here...?
					resolved.push({ generatedColumn: segment[0] });
				}

				parent = self.sources[ segment[1] ];

				mapping = parent.trace( segment[2], segment[3], self.map.names[ segment[4] ] );

				if ( mapping === null ) {
					return;
				}

				// Store name references
				if ( mapping.name && !~names.indexOf( mapping.name ) ) {
					nameIndex = names.length;
					nameIndices[ mapping.name ] = nameIndex;
					names.push( mapping.name );
				}

				// Store source references
				if ( !~sources.indexOf( mapping.source ) ) {
					sourceIndex = sources.length;
					sourceIndices[ mapping.source ] = sourceIndex;
					sources.push( mapping.source );
				}

				result = [
					segment[0],
					sources.indexOf( mapping.source ),
					mapping.sourceLine,
					mapping.sourceColumn
				];

				if ( mapping.name ) {
					result.push( names.indexOf( mapping.name ) );
				}

				resolved.push( result );
			});

			return resolved;
		});

		mappings = encodeMappings( resolved );

		map = {
			version: 3,
			file: this.file,
			sources: sources.map( function ( source ) { return source.file; }),
			sourcesContent: sources.map( function ( source ) { return source.content; }),
			names: names,
			mappings: mappings,
			toString: function () {
				return JSON.stringify( this );
			}
		};

		return map;
	},

	trace: function ( lineIndex, columnIndex, name ) {
		var segments, segment, lastSegment, len, i, parent;

		// If this node doesn't have a source map, we treat it as
		// the original source
		if ( this.isOriginalSource ) {
			return {
				source: this,
				sourceLine: lineIndex,
				sourceColumn: columnIndex,
				name: name
			};
		}

		// Otherwise, we need to figure out what this position in
		// the intermediate file corresponds to in *its* source
		segments = this.mappings[ lineIndex ];

		if ( !segments ) {
			return null;
		}

		len = segments.length;

		for ( i = 0; i < len; i += 1 ) {
			segment = segments[i];

			if ( segment[0] === columnIndex ) {
				parent = this.sources[ segment[1] ];
				return parent.trace( segment[2], segment[3], this.map.names[ segment[4] ] || name );
			}

			if ( segment[0] > columnIndex ) {
				return null;
			}
		}
	}
};

module.exports = Node;

function resolveSourcePath ( node, source ) {
	var path = require( 'path' );

	// TODO handle sourceRoot
	return path.resolve( path.dirname( node.file ), source );
}