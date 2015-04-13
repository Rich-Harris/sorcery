import Node from './Node';
import Chain from './Chain';

export function load ( file ) {
	const node = new Node( file );
	return node._load().then( () => node.isOriginalSource ? null : new Chain( node ) );
}

export function loadSync ( file ) {
	const node = new Node( file );
	node._loadSync();
	return node.isOriginalSource ? null : new Chain( node );
}