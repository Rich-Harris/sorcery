/**
 * Traces a segment back to its origin
 * @param {object} node - an instance of Node
 * @param {number} lineIndex - the zero-based line index of the
   segment as found in `node`
 * @param {number} columnIndex - the zero-based column index of the
   segment as found in `node`
 * @param {string || null} - if specified, the name that should be
   (eventually) returned, as it is closest to the generated code
 * @returns {object}
     @property {string} source - the filepath of the source
     @property {number} line - the one-based line index
     @property {number} column - the zero-based column index
     @property {string || null} name - the name corresponding
     to the segment being traced
 */
export default function trace ( node, lineIndex, columnIndex, name  ) {
	var segments, line, segment, len, i, parent, leadingWhitespace;

	// If this node doesn't have a source map, we treat it as
	// the original source
	if ( node.isOriginalSource ) {
		return {
			source: node.file,
			line: lineIndex + 1,
			column: columnIndex,
			name: name
		};
	}

	// Otherwise, we need to figure out what this position in
	// the intermediate file corresponds to in *its* source
	segments = node.mappings[ lineIndex ];

	if ( !segments ) {
		return null;
	}

	if ( columnIndex === undefined ) {
		// we only have a line to go on. Use the first non-whitespace character
		line = node.lines[ lineIndex ];
		columnIndex = leadingWhitespace ? leadingWhitespace[0].length : 0;
	}

	len = segments.length;

	for ( i = 0; i < len; i += 1 ) {
		segment = segments[i];

		if ( segment[0] === columnIndex ) {
			parent = node.sources[ segment[1] ];
			return trace( parent, segment[2], segment[3], node.map.names[ segment[4] ] || name );
		}

		if ( segment[0] > columnIndex ) {
			return null;
		}
	}
}