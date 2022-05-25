export function parseLoadOptions ( raw_options ) {
	const options = Object.assign({}, raw_options );

	if ( options.flatten == null ) {
		const existingContentOnly = ( options.existingContentOnly === false );
		options.flatten = existingContentOnly ? 'existing' : 'full';
	}
	return options;
}

export function parseChainOptions ( raw_options ) {
	const options = parseLoadOptions( raw_options );

	// default values + mapping former options => new options
	if ( options.sourcePathTemplate == null ) {
		if ( options.base ) {
			options.sourcePathTemplate = '[base-path]';
		}
		else {
			options.sourcePathTemplate = '[relative-path]';
		}
	}

	if ( options.sourceMappingStorage == null ) {
		const inline = ( options.inline === false );
		const absolutePath = ( options.absolutePath === false );
		options.sourceMappingStorage = inline ? 'inline' : absolutePath ? '[absolute-path]' : '[relative-path]';
	}

	return options;

}