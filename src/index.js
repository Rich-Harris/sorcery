import { resolve, dirname } from 'path';
import { through } from 'through';

import Node from './Node.js';
import Chain, { writeStream } from './Chain.js';
import { parseLoadOptions } from './utils/parseOptions.js';

export function transform ( transform_options ) {
	var source = '';
  
	function write ( data ) { source += data; }
	function end () { 
		const { node, nodeCacheByFile, options } = init( transform_options.output, source, transform_options );
		node.loadSync( nodeCacheByFile, options );
		if ( !node.isOriginalSource(options) ) {
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
	const { node, nodeCacheByFile, options } = init( file, null, load_options );

	return node.load( nodeCacheByFile, options )
		.then( () => node.isOriginalSource(options) ? null : new Chain( node, nodeCacheByFile, options ) );
}

export function loadSync ( file, load_options = {}) {
	const { node, nodeCacheByFile, options } = init( file, null, load_options );

	node.loadSync( nodeCacheByFile, options );
	return node.isOriginalSource(options) ? null : new Chain( node, nodeCacheByFile, options );
}

function init ( file, content, original_options = {}) {
	const options = parseLoadOptions( original_options );

	// Set keep insertion order
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/@@iterator
	const sourceRoots = new Set();

	file = file || options.input;
	if ( file ) {
		file = resolve( file );
		sourceRoots.add( dirname( file ) );
	}
	if ( options.sourceRootResolution ) {
		sourceRoots.add( resolve( options.sourceRootResolution ) );
	}
	sourceRoots.add( resolve() );

	options.sourceRoots = Array.from( sourceRoots );

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
