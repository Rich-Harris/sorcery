import * as crc32 from 'buffer-crc32';
import * as vlq from 'vlq';

let cache = {};

function decodeSegments ( encodedSegments ) {
	let i = encodedSegments.length;
	let segments = new Array( i);

	while ( i-- ) {
		segments[i] = vlq.decode( encodedSegments[i] );
	}

	return segments;
}

export default function decodeMappings ( mappings ) {
	let checksum = crc32( mappings );

	if ( !cache[ checksum ] ) {
		let sourceFileIndex = 0;   // second field
		let sourceCodeLine = 0;    // third field
		let sourceCodeColumn = 0;  // fourth field
		let nameIndex = 0;         // fifth field

		let lines = mappings.split( ';' );
		let numLines = lines.length;
		let decoded = new Array( numLines );

		let i, j, line, generatedCodeColumn, decodedLine, segments, segment, result;

		for ( i = 0; i < numLines; i += 1 ) {
			line = lines[i];

			generatedCodeColumn = 0; // first field - reset each time
			decodedLine = [];

			segments = decodeSegments( line.split( ',' ) );

			for ( j = 0; j < segments.length; j += 1 ) {
				segment = segments[j];

				if ( !segment.length ) {
					break;
				}

				generatedCodeColumn += segment[0];

				result = [ generatedCodeColumn ];
				decodedLine.push( result );

				if ( segment.length === 1 ) {
					// only one field!
					break;
				}

				sourceFileIndex  += segment[1];
				sourceCodeLine   += segment[2];
				sourceCodeColumn += segment[3];

				result.push( sourceFileIndex, sourceCodeLine, sourceCodeColumn );

				if ( segment.length === 5 ) {
					nameIndex += segment[4];
					result.push( nameIndex );
				}
			}

			decoded[i] = decodedLine;
		}

		cache[ checksum ] = decoded;
	}

	return cache[ checksum ];
}
