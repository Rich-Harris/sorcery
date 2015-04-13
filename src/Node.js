import path from 'path';
import sander from 'sander';
import decodeMappings from './utils/decodeMappings';
import getSourceMappingUrl from './utils/getSourceMappingUrl';
import getMapFromUrl from './utils/getMapFromUrl';

const Promise = sander.Promise;

export default class Node {
	constructor ({ file, content }) {
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
	}

	load ( sourcesContentByPath ) {
		return getContent( this ).then( content => {
			var url;

			this.content = sourcesContentByPath[ this.file ] = content;

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
					return new Node({
						file: source ? resolveSourcePath( this, source ) : null,
						content: sourcesContent[i]
					});
				});

				promises = this.sources.map( node => node.load( sourcesContentByPath ) );

				return Promise.all( promises );
			});
		});
	}

	loadSync ( sourcesContentByPath ) {
		var url, map, sourcesContent;

		if ( !this.content ) {
			this.content = sourcesContentByPath[ this.file ] = sander.readFileSync( this.file ).toString();
		}

		url = getSourceMappingUrl( this.content );

		if ( !url ) {
			this.isOriginalSource = true;
		} else {
			this.map = map = getMapFromUrl( url, this.file, true );
			this.mappings = decodeMappings( map.mappings );
			sourcesContent = map.sourcesContent || [];

			this.sources = map.sources.map( ( source, i ) => {
				var node = new Node({
					file: resolveSourcePath( this, source ),
					content: sourcesContent[i]
				});

				node.loadSync( sourcesContentByPath );

				return node;
			});
		}
	}

	/**
	 * Traces a segment back to its origin
	 * @param {number} lineIndex - the zero-based line index of the
	   segment as found in `this`
	 * @param {number} columnIndex - the zero-based column index of the
	   segment as found in `this`
	 * @param {string || null} - if specified, the name that should be
	   (eventually) returned, as it is closest to the generated code
	 * @returns {object}
	     @property {string} source - the filepath of the source
	     @property {number} line - the one-based line index
	     @property {number} column - the zero-based column index
	     @property {string || null} name - the name corresponding
	     to the segment being traced
	 */
	trace ( lineIndex, columnIndex, name ) {
		var segments;

		// If this node doesn't have a source map, we have
		// to assume it is the original source
		if ( this.isOriginalSource ) {
			return {
				source: this.file,
				line: lineIndex + 1,
				column: columnIndex || 0,
				name: name
			};
		}

		// Otherwise, we need to figure out what this position in
		// the intermediate file corresponds to in *its* source
		segments = this.mappings[ lineIndex ];

		if ( !segments || segments.length === 0 ) {
			return null;
		}

		if ( columnIndex != null ) {
			let len = segments.length;
			let i;

			for ( i = 0; i < len; i += 1 ) {
				let generatedCodeColumn = segments[i][0];

				if ( generatedCodeColumn > columnIndex ) {
					break;
				}

				if ( generatedCodeColumn === columnIndex ) {
					let sourceFileIndex = segments[i][1];
					let sourceCodeLine = segments[i][2];
					let sourceCodeColumn = segments[i][3];
					let nameIndex = segments[i][4];

					let parent = this.sources[ sourceFileIndex ];
					return parent.trace( sourceCodeLine, sourceCodeColumn, this.map.names[ nameIndex ] || name );
				}
			}
		}

		// fall back to a line mapping
		let sourceFileIndex = segments[0][1];
		let sourceCodeLine = segments[0][2];
		let nameIndex = segments[0][4];

		let parent = this.sources[ sourceFileIndex ];
		return parent.trace( sourceCodeLine, null, this.map.names[ nameIndex ] || name );
	}
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
