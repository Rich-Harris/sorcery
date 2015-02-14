var separator = /[\/\\]/;

export default function getRelativePath ( from, to ) {
	var fromParts, toParts, i;

	fromParts = from.split( separator );
	toParts = to.split( separator );

	fromParts.pop(); // get dirname

	while ( fromParts[0] === toParts[0] ) {
		fromParts.shift();
		toParts.shift();
	}

	if ( fromParts.length ) {
		i = fromParts.length;
		while ( i-- ) fromParts[i] = '..';
	}

	return fromParts.concat( toParts ).join( '/' );
}
