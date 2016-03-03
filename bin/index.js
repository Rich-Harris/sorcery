#!/usr/bin/env node

var path = require( 'path' );
var glob = require( 'glob' );
var minimist = require( 'minimist' );
var sander = require( 'sander' );
var showHelp = require( './showHelp' );
var command;
var sorcery = require( '../' );

command = minimist( process.argv.slice( 2 ), {
	alias: {
		i: 'input',
		o: 'output',
		v: 'version',
		h: 'help',
		d: 'datauri',
		x: 'excludeContent',
        f: 'folder',
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

else if ( !command.input && !command.folder ) {
	console.error( 'Error: You must supply an --input (-i) or --folder (-f) argument. Type sorcery --help for more info' );
}

else if ( command.folder ) {
    function globHandler( error, files ) {
        if ( error ) {
            console.error( `Error: Failed to glob, ${error}` );
            return;
        }
        files.forEach(function ( file ) {
            if ( command.output ) {
                parseFile( file, path.join( command.output, file ) )
                return;
            }
            parseFile( file );
        });
    }
    glob( path.join( command.folder, '/**/*.js' ), globHandler );
}

else {
	parseFile( command.input );
}

function parseFile( inputFile, outputFile ) {
    sander.stat( inputFile ).then( function ( stats ) {
		if ( stats.isDirectory() ) {
			return sander.lsr( inputFile ).then( function ( files ) {
				var promises = files.map( function ( file ) {
					var input = path.join( inputFile, file );
					var output = path.join( outputFile || command.output || inputFile, file );

					return sorcery.load( input ).then( function ( chain ) {
						return chain.write( output, {
							inline: command.datauri,
							includeContent: !command.excludeContent
						});
					});
				});

				return sander.Promise.all( promises );
			});
		}

		return sorcery.load( inputFile ).then( function ( chain ) {
			return chain.write( outputFile || command.output || inputFile, {
				inline: command.datauri,
				includeContent: !command.excludeContent
			});
		});
	}).catch( function ( err ) {
		setTimeout( function () {
			throw err;
		});
	});
}