import { resolve, dirname } from 'path';
import { Transform } from 'stream';

import Node, { _init } from './Node.js';
import Chain, { writeStream } from './Chain.js';

export function transform ( transform_options ) {
	var source = '';
  
	const liner = new Transform();
    // the transform function
    liner._transform = function (chunk, encoding, done) {
        source += chunk.toString();
        done();
    }
    // to flush remaining data (if any)
    liner._flush = function (done) {
        const { node, nodeCacheByFile, options } = _init( transform_options.output, source, null, transform_options );
        node.loadSync( nodeCacheByFile, options );
        if ( !node.isOriginalSource ) {
            const content = writeStream( node, nodeCacheByFile, transform_options );
            this.push( content );
        }
        else {
            this.push( source );
        }
       done();
    }

    return liner;
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

