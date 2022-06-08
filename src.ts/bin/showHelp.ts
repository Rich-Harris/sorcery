import * as path from 'path';
import * as fse from 'fs-extra';

export function injectVersion( stream: NodeJS.WriteStream ) {
    fse.readFile( path.join( __dirname, 'help.md' ), ( err, result ) => {
        var help;

        if ( err ) throw err;

        help = result.toString().replace( '<%= version %>', require( '../../package.json' ).version );
        ( stream || process.stderr ).write( '\n' + help + '\n' );
    });
};