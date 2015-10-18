import crc32 from 'buffer-crc32';
import { decode } from 'sourcemap-codec';

let cache = {};

export default function decodeMappings ( mappings ) {
	let checksum = crc32( mappings );

	if ( !cache[ checksum ] ) {
		cache[ checksum ] = decode( mappings );
	}

	return cache[ checksum ];
}
