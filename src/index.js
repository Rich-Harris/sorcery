import { resolve } from 'path';
import Node from './Node.js';
import Chain from './Chain.js';

export function load ( file, raw_options ) {
	const { node, sourcesContentByPath, sourceMapByPath, options } = init( file, raw_options );

	return node.load( sourcesContentByPath, sourceMapByPath, options )
		.then( () => node.isOriginalSource ? null : new Chain( node, sourcesContentByPath ) );
}

export function loadSync ( file, raw_options = {}) {
	const { node, sourcesContentByPath, sourceMapByPath, options } = init( file, raw_options );

	node.loadSync( sourcesContentByPath, sourceMapByPath, options );
	return node.isOriginalSource ? null : new Chain( node, sourcesContentByPath );
}

function init ( file, options = {}) {
	options.existingContentOnly = ( options.existingContentOnly == null ) ? true : options.existingContentOnly;

	const node = new Node({ file });

	let sourcesContentByPath = {};
	let sourceMapByPath = {};

	if ( options.content ) {
		Object.keys( options.content ).forEach( key => {
			sourcesContentByPath[ resolve( key ) ] = options.content[ key ];
		});
	}

	if ( options.sourcemaps ) {
		Object.keys( options.sourcemaps ).forEach( key => {
			sourceMapByPath[ resolve( key ) ] = options.sourcemaps[ key ];
		});
	}

	return { node, sourcesContentByPath, sourceMapByPath, options };
}
