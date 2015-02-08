import * as vlq from 'vlq';

export default function encodeMappings ( decoded ) {
	var mappings,
		sourceFileIndex = 0,   // second field
		sourceCodeLine = 0,    // third field
		sourceCodeColumn = 0,  // fourth field
		nameIndex = 0;         // fifth field

	mappings = decoded.map( function ( line ) {
		var generatedCodeColumn = 0; // first field - reset each time

		return line.map( function ( segment ) {
			var result;

			if ( !segment.length ) {
				return segment;
			}

			result = [ segment[0] - generatedCodeColumn ];
			generatedCodeColumn = segment[0];

			if ( segment.length === 1 ) {
				// only one field!
				return result;
			}

			result[1] = segment[1] - sourceFileIndex;
			result[2] = segment[2] - sourceCodeLine;
			result[3] = segment[3] - sourceCodeColumn;

			sourceFileIndex  = segment[1];
			sourceCodeLine   = segment[2];
			sourceCodeColumn = segment[3];

			if ( segment.length === 5 ) {
				result[4] = segment[4] - nameIndex;
				nameIndex = segment[4];
			}

			return vlq.encode( result );
		}).join( ',' );
	}).join( ';' );

	return mappings;
}