#!/usr/bin/env node

import * as path from 'path';
import * as minimist from 'minimist';
import * as fse from 'fs-extra';
import * as globby from 'globby';
import { injectVersion } from './showHelp';
import * as sourcery_map from '../';
import type { Options } from '../Options';

const command = minimist( process.argv.slice( 2 ), {
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
    injectVersion( process.stdout );
}

else if ( process.argv.length <= 2 && process.stdin.isTTY ) {
    injectVersion( process.stderr );
}

else if ( command.version ) {
    console.log( 'Sorcery-map version ' + require( '../package.json' ).version );
}

else if ( !command.input ) {
    console.error( 'Error: You must supply an --input (-i) argument. Type sourcery --help for more info' );
}

else {
    const options: Options = { 
        ...command,
        input: command.input,
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
                return files.reduce( ( promise, file ) => {
                    return promise.then( function () {
                        const input = path.join( options.input, file );
                        const output = path.join( options.output, file );
                        const local_options = Object.assign({}, options, { output, input });

                        return sourcery_map.load( input, local_options ).then( ( chain ) => {
                            return chain.write( output, local_options );
                        });
                    });
                }, Promise.resolve() );
            });
        }
        else {
            return sourcery_map.load( options.input, options ).then( ( chain ) => {
                return chain.write( options.output, options );
            });
        }
    })
    .catch( (err: any ) => {
        setTimeout( () => {
            throw err;
        });
    });
}
