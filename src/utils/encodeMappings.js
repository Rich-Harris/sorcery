import { encode } from 'vlq';

export default function encodeMappings ( decoded ) {
	let offsets = {
		generatedCodeColumn: 0,
		sourceFileIndex: 0,   // second field
		sourceCodeLine: 0,    // third field
		sourceCodeColumn: 0,  // fourth field
		nameIndex: 0          // fifth field
	};

	return decoded.map( function ( line ) {
		offsets.generatedCodeColumn = 0; // first field - reset each time
		return line.map( encodeSegment ).join( ',' );
	}).join( ';' );

	function encodeSegment ( segment ) {
		if ( !segment.length ) {
			return segment;
		}

		let result = new Array( segment.length );

		result[0] = segment[0] - offsets.generatedCodeColumn;
		offsets.generatedCodeColumn = segment[0];

		if ( segment.length === 1 ) {
			// only one field!
			return result;
		}

		result[1] = segment[1] - offsets.sourceFileIndex;
		result[2] = segment[2] - offsets.sourceCodeLine;
		result[3] = segment[3] - offsets.sourceCodeColumn;

		offsets.sourceFileIndex  = segment[1];
		offsets.sourceCodeLine   = segment[2];
		offsets.sourceCodeColumn = segment[3];

		if ( segment.length === 5 ) {
			result[4] = segment[4] - offsets.nameIndex;
			offsets.nameIndex = segment[4];
		}

		return encode( result );
	}
}
