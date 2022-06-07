import { through } from 'through';

import { ChainImpl, writeStream } from './ChainImpl';
import { parseOptions } from './Options';
import type { Options } from './Options';
import { NodeImpl } from './Nodeimpl';
import { Context } from './Context';
import { SourceMapProps } from './SourceMap';
import { SOURCEMAP_COMMENT } from './utils/sourceMappingURL';

export function transform ( transform_options: Options ) {
    var source = '';
  
    function write ( data ) { source += data; }
    function end () { 
        const node = _init( transform_options.output, source, null, transform_options );
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

export function load ( file, load_options ) {
    const node = _init( file, null, null, load_options );

    return node.load()
        .then( () => node.isOriginalSource ? null : new ChainImpl( node ) );
}

export function loadSync ( file, load_options ) {
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
