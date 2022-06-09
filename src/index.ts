import * as path from 'path';
import { Transform } from 'stream';

import { ChainImpl, writeStream } from './ChainImpl';
import type { Options } from './Options';
import { NodeImpl } from './NodeImpl';
import { Context } from './Context';
import type { SourceMapProps } from './SourceMap';
import type { Chain } from './Chain';

export function transform ( transform_options: Options ) {
    let source = '';

    const liner = new Transform();
    // the transform function
    liner._transform = function (chunk, encoding, done) {
        source += chunk.toString();
        done();
    }
    // to flush remaining data (if any)
    liner._flush = function (done) {
        const node = _init(path.resolve(),  transform_options.output, source, null, transform_options );
        node.loadSync( );
        if ( !node.isOriginalSource ) {
            const content = writeStream( node );
            this.push( content );
        }
        else {
            this.push( source );
        }
       done();
    }

    return liner;
}

export function load ( file: string, load_options: Options ): Promise<Chain | null> {
    const node = _init(path.resolve(),  file, null, null, load_options );

    return node.load()
        .then( () => node.isOriginalSource ? null : new ChainImpl( node ) );
}

export function loadSync ( file: string, load_options: Options ): Chain | null {
    const node = _init(path.resolve(), file, null, null, load_options );

    node.loadSync();
    return node.isOriginalSource ? null : new ChainImpl( node );
}

export function _init ( origin: string, file: string, content: string, map: SourceMapProps, load_options: Options ) {
    const context = new Context(origin, load_options);
    const node = NodeImpl.Create(context, file, content, map);
    return node;
}
