import btoa from './utils/btoa';

export interface SourceMapProps {
    version: 3;

    file: string;
    sources: string[];
    sourcesContent: string[]; 
    names: string[];
    mappings: string;
    sourceRoot?: string;
}

export class SourceMap {
    version: 3;

    file: string;
    sources: string[];
    sourcesContent: string[]; 
    names: string[];
    mappings: string;
    sourceRoot: string;
    
    constructor ( sourceMap: SourceMapProps ) {
        Object.assign(this, sourceMap);
    }

    toString () {
        return JSON.stringify( this );
    }

    toUrl () {
        return 'data:application/json;charset=utf-8;base64,' + btoa( this.toString() );
    }
};
