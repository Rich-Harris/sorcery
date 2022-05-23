import { basename, dirname, extname, relative, resolve } from 'path';
import { writeFile, writeFileSync, ensureDir, ensureDirSync } from 'fs-extra';
import { encode } from 'sourcemap-codec';
import SourceMap from './SourceMap.js';
import slash from './utils/slash.js';
import SOURCEMAPPING_URL from './utils/sourceMappingURL.js';

const SOURCEMAP_COMMENT = new RegExp( '\n*(?:' +
	`\\/\\/[@#]\\s*${SOURCEMAPPING_URL}=([^\n]+)|` + // js
	`\\/\\*#?\\s*${SOURCEMAPPING_URL}=([^'"]+)\\s\\*\\/)` + // css
'\\s*$', 'g' );

export default function Chain ( node, nodeCacheByFile, options ) {
	this.node = node;
	this.nodeCacheByFile = nodeCacheByFile;
	this.options = options;

	this._stats = {};
}

Chain.prototype = {
	stat () {
		return {
			selfDecodingTime: this._stats.decodingTime / 1e6,
			totalDecodingTime: ( this._stats.decodingTime + tally( this.node.sources, 'decodingTime' ) ) / 1e6,

			encodingTime: this._stats.encodingTime / 1e6,
			tracingTime: this._stats.tracingTime / 1e6,

			untraceable: this._stats.untraceable
		};
	},

	apply ( raw_options = {}) {
		const options = Object.assign({}, this.options, raw_options);
		if (options.sourcePathTemplate == null) {
			if (options.base) {
				options.sourcePathTemplate = '[base-source-path]';
			}
			else {
				options.sourcePathTemplate = '[relative-source-path]';
			}
		}

		let allNames = [];
		let allSources = [];
		const applySegment = ( segment, result ) => {
			if ( segment.length < 4 ) return;

			const traced = this.node.sources[ segment[1] ].trace( // source
				segment[2], // source code line
				segment[3], // source code column
				this.node.map.names[ segment[4] ]
			);

			if ( !traced ) {
				this._stats.untraceable += 1;
				return;
			}

			let sourceIndex = allSources.indexOf( traced.source );
			if ( !~sourceIndex ) {
				sourceIndex = allSources.length;
				allSources.push( traced.source );
			}

			let newSegment = [
				segment[0], // generated code column
				sourceIndex,
				traced.line - 1,
				traced.column
			];

			if ( traced.name ) {
				let nameIndex = allNames.indexOf( traced.name );
				if ( !~nameIndex ) {
					nameIndex = allNames.length;
					allNames.push( traced.name );
				}

				newSegment[4] = nameIndex;
			}

			result[ result.length ] = newSegment;
		};

		let i = this.node.mappings.length;
		let allMappings;
		if (options.flatten) {
			allMappings = new Array( i );
			// Trace mappings
			let tracingStart = process.hrtime();

			let j, line, result;

			while ( i-- ) {
				line = this.node.mappings[i];
				allMappings[i] = result = [];

				for ( j = 0; j < line.length; j += 1 ) {
					applySegment( line[j], result );
				}
			}

			let tracingTime = process.hrtime( tracingStart );
			this._stats.tracingTime = 1e9 * tracingTime[0] + tracingTime[1];
		}
		else {
			allMappings = this.node.mappings;
			allSources = this.node.map.sources;
			allNames = this.node.map.names;
		}

		// Encode mappings
		let encodingStart = process.hrtime();
		let mappings = encode( allMappings );
		let encodingTime = process.hrtime( encodingStart );
		this._stats.encodingTime = 1e9 * encodingTime[0] + encodingTime[1];

		let includeContent = options.includeContent !== false;

		return new SourceMap({
			file: basename( this.node.file ),
			sources: allSources.map( source => getSourcePath( this.node, source, options ) ),
			sourcesContent: allSources.map((source) => {
				if (!includeContent) {
					return null;
				}
			 	const node = source ? this.nodeCacheByFile[ source ] : null;
				return node ? node.content : null;
			}),
			names: allNames,
			mappings
		});
	},

	trace ( oneBasedLineIndex, zeroBasedColumnIndex ) {
		return this.node.trace( oneBasedLineIndex - 1, zeroBasedColumnIndex, null );
	},

	write ( dest, raw_options ) {
		const { resolved, content, map, options } = this.getContentAndMap( dest, raw_options );

		return ensureDir(dirname(resolved))
		.then(() => {
			let promises = [ writeFile( resolved, content ) ];

			if ( !options.inline ) {
				promises.push( writeFile( resolved + '.map', map.toString() ) );
			}

			return Promise.all( promises );
		});
	},

	writeSync ( dest, raw_options ) {
		const { resolved, content, map, options } = this.getContentAndMap( dest, raw_options );

		ensureDirSync(dirname(resolved));
		writeFileSync( resolved, content );
		if ( !options.inline ) {
			writeFileSync( resolved + '.map', map.toString() );
		}
	},

	getContentAndMap ( dest, raw_options ) {
		if ( typeof dest === 'string' ) {
			raw_options = raw_options || {};
			raw_options.output = dest;
		}
		else if ( typeof dest === 'object' ) {
			raw_options = dest;
		}
		else {
			raw_options = options || {};
		}
	
		const options = Object.assign({}, this.options, raw_options);
		options.output = options.output || this.node.file;
	
		const resolved = resolve( options.output );
		options.base = options.base ? resolve( options.base ) : dirname( resolved );
	
		const map = this.apply(options);
	
		const url = options.inline ? map.toUrl() : ( options.absolutePath ? resolved : basename( resolved ) ) + '.map';
	
		// TODO shouldn't url be relative?
		const content = this.node.content.replace( SOURCEMAP_COMMENT, '' ) + sourcemapComment( url, resolved );
	
		return { resolved, content, map, options };
	}
	};

function tally ( nodes, stat ) {
	return nodes.reduce( ( total, node ) => {
		return total + node._stats[ stat ];
	}, 0 );
}

function sourcemapComment ( url, dest ) {
	const ext = extname( dest );
	url = encodeURI( url );

	if ( ext === '.css' ) {
		return `\n/*# ${SOURCEMAPPING_URL}=${url} */\n`;
	}

	return `\n//# ${SOURCEMAPPING_URL}=${url}\n`;
}

function getSourcePath(node, source, options) {
	const replacer = {
		'[absolute-source-path]': source,
		'[base-source-path]': options.base ? relative( options.base, source ) : options.base,
		'[relative-source-path]': relative( dirname( node.file ), source )
	};
	let sourcePath = options.sourcePathTemplate;
	Object.keys(replacer).forEach((key) => {
		sourcePath = sourcePath.replace(key, replacer[key]);
	});
	return slash(sourcePath);
}
