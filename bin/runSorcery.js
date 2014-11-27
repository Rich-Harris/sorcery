var path = require( 'path' ),
	sander = require( 'sander' ),
	sorcery = require( '../' ),
	showHelp = require( './showHelp' );

var pattern = /\/\/#\s*sourceMappingURL=([^\s]+)/;

module.exports = function ( command ) {
	if ( !command.input ) {
		console.error( 'Error: You must supply an --input (-i) argument. Type sorcery --help for more info' );
		return;
	}

	sorcery.load( command.input ).then( function ( chain ) {
		var map, outputFile, outputMapFile, url;

		map = chain.apply({
			includeContent: !command.excludeContent
		});

		outputFile = command.output || command.input;
		outputMapFile = outputFile + '.map';
		url = command.datauri ? map.toUrl() : path.basename( outputMapFile );

		content = chain.content.replace( pattern, function ( match, $1 ) {
			return match.replace( $1, url );
		});

		sander.writeFile( outputFile, content );

		if ( !command.datauri ) {
			sander.writeFile( outputMapFile, map.toString() );
		}
	}).catch( function ( err ) {
		setTimeout( function () {
			throw err;
		});
	});
};