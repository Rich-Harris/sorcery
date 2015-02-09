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
	var segments;

	// If this node doesn't have a source map, we have
	// to assume it is the original source
	if ( node.isOriginalSource ) {
		return {
			source: node.file,
			line: lineIndex + 1,
			column: columnIndex || 0,
			name: name
		};
	}

	// Otherwise, we need to figure out what this position in
	// the intermediate file corresponds to in *its* source
	segments = node.mappings[ lineIndex ];

	if ( !segments || segments.length === 0 ) {
		return null;
	}

	if ( columnIndex != null ) {
		let len = segments.length;
		let i;

		for ( i = 0; i < len; i += 1 ) {
			let [
				generatedCodeColumn,
				sourceFileIndex,
				sourceCodeLine,
				sourceCodeColumn,
				nameIndex
			] = segments[i];

			if ( generatedCodeColumn === columnIndex ) {
				let parent = node.sources[ sourceFileIndex ];
				return trace( parent, sourceCodeLine, sourceCodeColumn, node.map.names[ nameIndex ] || name );
			}

			if ( generatedCodeColumn > columnIndex ) {
				break;
			}
		}
	}

	// fall back to a line mapping
	let [
		generatedCodeColumn,
		sourceFileIndex,
		sourceCodeLine,
		sourceCodeColumn,
		nameIndex
	] = segments[0];

	let parent = node.sources[ sourceFileIndex ];
	return trace( parent, sourceCodeLine, null, node.map.names[ nameIndex ] || name );
}