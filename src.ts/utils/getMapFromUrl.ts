import { dirname, resolve } from 'path';
import { readFile, readFileSync } from 'fs-extra';
import atob from './atob.js';
import { SOURCEMAPPING_URL } from './getSourceMappingUrl';
import { SourceMapProps } from '../SourceMap';

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 * see chromium:\src\third_party\devtools-frontend\src\front_end\core\sdk\SourceMap.ts
 * see \webpack\source-map-loader\dist\index.js
 */
function parseJSON ( json: string, url: string ) {
    try {
        return JSON.parse( json.replace( /^\)]}'[^\n]*\n/, '' ) );
    } catch ( err ) {
        throw new Error( `Could not parse sourcemap (${url}): ${err.message}` );
    }
}

function getMapFromBase64(url: string, base: string): SourceMapProps | null {
    if ( /^data:/.test( url ) ) { // TODO beef this up
        const match = /base64,(.+)$/.exec( url );
        if ( !match ) {
            throw new Error( `${SOURCEMAPPING_URL} is not base64-encoded` );
        }
        const json = atob( match[1]);
        try {
            const map = parseJSON( json, ( 'data URI in ' + base ) );
            return map;
        }
        catch ( err ) {
            return null;
        }
    }
}

export function getMapFromUrl ( url: string, base: string ): Promise<SourceMapProps | null> {
    const map = getMapFromBase64(url, base);
    if (map) {
        return Promise.resolve(map);
    }
    url = resolve( dirname( base ), decodeURI( url ) );
    return readFile( url, { encoding: 'utf-8' }).then( json => parseJSON( json, url ) ).catch( () => null );
}

export function getMapFromUrlSync ( url: string, base: string ): SourceMapProps | null {
    const map = getMapFromBase64(url, base);
    if (map) {
        return map;
    }
    url = resolve( dirname( base ), decodeURI( url ) );
    try {
        return parseJSON( readFileSync( url, { encoding: 'utf-8' }), url );
    }
	catch ( e ) {
        return null;
    }
}