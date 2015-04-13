import Node from './Node';
import Chain from './Chain';

export function load ( file ) {
	const node = new Node({ file });

	let sourcesContentByPath = {};
	return node.load( sourcesContentByPath )
		.then( () => node.isOriginalSource ? null : new Chain( node, sourcesContentByPath ) );
}

export function loadSync ( file ) {
	const node = new Node({ file });

	let sourcesContentByPath = {};
	node.loadSync( sourcesContentByPath );

	return node.isOriginalSource ? null : new Chain( node, sourcesContentByPath );
}