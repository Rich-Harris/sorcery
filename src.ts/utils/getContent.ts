import { readFile, readFileSync } from 'fs-extra';
import type { Node } from '../Node';

export function getContent ( node: Node ): Promise<string | null> {
    // 'undefined' never seen
    // 'null' seen but empty
    const content = node.content;
    if ( content === undefined ) {
        return readFile( node.file, { encoding: 'utf-8' }).catch( () => null );
    }
    return Promise.resolve(content);
}

export function getContentSync ( node: Node ): string | null {
    // 'undefined' never seen
    // 'null' seen but empty
    const content = node.content;
    if ( content === undefined ) {
        try {
            return readFileSync( node.file, { encoding: 'utf-8' });
        }
        catch ( e ) {
            return null;
        }
    }
    return content;
}
