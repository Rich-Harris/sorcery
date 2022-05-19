import { readFile, readFileSync } from 'fs-extra';

export default function getContent ( node, sourcesContentByPath, sync ) {
	let content = node.content;
	if ( node.file in sourcesContentByPath ) {
		content = sourcesContentByPath[node.file];
	}

	if ( !content ) {
		if (sync) {
			try {
				content = readFileSync( node.file, { encoding: 'utf-8' });
			} catch ( e ) {
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
