import path from 'path';
import sander from 'sander';
import SourceMap from './SourceMap';
import getRelativePath from './utils/getRelativePath';
import encodeMappings from './utils/encodeMappings';
import decodeMappings from './utils/decodeMappings';
import getSourceMappingUrl from './utils/getSourceMappingUrl';
import getMapFromUrl from './utils/getMapFromUrl';
import trace from './utils/trace';

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
			allNames = [],
			allSources = [],
			includeContent;

		includeContent = options.includeContent !== false;

		resolved = [];

		var i, j, line, result;

		var applySegment = segment => {
			var generatedCodeColumn = segment[0];
			var sourceFileIndex = segment[1];
			var sourceCodeLine = segment[2];
			var sourceCodeColumn = segment[3];

			var source = this.sources[ sourceFileIndex ];
			var traced = trace( source, sourceCodeLine, sourceCodeColumn, this.map.names[ segment[4] ] );

			if ( !traced ) {
				return;
			}

			var sourceIndex = allSources.indexOf( traced.source );
			if ( !~sourceIndex ) {
				sourceIndex = allSources.length;
				allSources.push( traced.source );
			}

			var newSegment = [ generatedCodeColumn, sourceIndex, traced.line - 1, traced.column ];
			var nameIndex;

			if ( traced.name ) {
				nameIndex = allNames.indexOf( traced.name );
				if ( !~nameIndex ) {
					nameIndex = allNames.length;
					allNames.push( traced.name );
				}

				newSegment.push( nameIndex );
			}

			result.push( newSegment );
		};

		for ( i = 0; i < this.mappings.length; i += 1 ) {
			line = this.mappings[i];

			result = [];

			for ( j = 0; j < line.length; j += 1 ) {
				applySegment( line[j] );
			}

			resolved[i] = result;
		}

		return new SourceMap({
			file: path.basename( this.file ),
			sources: allSources.map( ( source ) => {
				return getRelativePath( options.base || this.file, source );
			}),
			sourcesContent: allSources.map( ( source ) => {
				return includeContent ? this.sourcesContentByPath[ source ] : null;
			}),
			names: allNames,
			mappings: encodeMappings( resolved )
		});
	},

	trace ( oneBasedLineIndex, zeroBasedColumnIndex ) {
		return trace( this, oneBasedLineIndex - 1, zeroBasedColumnIndex, null );
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
