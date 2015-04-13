import path from 'path';
import sander from 'sander';
import SourceMap from './SourceMap';
import getRelativePath from './utils/getRelativePath';
import encodeMappings from './utils/encodeMappings';

export default class Chain {
	constructor ( node, sourcesContentByPath ) {
		this.node = node;
		this.sourcesContentByPath = sourcesContentByPath;

		this._stats = {};
	}

	stat () {
		return {
			selfDecodingTime: this._stats.decodingTime / 1e6,
			totalDecodingTime: ( this._stats.decodingTime + tally( this.node.sources, 'decodingTime' ) ) / 1e6,

			encodingTime: this._stats.encodingTime / 1e6,
			tracingTime: this._stats.tracingTime / 1e6,

			untraceable: this._stats.untraceable
		};
	}

	apply ( options = {} ) {
		var allNames = [],
			allSources = [];

		var applySegment = ( segment, result ) => {
			var traced = this.node.sources[ segment[1] ].trace( // source
				segment[2], // source code line
				segment[3], // source code column
				this.node.map.names[ segment[4] ]
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

		let i = this.node.mappings.length;
		let resolved = new Array( i );

		let j, line, result;

		while ( i-- ) {
			line = this.node.mappings[i];
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
			file: path.basename( this.node.file ),
			sources: allSources.map( ( source ) => {
				return getRelativePath( options.base || this.node.file, source );
			}),
			sourcesContent: allSources.map( ( source ) => {
				return includeContent ? this.sourcesContentByPath[ source ] : null;
			}),
			names: allNames,
			mappings
		});
	}

	trace ( oneBasedLineIndex, zeroBasedColumnIndex ) {
		return this.node.trace( oneBasedLineIndex - 1, zeroBasedColumnIndex, null );
	}

	write ( dest, options ) {
		var map, url, index, content, promises;

		if ( typeof dest !== 'string' ) {
			dest = this.node.file;
			options = dest;
		}

		options = options || {};
		dest = path.resolve( dest );

		map = this.apply({
			includeContent: options.includeContent,
			base: dest
		});

		url = options.inline ? map.toUrl() : ( options.absolutePath ? dest : path.basename( dest ) ) + '.map';

		index = this.node.content.lastIndexOf( 'sourceMappingURL=' ) + 17;
		content = this.node.content.substr( 0, index ) + this.node.content.substring( index ).replace( /^[^\r\n]+/, encodeURI( url ) ) + '\n';

		promises = [ sander.writeFile( dest, content ) ];

		if ( !options.inline ) {
			promises.push( sander.writeFile( dest + '.map', map.toString() ) );
		}

		return Promise.all( promises );
	}
}

function tally ( nodes, stat ) {
	return nodes.reduce( ( total, node ) => {
		return total + node._stats[ stat ];
	}, 0 );
}