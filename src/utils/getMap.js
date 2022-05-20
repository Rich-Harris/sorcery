import getMapFromUrl from './getMapFromUrl.js';
import getSourceMappingUrl from './getSourceMappingUrl.js';

export default function getMap ( node, sourceMapByPath, sync ) {
	// 'undefined' never seen
	// 'null' seen but empty
	const map = sourceMapByPath[ node.file ];
	if ( map !== undefined  ) {
		return sync ? map : Promise.resolve( map );
	}
	const url = getSourceMappingUrl( node.content );
	if ( !url ) {
		sourceMapByPath[ node.file ] = null;
		return sync ? null : Promise.resolve( null );
	}
	if (sync) {
		const map = getMapFromUrl( url, node.file, sync );
		return sourceMapByPath[ node.file ] = map;
	}
	else {
		return getMapFromUrl( url, node.file, sync )
		.then((map) => {
			return sourceMapByPath[ node.file ] = map;
		});
	}
}
