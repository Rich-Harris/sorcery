import path from 'path';
import sander from 'sander';
import SourceMap from './SourceMap';
import getRelativePath from './utils/getRelativePath';
import encodeMappings from './utils/encodeMappings';
import decodeMappings from './utils/decodeMappings';
import getSourceMappingUrl from './utils/getSourceMappingUrl';
import getMapFromUrl from './utils/getMapFromUrl';
import traceMapping from './utils/traceMapping';

const Promise = sander.Promise;

export default class Node {
	constructor ( file, content ) {
		this.file = path.resolve( file );
		this.content = content || null; // sometimes exists in sourcesContent, sometimes doesn't


		// these get filled in later
		this.map = null;
		this.mappings = null;
		this.sources = null;
		this.isOriginalSource = null;


		this._stats = {
			decodingTime: 0,
			encodingTime: 0,
			tracingTime: 0,

			untraceable: 0
		};

		this.sourcesContentByPath = {};
	}

	_load () {
		return getContent( this ).then( content => {
			var url;

			this.content = content;

			url = getSourceMappingUrl( content );

			if ( !url ) {
				this.isOriginalSource = true;
				return null;
			}

			return getMapFromUrl( url, this.file ).then( map => {
				var promises, sourcesContent;

				this.map = map;

				let decodingStart = process.hrtime();
				this.mappings = decodeMappings( map.mappings );
				let decodingTime = process.hrtime( decodingStart );
				this._stats.decodingTime = 1e9 * decodingTime[0] + decodingTime[1];

				sourcesContent = map.sourcesContent || [];

				this.sources = map.sources.map( ( source, i ) => {
					return new Node( source ? resolveSourcePath( this, source ) : null, sourcesContent[i] );
				});

				promises = this.sources.map( load );

				return Promise.all( promises ).then( () => {
					getSourcesContent( this );
					return this;
				});
			});
		});
	}

	_loadSync () {
		var url, map, sourcesContent;

		if ( !this.content ) {
			this.content = sander.readFileSync( this.file ).toString();
		}

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
	}

	apply ( options = {} ) {
		var allNames = [],
			allSources = [];

		var applySegment = ( segment, result ) => {
			var traced = traceMapping(
				this.sources[ segment[1] ], // source
				segment[2], // source code line
				segment[3], // source code column
				this.map.names[ segment[4] ]
			);

			if ( !traced ) {
				this._stats.untraceable += 1;
				return;
			}

			var sourceIndex = allSources.indexOf( traced.source );
			if ( !~sourceIndex ) {
				sourceIndex = allSources.length;
				allSources.push( traced.source );
			}

			var newSegment = [
				segment[0], // generated code column
				sourceIndex,
				traced.line - 1,
				traced.column
			];

			var nameIndex;

			if ( traced.name ) {
				nameIndex = allNames.indexOf( traced.name );
				if ( !~nameIndex ) {
					nameIndex = allNames.length;
					allNames.push( traced.name );
				}

				newSegment[4] = nameIndex;
			}

			result[ result.length ] = newSegment;
		};

		// Trace mappings
		let tracingStart = process.hrtime();

		let i = this.mappings.length;
		let resolved = new Array( i );

		let j, line, result;

		while ( i-- ) {
			line = this.mappings[i];
			resolved[i] = result = [];

			for ( j = 0; j < line.length; j += 1 ) {
				applySegment( line[j], result );
			}
		}

		let tracingTime = process.hrtime( tracingStart );
		this._stats.tracingTime = 1e9 * tracingTime[0] + tracingTime[1];

		// Encode mappings
		let encodingStart = process.hrtime();
		let mappings = encodeMappings( resolved );
		let encodingTime = process.hrtime( encodingStart );
		this._stats.encodingTime = 1e9 * encodingTime[0] + encodingTime[1];

		let includeContent = options.includeContent !== false;

		return new SourceMap({
			file: path.basename( this.file ),
			sources: allSources.map( ( source ) => {
				return getRelativePath( options.base || this.file, source );
			}),
			sourcesContent: allSources.map( ( source ) => {
				return includeContent ? this.sourcesContentByPath[ source ] : null;
			}),
			names: allNames,
			mappings
		});
	}

	stat () {
		return {
			selfDecodingTime: this._stats.decodingTime / 1e6,
			totalDecodingTime: ( this._stats.decodingTime + tally( this.sources, 'decodingTime' ) ) / 1e6,

			encodingTime: this._stats.encodingTime / 1e6,
			tracingTime: this._stats.tracingTime / 1e6,

			untraceable: this._stats.untraceable
		};
	}

	trace ( oneBasedLineIndex, zeroBasedColumnIndex ) {
		return traceMapping( this, oneBasedLineIndex - 1, zeroBasedColumnIndex, null );
	}

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
		content = this.content.substr( 0, index ) + this.content.substring( index ).replace( /^[^\r\n]+/, encodeURI( url ) ) + '\n';

		promises = [ sander.writeFile( dest, content ) ];

		if ( !options.inline ) {
			promises.push( sander.writeFile( dest + '.map', map.toString() ) );
		}

		return Promise.all( promises );
	}
}

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

function tally ( nodes, stat ) {
	return nodes.reduce( ( total, node ) => {
		return total + node._stats[ stat ];
	}, 0 );
}
