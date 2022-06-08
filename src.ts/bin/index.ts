#!/usr/bin/env node

var path = require( 'path' );
var minimist = require( 'minimist' );
var fse = require( 'fs-extra' );
var globby = require( 'globby' );
var showHelp = require( './showHelp' );
var command;
var sourcery_map = require( '../' );

command = minimist( process.argv.slice( 2 ), {
    alias: {
        i: 'input',
        o: 'output',
        v: 'version',
        h: 'help',
        d: 'datauri',
        x: 'excludeContent',
        f: 'flatten',
        b: 'base'
    }
});

if ( command.help ) {
    showHelp( process.stdout );
}

else if ( process.argv.length <= 2 && process.stdin.isTTY ) {
    showHelp( process.stderr );
}

else if ( command.version ) {
    console.log( 'Sorcery-map version ' + require( '../package.json' ).version );
}

else if ( !command.input ) {
    console.error( 'Error: You must supply an --input (-i) argument. Type sourcery --help for more info' );
}

else {
    const options = { 
        ...command,
        inline: command.datauri,
        output: command.output || command.input
    };
    fse.stat( options.input ).then( function ( stats ) {
        if ( stats.isDirectory() ) {
            const globby_options = {
                cwd: options.input
            }
            return globby("**/*.js", globby_options)
            .then((files) => {
                return files.reduce( function ( promise, file ) {
                    return promise.then( function () {
                        const input = path.join( options.input, file );
                        const output = path.join( options.output, file );
                        const local_options = Object.assign({}, options, { output });

                        return sourcery_map.load( input, local_options ).then( function ( chain ) {
                            return chain.write( output, local_options );
                        });
                    });
                }, Promise.resolve() );
            });
        }
        else {
            return sourcery_map.load( options.input, options ).then( function ( chain ) {
                return chain.write( options.output, options );
            });
        }
    }).catch( function ( err ) {
        setTimeout( function () {
            throw err;
        });
    });
}
