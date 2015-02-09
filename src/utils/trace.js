export default function trace ( node, zeroBasedLineIndex, zeroBasedColumnIndex, name  ) {
	var segments, line, segment, len, i, parent, leadingWhitespace;

	// If this node doesn't have a source map, we treat it as
	// the original source
	if ( node.isOriginalSource ) {
		return {
			source: node.file,
			line: zeroBasedLineIndex + 1,
			column: zeroBasedColumnIndex,
			name: name
		};
	}

	// Otherwise, we need to figure out what this position in
	// the intermediate file corresponds to in *its* source
	segments = node.mappings[ zeroBasedLineIndex ];

	if ( !segments ) {
		return null;
	}

	if ( zeroBasedColumnIndex === undefined ) {
		// we only have a line to go on. Use the first non-whitespace character
		line = node.lines[ zeroBasedLineIndex ];
		zeroBasedColumnIndex = leadingWhitespace ? leadingWhitespace[0].length : 0;
	}

	len = segments.length;

	for ( i = 0; i < len; i += 1 ) {
		segment = segments[i];

		if ( segment[0] === zeroBasedColumnIndex ) {
			parent = node.sources[ segment[1] ];
			return trace( parent, segment[2], segment[3], node.map.names[ segment[4] ] || name );
		}

		if ( segment[0] > zeroBasedColumnIndex ) {
			return null;
		}
	}
}