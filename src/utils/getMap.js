import getMapFromUrl from './getMapFromUrl.js';
import getSourceMappingUrl from './getSourceMappingUrl.js';

export default function getMap ( node, sync ) {
	// 'undefined' never seen
	// 'null' seen but empty
	const map = node.map;
	if ( map !== undefined ) {
		return sync ? map : Promise.resolve( map );
	}
	const url = getSourceMappingUrl( node.content );
	if ( !url ) {
		return sync ? null : Promise.resolve( null );
	}
	return getMapFromUrl( url, node.file, sync );
}
