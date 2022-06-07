import { basename, dirname, extname, relative, resolve } from 'path';
import { writeFile, writeFileSync, ensureDir, ensureDirSync } from 'fs-extra';
import { encode } from 'sourcemap-codec';
import { SourceMapProps, SourceMap } from './SourceMap';
import { Stats } from './Stats';
import { Options } from './Options';
import { NodeImpl } from './NodeImpl';
import SOURCEMAPPING_URL, { SOURCEMAP_COMMENT } from './utils/sourceMappingURL';
import { parseOptions } from './Options';
import { slash } from './utils/path';

export class ChainImpl {
    private _node: NodeImpl;
    private _stats: Stats;

    constructor ( node: NodeImpl ) {
        this._node = node;
        this._stats = {
            decodingTime: 0,
            encodingTime: 0,
            tracingTime: 0,
        
            untraceable: 0,
        };
    }

    stats (): Stats {
        return {
            decodingTime: ( this._stats.decodingTime + tally( this._node.sources, 'decodingTime' ) ) / 1e6,
            encodingTime: this._stats.encodingTime / 1e6,
            tracingTime: this._stats.tracingTime / 1e6,

            untraceable: this._stats.untraceable
        };
    }

    apply ( apply_options: Options ): SourceMap | null {
        const options = parseOptions( this._node.context.options, apply_options );

        if (this._node.isOriginalSource || (options && options.flatten === 'existing' && !this._node.isCompleteSourceContent)) {
            return null;
        }

        let allNames = [];
        let allSources = [];

        const applySegment = ( segment, result ) => {
            if ( segment.length < 4 ) return;

            const traced = this._node.sources[ segment[1] ].trace( // source
                segment[2], // source code line
                segment[3], // source code column
                this._node.map.names[ segment[4] ],
                options
            );

            if ( !traced ) {
                this._stats.untraceable += 1;
                return;
            }

            let sourceIndex = allSources.findIndex( ( node ) => node.file === traced.source );
            if ( !~sourceIndex ) {
                sourceIndex = allSources.length;
                allSources.push( this._node.context.cache[traced.source]);
            }

            let newSegment = [
                segment[0], // generated code column
                sourceIndex,
                traced.line - 1,
                traced.column
            ];

            if ( traced.name ) {
                let nameIndex = allNames.indexOf( traced.name );
                if ( !~nameIndex ) {
                    nameIndex = allNames.length;
                    allNames.push( traced.name );
                }

                newSegment[4] = nameIndex;
            }

            result[ result.length ] = newSegment;
        };

        let i = this._node.mappings.length;
        let allMappings;
        if ( options.flatten ) {
            allMappings = new Array( i );
            // Trace mappings
            let tracingStart = process.hrtime();

            let j, line, result;

            while ( i-- ) {
                line = this._node.mappings[i];
                allMappings[i] = result = [];

                for ( j = 0; j < line.length; j += 1 ) {
                    applySegment( line[j], result );
                }
            }

            let tracingTime = process.hrtime( tracingStart );
            this._stats.tracingTime = 1e9 * tracingTime[0] + tracingTime[1];
        }
        else {
            allMappings = this._node.mappings;
            allSources = this._node.sources;
            allNames = this._node.map.names;
        }

        // Encode mappings
        let encodingStart = process.hrtime();
        let mappings = encode( allMappings );
        let encodingTime = process.hrtime( encodingStart );
        this._stats.encodingTime = 1e9 * encodingTime[0] + encodingTime[1];

        const map = new SourceMap({
            version: 3,
            file: basename( this._node.file ),
            sources: allSources.map( ( sourceNode ) => {
                return getSourcePath( this._node, sourceNode.file, options );
            }),
            sourcesContent: allSources.map( ( sourceNode ) => {
                return options.excludeContent ? null : sourceNode.content;
            }),
            names: allNames,
            mappings
        });
        if ( options.sourceRoot ) {
            map.sourceRoot = options.sourceRoot;
        }
        return map;
    }

    trace ( oneBasedLineIndex, zeroBasedColumnIndex, trace_options ) {
        const options = parseOptions( this._node.context.options, trace_options );
        return this._node.trace( oneBasedLineIndex - 1, zeroBasedColumnIndex, null, trace_options );
    }

    write ( dest, write_options ) {
        return writeChain( this, dest, write_options )
            .then( () => {
                // if ( write_options && write_options.recursive ) {
                //     return Promise.all( Object.values( this.nodeCacheByFile )
                //         .filter( ( node ) => node !== this._node )
                //         .map( ( node ) => {
                //             const chain = new Chain( node, this.nodeCacheByFile, write_options );
                //             return writeChain( chain, write_options );
                //         })
                //     );
                // }
            });
    }

    writeSync ( dest, write_options ) {
        writeSyncChain( this, dest, write_options );
        // if ( write_options && write_options.recursive ) {
        //     Object.values( this.nodeCacheByFile )
        //         .filter( ( node ) => node !== this._node )
        //         .map( ( node ) => {
        //             const chain = new Chain( node, this.nodeCacheByFile, write_options );
        //             writeSyncChain( chain, write_options );
        //         });
        // }
    }

    getContentAndMap ( dest: string, write_options?: Options ) {
        if ( typeof dest === 'string' ) {
            write_options = Object.assign(write_options, {});
            write_options.output = dest;
        }
        else if ( typeof dest === 'object' ) {
            write_options = dest;
            write_options.output = this._node.file;
        }
        else {
            write_options = Object.assign(write_options, {});
            write_options.output = this._node.file;
        }

        const resolved = resolve( write_options.output );
        write_options.base = write_options.base ? resolve( write_options.base ) : dirname( resolved );
    
        const options = parseOptions( this._node.context.options, write_options );
    
        const map = this.apply( options );
    
        if ( map ) {
            const url = ( options.sourceMappingURL === 'inline' ) ? map.toUrl() : ( ( options.sourceMappingURL === '[absolute-path]' ) ? resolved : basename( resolved ) ) + '.map';
            // TODO shouldn't url be relative?
            const content = this._node.content && this._node.content.replace( SOURCEMAP_COMMENT, '' ) + sourcemapComment( url, resolved );
            return { resolved, content, map, options };
        }
        else {
            const content = this._node.content && this._node.content.replace( SOURCEMAP_COMMENT, '' );
            return { resolved, content, options };
        }
    }
};

function tally ( nodes, stat ) {
    return nodes.reduce( ( total, node ) => {
        return total + node._stats[ stat ];
    }, 0 );
}

function sourcemapComment ( url, dest ) {
    const ext = extname( dest );
    url = encodeURI( url );

    if ( ext === '.css' ) {
        return `\n/*# ${SOURCEMAPPING_URL}=${url} */\n`;
    }

    return `\n//# ${SOURCEMAPPING_URL}=${url}\n`;
}

function getSourcePath ( node, source, options ) {
    const replacer = {
        '[absolute-path]': source,
        '[relative-path]': relative( options.base || ( node.file ? dirname( node.file ) : '' ), source )
    };
    let sourcePath = options.sourcePathTemplate;
    Object.keys( replacer ).forEach( ( key ) => {
        sourcePath = sourcePath.replace( key, replacer[key]);
    });
    return slash( sourcePath );
}

function writeChain ( chain, dest, write_options ) {
    const { resolved, content, map, options } = chain.getContentAndMap( dest, write_options );
    return ensureDir( dirname( resolved ) )
        .then( () => {
            let promises = [];
            if ( content ) {
                promises.push( writeFile( resolved, content ) );
            }
            if ( map && options.sourceMappingURL !== 'inline' ) {
                promises.push( writeFile( resolved + '.map', map.toString() ) );
            }

            return Promise.all( promises );
        });
}

function writeSyncChain ( chain, dest, write_options ) {
    const { resolved, content, map, options } = chain.getContentAndMap( dest, write_options );
    ensureDirSync( dirname( resolved ) );
    if ( content ) {
        writeFileSync( resolved, content );
    }
    if ( map && options.sourceMappingURL !== 'inline' ) {
        writeFileSync( resolved + '.map', map.toString() );
    }
}

export function writeStream ( stream_node: NodeImpl ) {
    const chain = new ChainImpl( stream_node );
    const { resolved, content, map, options } = chain.getContentAndMap( stream_node.context.options.output );
    if ( map && options.sourceMappingURL !== 'inline' ) {
        ensureDirSync( dirname( resolved ) );
        writeFileSync( resolved + '.map', map.toString() );
    }

    // if ( options && options.recursive ) {
    //     Object.values( nodeCacheByFile )
    //         .filter( ( othernode ) => othernode !== stream_node )
    //         .forEach( ( node ) => {
    //             const chain = new Chain( node, nodeCacheByFile, transform_options );
    //             writeSyncChain( chain, transform_options );
    //         });
    // }

    return content;
}