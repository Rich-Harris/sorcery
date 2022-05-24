import { resolve } from 'path';
import { through } from 'through';
import { writeFileSync } from 'fs-extra';

import Node from './Node.js';
import Chain from './Chain.js';
import parseOptions from './utils/parseOptions.js';

export function transform ( transform_options ) {
	var source = '';
  
	function write ( data ) { source += data; }
	function end () { 
		const { node, nodeCacheByFile, options } = init( transform_options.output, source, transform_options );
		node.loadSync( nodeCacheByFile, options );
		if ( !node.isOriginalSource ) {
			const chain = new Chain( node, nodeCacheByFile, transform_options );
			const { resolved, content, map, options } = chain.getContentAndMap( node_options.output, transform_options );
			this.queue( content );
			if ( !options.inline ) {
				writeFileSync( resolved + '.map', map.toString() );
			}
		}
		else {
			this.queue( source );
		}
		this.queue( null );
	}
	return through( write, end );
}

export function load ( file, load_options ) {
	const { node, nodeCacheByFile, options } = init( file, null, load_options );

	return node.load( nodeCacheByFile, options )
		.then( () => node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, load_options ) );
}

export function loadSync ( file, load_options = {}) {
	const { node, nodeCacheByFile, options } = init( file, null, load_options );

	node.loadSync( nodeCacheByFile, options );
	return node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, load_options );
}

function init ( file, content, original_options = {}) {
	const options = parseOptions(original_options);

	let nodeCacheByFile = {};
	const node = new Node({ file, content });
	if ( node.file ) {
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
