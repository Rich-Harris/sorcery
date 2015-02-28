import * as vlq from 'vlq';

function handleLine ( line, offsets ) {
	var generatedCodeColumn = 0;

	let numSegments = line.length;
	let encoded = new Array( numSegments );

	let i, segment, encodedSegment;

	for ( i = 0; i < numSegments; i += 1 ) {
		segment = line[i];

		if ( !segment.length ) {
			encoded[i] = segment;
			return;
		}

		encodedSegment = [ segment[0] - generatedCodeColumn ];
		generatedCodeColumn = segment[0];

		if ( segment.length === 1 ) {
			// only one field!
			return encodedSegment;
		}

		encodedSegment[1] = segment[1] - offsets.sourceFileIndex;
		encodedSegment[2] = segment[2] - offsets.sourceCodeLine;
		encodedSegment[3] = segment[3] - offsets.sourceCodeColumn;

		offsets.sourceFileIndex  = segment[1];
		offsets.sourceCodeLine   = segment[2];
		offsets.sourceCodeColumn = segment[3];

		if ( segment.length === 5 ) {
			encodedSegment[4] = segment[4] - offsets.nameIndex;
			offsets.nameIndex = segment[4];
		}

		encoded[i] = vlq.encode( encodedSegment );
	}

	return encoded.join( ',' );

	/*return line.map( function ( segment ) {
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

		return vlq.encode( result );
	}).join( ',' );*/
}

export default function encodeMappings ( decoded ) {
	let offsets = {
		sourceFileIndex: 0,    // second field
		sourceCodeLine: 0,     // third field
		sourceCodeColumn: 0,   // fourth field
		nameIndex: 0           // fifth field
	};

	let numLines = decoded.length;
	let mappings = new Array( numLines );

	let i, line;

	for ( i = 0; i < numLines; i += 1 ) {
		line = decoded[i];
		mappings[i] = handleLine( line, offsets );
	}

	return mappings.join( ';' );
}
