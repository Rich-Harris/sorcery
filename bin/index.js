#!/usr/bin/env node

var minimist = require( 'minimist' ),
	showHelp = require( './showHelp' ),
	command,
	sorcery = require( '../' );

command = minimist( process.argv.slice( 2 ), {
	alias: {
		i: 'input',
		o: 'output',
		v: 'version',
		h: 'help',
		d: 'datauri',
		x: 'exclude'
	}
});

if ( command.help ) {
	showHelp( process.stdout );
}

else if ( process.argv.length <= 2 && process.stdin.isTTY ) {
	showHelp( process.stderr );
}

else if ( command.version ) {
	console.log( 'Sorcery version ' + require( '../package.json' ).version );
}

else if ( !command.input ) {
	console.error( 'Error: You must supply an --input (-i) argument. Type sorcery --help for more info' );
}

else {
	sorcery.load( command.input ).then( function ( chain ) {
		return chain.write( command.output || command.input, {
			inline: command.datauri,
			includeContent: !command.excludeContent
		});
	}).catch( function ( err ) {
		setTimeout( function () {
			throw err;
		});
	});
}