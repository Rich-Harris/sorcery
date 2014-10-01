var vlq = require( 'vlq' );

module.exports = function ( mappings ) {
	var decoded,
	sourceFileIndex = 0,   // second field
	sourceCodeLine = 0,    // third field
	sourceCodeColumn = 0,  // fourth field
	nameIndex = 0;         // fifth field

	decoded = mappings.split( ';' ).map( function ( line ) {
		var generatedCodeColumn = 0; // first field - reset each time

		return line.split( ',' ).map( vlq.decode ).map( function ( segment ) {
			var result;

			if ( !segment.length ) {
				return segment;
			}

			generatedCodeColumn += segment[0];

			result = [ generatedCodeColumn ];

			if ( segment.length === 1 ) {
				// only one field!
				return result;
			}

			sourceFileIndex  += segment[1];
			sourceCodeLine   += segment[2];
			sourceCodeColumn += segment[3];

			result.push( sourceFileIndex, sourceCodeLine, sourceCodeColumn );

			if ( segment.length === 5 ) {
				nameIndex += segment[4];
				result.push( nameIndex );
			}

			return result;
		});
	});

	return decoded;
};