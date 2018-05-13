import { resolve } from 'path';
import Node from './Node.js';
import Chain from './Chain.js';
import getMap from './utils/getMap.js';

export default function sorcery ( sources, options ) {
	let sourcesContentByPath = {};
	let sourceMapByPath = {};

	const loadSync = function ( source, parent ) {
		const node = new Node({
			content: source.content || source,
		});
		if ( source.map ) {
			node.map = source.map;
			node.isOriginalSource = false;
		} else {
			node.map = getMap( node, sourceMapByPath, true );
		}
		if ( node.map ) {
			node.decode();
			node.sources = parent ? [ parent ] : null;
		}
		return node;
	};

	const nodes = [];
	for ( let i = sources.length - 1; i >= 0; i-- ) {
		nodes.unshift( loadSync( sources[i], nodes[0] ) );
	}
	if ( !nodes.length ) {
		return null;
	}

	const last = nodes[ nodes.length - 1 ];
	last.loadSync( sourcesContentByPath, sourceMapByPath );

	const chain = new Chain( nodes[0], sourcesContentByPath );
	return chain.apply( options );
}

export function load ( file, options ) {
	const { node, sourcesContentByPath, sourceMapByPath } = init( file, options );

	return node.load( sourcesContentByPath, sourceMapByPath )
		.then( () => node.isOriginalSource ? null : new Chain( node, sourcesContentByPath ) );
}

export function loadSync ( file, options = {} ) {
	const { node, sourcesContentByPath, sourceMapByPath } = init( file, options );

	node.loadSync( sourcesContentByPath, sourceMapByPath );
	return node.isOriginalSource ? null : new Chain( node, sourcesContentByPath );
}

function init ( file, options = {} ) {
	const node = new Node({ file });

	let sourcesContentByPath = {};
	let sourceMapByPath = {};

	if ( options.content ) {
		Object.keys( options.content ).forEach( key => {
			sourcesContentByPath[ resolve( key ) ] = options.content[ key ];
		});
	}

	if ( options.sourcemaps ) {
		Object.keys( options.sourcemaps ).forEach( key => {
			sourceMapByPath[ resolve( key ) ] = options.sourcemaps[ key ];
		});
	}

	return { node, sourcesContentByPath, sourceMapByPath };
}
