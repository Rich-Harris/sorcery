export function parseOptions ( ...raw_options ) {
	const options = Object.assign({}, ...raw_options );

	if ( options.flatten == null ) {
		options.flatten = 'full';
	}

	options.sourcePathTemplate = options.sourcePathTemplate || '[relative-path]';

	const inline = ( options.inline === true );
	const absolutePath = ( options.absolutePath === true );
	options.sourceMappingURL = inline ? 'inline' : absolutePath ? '[absolute-path]' : options.sourceMappingURL || '[relative-path]';

	return options;
}
