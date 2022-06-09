import { getMapFromUrl, getMapFromUrlSync } from './getMapFromUrl.js';
import { getSourceMappingUrl } from './getSourceMappingUrl';

import type { Node } from '../Node';
import type { SourceMapProps } from '../SourceMap';

export function getMap ( node: Node ): Promise<SourceMapProps | null> {
    // 'undefined' never seen
    // 'null' seen but empty
    const map = node.map;
    if ( map === undefined ) {
        const url = getSourceMappingUrl( node.content );
        if ( url ) {
            return getMapFromUrl( url, node.origin );
        }
        return Promise.resolve(null);
    }
    return Promise.resolve(map);
}

export function getMapSync ( node: Node ): SourceMapProps | null {
    // 'undefined' never seen
    // 'null' seen but empty
    const map = node.map;
    if ( map === undefined ) {
        const url = getSourceMappingUrl( node.content );
        if ( url ) {
            return getMapFromUrlSync( url, node.origin );
        }
        return null;
    }
    return map;
}
