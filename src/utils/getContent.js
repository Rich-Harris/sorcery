import { readFile, readFileSync } from 'fs-extra';

export default function getContent ( node, sync ) {
	// 'undefined' never seen
	// 'null' seen but empty
	const content = node.content;
	if ( content !== undefined ) {
		return sync ? content : Promise.resolve( content );
	}
	if (sync) {
		try {
			return readFileSync( node.file, { encoding: 'utf-8' });
		}
		catch ( e ) {
			return null;
		}
	}
	else {
		return readFile( node.file, { encoding: 'utf-8' }).catch( () => null );
	}
}
