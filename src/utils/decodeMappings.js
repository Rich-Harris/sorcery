import * as vlq from 'vlq';

export default function decodeMappings ( mappings ) {
	var decoded,
	sourceFileIndex = 0,   // second field
	sourceCodeLine = 0,    // third field
	sourceCodeColumn = 0,  // fourth field
	nameIndex = 0;         // fifth field

	decoded = mappings.split( ';' ).map( function ( line ) {
		var generatedCodeColumn = 0, // first field - reset each time
			decodedLine = [];

		line.split( ',' ).map( vlq.decode ).forEach( function ( segment ) {
			var result;

			if ( !segment.length ) {
				return;
			}

			generatedCodeColumn += segment[0];

			result = [ generatedCodeColumn ];
			decodedLine.push( result );

			if ( segment.length === 1 ) {
				// only one field!
				return;
			}

			sourceFileIndex  += segment[1];
			sourceCodeLine   += segment[2];
			sourceCodeColumn += segment[3];

			result.push( sourceFileIndex, sourceCodeLine, sourceCodeColumn );

			if ( segment.length === 5 ) {
				nameIndex += segment[4];
				result.push( nameIndex );
			}
		});

		return decodedLine;
	});

	return decoded;
}