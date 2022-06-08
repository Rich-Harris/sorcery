import { Transform } from 'stream';

import { ChainImpl, writeStream } from './ChainImpl';
import { parseOptions } from './Options';
import type { Options } from './Options';
import { NodeImpl } from './NodeImpl';
import { Context } from './Context';
import type { SourceMapProps } from './SourceMap';
import { SOURCEMAP_COMMENT } from './utils/sourceMappingURL';
import type { Chain } from './Chain';

export function transform ( transform_options: Options ) {
    let source = '';

    const liner = new Transform( { objectMode: true } );
    // the transform function
    liner._transform = function (chunk, encoding, done) {
        source += chunk.toString();
        done();
    }
    // to flush remaining data (if any)
    liner._flush = function (done) {
        const node = _init( transform_options.output, source, null, transform_options );
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
  
    // function write ( data: string ) { source += data; }
    // function end () {
    //     const through_context: any = this as any;
    //     const node = _init( transform_options.output, source, null, transform_options );
    //     node.loadSync( );
    //     if ( !node.isOriginalSource ) {
    //         const content = writeStream( node );
    //         through_context.queue( content );
    //     }
    //     else {
    //         through_context.queue( source );
    //     }
    //     through_context.queue( null );
    // }
    // return through( write, end );
}

export function webpack_loader(input: string, inputMap: string, loader_options: Options): { input: string, inputMap: string } {
    const map: SourceMapProps = inputMap ? JSON.parse(inputMap): null;
    const node = _init( undefined, input, map, loader_options );
    node.loadSync( );
    if ( !node.isOriginalSource ) {
      const chain = new ChainImpl( node );
      const map = chain.apply( loader_options );
      if (map)
        input = input.replace( SOURCEMAP_COMMENT, '' );
        inputMap = map.toString();
    }
    return { input, inputMap }
}

export function load ( file: string, load_options: Options ): Promise<Chain | null> {
    const node = _init( file, null, null, load_options );

    return node.load()
        .then( () => node.isOriginalSource ? null : new ChainImpl( node ) );
}

export function loadSync ( file: string, load_options: Options ): Chain | null {
    const node = _init( file, null, null, load_options );

    node.loadSync();
    return node.isOriginalSource ? null : new ChainImpl( node );
}

export function _init ( file: string, content: string, map: SourceMapProps, load_options: Options ) {
    const options = parseOptions( load_options );
    options.input = options.input || file;
    const context = new Context(options);
    const node = NodeImpl.Create(context, options.input, content, map);
    return node;
}
