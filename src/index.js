import Node from './Node';

export function load ( file ) {
	return new Node( file )._load();
}

export function loadSync ( file ) {
	return new Node( file )._loadSync();
}