import { readFile, readFileSync } from 'fs-extra';

export default function getContent ( node, sourcesContentByPath, sync ) {
	// 'undefined' never seen
	// 'null' seen but empty
	let content = node.content || sourcesContentByPath[node.file];
	if ( content === undefined ) {
		if (sync) {
			try {
				content = readFileSync( node.file, { encoding: 'utf-8' });
			} catch ( e ) {
				content = null;
			}
			return sourcesContentByPath[node.file] = content;
		}
		else {
			return readFile( node.file, { encoding: 'utf-8' }).catch( () => null )
			.then((content) => {
				return sourcesContentByPath[node.file] = content;
			});
		}
	}
	else {
		sourcesContentByPath[node.file] = content;
	}
	return sync ? content : Promise.resolve( content );
}
