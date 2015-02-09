import path from 'path';
import sander from 'sander';
import SourceMap from './SourceMap';
import getRelativePath from './utils/getRelativePath';
import encodeMappings from './utils/encodeMappings';
import decodeMappings from './utils/decodeMappings';
import getSourceMappingUrl from './utils/getSourceMappingUrl';
import getMapFromUrl from './utils/getMapFromUrl';

var Promise = sander.Promise;

var Node = function ( file, content ) {
	this.file = path.resolve( file );
	this.content = content || null; // sometimes exists in sourcesContent, sometimes doesn't

	// these get filled in later
	this.map = null;
	this.mappings = null;
	this.sources = null;
	this.isOriginalSource = null;
	this.lines = null;

	this.sourcesContentByPath = {};
};

Node.prototype = {
	_load () {
		return getContent( this ).then( content => {
			var url;

			this.content = content;
			this.lines = content.split( '\n' );

			url = getSourceMappingUrl( content );

			if ( !url ) {
				this.isOriginalSource = true;
				return null;
			}

			return getMapFromUrl( url, this.file ).then( map => {
				var promises, sourcesContent;

				this.map = map;
				this.mappings = decodeMappings( map.mappings );
				sourcesContent = map.sourcesContent || [];

				this.sources = map.sources.map( ( source, i ) => {
					return new Node( resolveSourcePath( this, source ), sourcesContent[i] );
				});

				promises = this.sources.map( load );

				return Promise.all( promises ).then( () => {
					getSourcesContent( this );
					return this;
				});
			});
		});
	},

	_loadSync () {
		var url, map, sourcesContent;

		if ( !this.content ) {
			this.content = sander.readFileSync( this.file ).toString();
		}

		this.lines = this.content.split( '\n' );

		url = getSourceMappingUrl( this.content );

		if ( !url ) {
			this.isOriginalSource = true;
		} else {
			this.map = map = getMapFromUrl( url, this.file, true );
			this.mappings = decodeMappings( map.mappings );
			sourcesContent = map.sourcesContent || [];

			this.sources = map.sources.map( ( source, i ) => {
				var node = new Node( resolveSourcePath( this, source ), sourcesContent[i] );
				node._loadSync();

				return node;
			});

			getSourcesContent( this );
		}

		return !this.isOriginalSource ? this : null;
	},

	apply ( options = {} ) {
		var resolved,
			names = [],
			sources = [],
			includeContent;

		includeContent = options.includeContent !== false;

		resolved = this.mappings.map( line => {
			var result = [];

			line.forEach( segment => {
				var source, traced, newSegment, sourceIndex, nameIndex;

				if ( segment.length === 1 ) {
					// TODO not sure what to do here...?
					resolved.push([ segment[0] ]);
					return;
				}

				source = this.sources[ segment[1] ];
				traced = source.trace( segment[2] + 1, segment[3], this.map.names[ segment[4] ] );

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

		return new SourceMap({
			file: this.file.split( '/' ).pop(),
			sources: sources.map( ( source ) => {
				return getRelativePath( options.base || this.file, source );
			}),
			sourcesContent: sources.map( ( source ) => {
				return includeContent ? this.sourcesContentByPath[ source ] : null;
			}),
			names: names,
			mappings: encodeMappings( resolved )
		});
	},

	trace ( oneBasedLineIndex, zeroBasedColumnIndex, name ) {
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

	write ( dest, options ) {
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

		return Promise.all( promises );
	}
};

export default Node;

function load ( node ) {
	return node._load();
}

function getContent ( node ) {
	if ( !node.content ) {
		return sander.readFile( node.file ).then( String );
	}

	return Promise.resolve( node.content );
}

function resolveSourcePath ( node, source ) {
	// TODO handle sourceRoot
	return path.resolve( path.dirname( node.file ), source );
}

function getSourcesContent ( node ) {
	node.sources.forEach( source => {
		node.sourcesContentByPath[ source.file ] = source.content;

		Object.keys( source.sourcesContentByPath ).forEach( file => {
			node.sourcesContentByPath[ file ] = source.sourcesContentByPath[ file ];
		});
	});
}