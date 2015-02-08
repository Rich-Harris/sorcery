export default function getSourceMappingUrl ( str ) {
	var index, substring, url, match;

	// assume we want the last occurence
	index = str.lastIndexOf( 'sourceMappingURL' );

	if ( index === -1 ) {
		return null;
	}

	substring = str.substring( index + 17 );
	match = /^\S+/.exec( substring );

	url = match ? match[0] : null;
	return url;
}