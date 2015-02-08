import path from 'path';
import sander from 'sander';
import SourceMap from './SourceMap';
import getRelativePath from './utils/getRelativePath';
import encodeMappings from './utils/encodeMappings';
import decodeMappings from './utils/decodeMappings';
import getSourceMappingUrl from './utils/getSourceMappingUrl';
import getMapFromUrl from './utils/getMapFromUrl';

var Node = function ( file, content ) {
	this.file = path.resolve( file );
	this.content = content;

	this.sourcesContentByPath = {};
};

Node.prototype = {
	_load: function () {
		var self = this;

		function getContent () {
			if ( !self.content ) {
				return sander.readFile( self.file ).then( String );
			}

			return sander.Promise.resolve( self.content );
		}

		return getContent().then( function ( content ) {
			var url;

			self.content = content;
			self.lines = content.split( '\n' );

			url = getSourceMappingUrl( content );

			if ( !url ) {
				self.isOriginalSource = true;
				return self;
			} else {
				return getMapFromUrl( url, self.file ).then( function ( map ) {
					var promises, sourcesContent;

					self.map = map;
					self.mappings = decodeMappings( map.mappings );
					sourcesContent = map.sourcesContent || [];

					self.sources = map.sources.map( function ( source, i ) {
						return new Node( resolveSourcePath( self, source ), sourcesContent[i] );
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
		}).then( function () {
			if ( !self.isOriginalSource ) {
				return self;
			}

			return null;
		});
	},

	_loadSync: function () {
		var self = this, url, map, sourcesContent;

		if ( !this.content ) {
			this.content = sander.readFileSync( this.file ).toString();
		}

		this.lines = this.content.split( '\n' );

		url = getSourceMappingUrl( this.content );

		if ( !url ) {
			self.isOriginalSource = true;
		} else {
			self.map = map = getMapFromUrl( url, this.file, true );
			self.mappings = decodeMappings( map.mappings );
			sourcesContent = map.sourcesContent || [];

			self.sources = map.sources.map( function ( source, i) {
				var node = new Node( resolveSourcePath( self, source ), sourcesContent[i] );
				node._loadSync();

				return node;
			});

			getSourcesContent( self );
		}

		return !this.isOriginalSource ? this : null;
	},

	apply: function ( options ) {
		var self = this,
			resolved,
			names = [],
			sources = [],
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
				return getRelativePath( options.base || self.file, source );
			}),
			sourcesContent: sources.map( function ( source ) {
				return includeContent ? self.sourcesContentByPath[ source ] : null;
			}),
			names: names,
			mappings: mappings
		});
	},

	trace: function ( oneBasedLineIndex, zeroBasedColumnIndex, name ) {
		var segments, line, segment, len, i, parent, leadingWhitespace;

		// If this node doesn't have a source map, we treat it as
		// the original source
		if ( this.isOriginalSource ) {
			return {
				source: this.file,
				line: oneBasedLineIndex,
				column: zeroBasedColumnIndex,
				name: name
			};
		}

		// Otherwise, we need to figure out what this position in
		// the intermediate file corresponds to in *its* source
		segments = this.mappings[ oneBasedLineIndex - 1 ];

		if ( !segments ) {
			return null;
		}

		if ( zeroBasedColumnIndex === undefined ) {
			// we only have a line to go on. Use the first non-whitespace character
			line = this.lines[ oneBasedLineIndex - 1 ];
			zeroBasedColumnIndex = leadingWhitespace ? leadingWhitespace[0].length : 0;
		}

		len = segments.length;

		for ( i = 0; i < len; i += 1 ) {
			segment = segments[i];

			if ( segment[0] === zeroBasedColumnIndex ) {
				parent = this.sources[ segment[1] ];
				return parent.trace( segment[2] + 1, segment[3], this.map.names[ segment[4] ] || name );
			}

			if ( segment[0] > zeroBasedColumnIndex ) {
				return null;
			}
		}
	},

	write: function ( dest, options ) {
		var map, url, index, content, promises;

		if ( typeof dest !== 'string' ) {
			dest = this.file;
			options = dest;
		}

		options = options || {};
		dest = path.resolve( dest );

		map = this.apply({
			includeContent: options.includeContent,
			base: dest
		});

		url = options.inline ? map.toUrl() : ( options.absolutePath ? dest : path.basename( dest ) ) + '.map';

		index = this.content.lastIndexOf( 'sourceMappingURL=' ) + 17;
		content = this.content.substr( 0, index ) + this.content.substring( index ).replace( /^\S+/, url );

		promises = [ sander.writeFile( dest, content ) ];

		if ( !options.inline ) {
			promises.push( sander.writeFile( dest + '.map', map.toString() ) );
		}

		return sander.Promise.all( promises );
	}
};

export default Node;

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