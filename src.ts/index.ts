import { through } from 'through';

import { ChainImpl, writeStream } from './ChainImpl';
import { parseOptions } from './Options';
import type { Options } from './Options';
import { NodeImpl } from './Nodeimpl';
import { Context } from './Context';

export function transform ( transform_options: Options ) {
    var source = '';
  
    function write ( data ) { source += data; }
    function end () { 
        const node = _init( transform_options.output, source, transform_options );
        node.loadSync( );
        if ( !node.isOriginalSource ) {
            const content = writeStream( node );
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
    const node = _init( file, null, load_options );

    return node.load()
        .then( () => node.isOriginalSource ? null : new ChainImpl( node ) );
}

export function loadSync ( file, load_options ) {
    const node = _init( file, null, load_options );

    node.loadSync();
    return node.isOriginalSource ? null : new ChainImpl( node );
}

export function _init ( file, content, load_options ) {
    const options = parseOptions( load_options );
    options.input = options.input | file
    const context = new Context(options);
    const node = NodeImpl.Create(context, options.input, content);
    return node;
}
