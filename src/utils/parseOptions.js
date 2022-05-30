export function parseLoadOptions ( raw_options ) {
	const options = Object.assign({}, raw_options );

	if ( options.flatten == null ) {
		options.flatten = 'full';
	}
	return options;
}

export function parseChainOptions ( raw_options ) {
	const options = parseLoadOptions( raw_options );

	options.sourcePathTemplate = options.sourcePathTemplate || '[relative-path]';

	if ( options.sourceMappingURL == null ) {
		const inline = ( options.inline === true );
		const absolutePath = ( options.absolutePath === true );
		options.sourceMappingURL = inline ? 'inline' : absolutePath ? '[absolute-path]' : '[relative-path]';
	}

	return options;

}