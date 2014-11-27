#!/usr/bin/env node

var minimist = require( 'minimist' ),
	showHelp = require( './showHelp' ),
	command;

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

else {
	require( './runSorcery' )( command );
}