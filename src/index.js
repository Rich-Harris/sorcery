import { resolve, dirname } from 'path';
import { through } from 'through';

import Node, { _init } from './Node.js';
import Chain, { writeStream } from './Chain.js';
import { parseOptions } from './utils/parseOptions.js';

export function transform ( transform_options ) {
	var source = '';
  
	function write ( data ) { source += data; }
	function end () { 
		const { node, nodeCacheByFile, options } = _init( transform_options.output, source, transform_options );
		node.loadSync( nodeCacheByFile, options );
		if ( !node.isOriginalSource ) {
			const content = writeStream( node, nodeCacheByFile, transform_options );
			this.queue( content );
		}
		else {
			this.queue( source );
		}
		this.queue( null );
	}
	return through( write, end );
}

export function load ( file, load_options ) {
	const { node, nodeCacheByFile, options } = _init( file, null, load_options );

	return node.load( nodeCacheByFile, options )
		.then( () => node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, load_options ) );
}

export function loadSync ( file, load_options ) {
	const { node, nodeCacheByFile, options } = _init( file, null, load_options );

	node.loadSync( nodeCacheByFile, options );
	return node.isOriginalSource ? null : new Chain( node, nodeCacheByFile, load_options );
}

