import { resolve } from 'path';
import Node from './Node.js';
import Chain from './Chain.js';

export function load ( file, raw_options ) {
	const { node, nodeCacheByFile, options } = init( file, raw_options );

	return node.load( nodeCacheByFile, options )
		.then( () => node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, options ) );
}

export function loadSync ( file, raw_options = {}) {
	const { node, nodeCacheByFile, options } = init( file, raw_options );

	node.loadSync( nodeCacheByFile, options );
	return node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, options );
}

function init ( file, options = {}) {
	options.existingContentOnly = ( options.existingContentOnly == null ) ? true : options.existingContentOnly;

	let nodeCacheByFile = {};
	const node = new Node({ file });
	nodeCacheByFile[file] = node;

	if ( options.content ) {
		Object.keys( options.content ).forEach( key => {
			const file = resolve( key );
			const node = nodeCacheByFile[file] || new Node({ file });
			node.content = options.content[ key ];
			nodeCacheByFile[file] = node;
		});
	}
	if ( options.sourcemaps ) {
		Object.keys( options.sourcemaps ).forEach( key => {
			const file = resolve( key );
			const node = nodeCacheByFile[file] || new Node({ file });
			node.map = options.sourcemaps[ key ];
			nodeCacheByFile[file] = node;
		});
	}

	return { node, nodeCacheByFile, options };
}
