import { resolve } from 'path';
import { through } from 'through';

import Node from './Node.js';
import Chain from './Chain.js';

export function transform(raw_options) {
	var source = '';
  
	function write (data) { source += data; }
	function end () { 
		const { node, nodeCacheByFile, options } = init( raw_options.output, source, raw_options );
		node.loadSync( nodeCacheByFile, options );
		const node_options = options;
		if (!node.isOriginalSource) {
			const chain = new Chain( node, nodeCacheByFile, node_options );
			const { resolved, content, map, options } = chain.getContentAndMap( node_options.output, node_options );
			this.queue(content);
			if ( !options.inline ) {
				writeFileSync( resolved + '.map', map.toString() );
			}
		}
		else {
			this.queue(source);
		}
		this.queue(null);
	}
	return through(write, end);
}

export function load ( file, raw_options ) {
	const { node, nodeCacheByFile, options } = init( file, null, raw_options );

	return node.load( nodeCacheByFile, options )
		.then( () => node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, options ) );
}

export function loadSync ( file, raw_options = {}) {
	const { node, nodeCacheByFile, options } = init( file, null, raw_options );

	node.loadSync( nodeCacheByFile, options );
	return node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, options );
}

function init ( file, content, options = {}) {
	options.existingContentOnly = ( options.existingContentOnly == null ) ? true : options.existingContentOnly;
	options.flatten = (options.flatten == null) ? true : options.flatten;

	let nodeCacheByFile = {};
	const node = new Node({ file, content });
	if (node.file) {
		nodeCacheByFile[node.file] = node;
	}

	if ( options.content ) {
		Object.keys( options.content ).forEach( key => {
			const file = resolve( key );
			const node = nodeCacheByFile[file] || new Node({ file });
			node.content = options.content[ key ];
			nodeCacheByFile[node.file] = node;
		});
	}
	if ( options.sourcemaps ) {
		Object.keys( options.sourcemaps ).forEach( key => {
			const file = resolve( key );
			const node = nodeCacheByFile[file] || new Node({ file });
			node.map = options.sourcemaps[ key ];
			nodeCacheByFile[node.file] = node;
		});
	}
	return { node, nodeCacheByFile, options };
}
