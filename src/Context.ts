import * as path from 'path';

import { NodeImpl } from './NodeImpl';
import { Options, parseOptions } from './Options';
// import { manageFileProtocol } from './utils/path';

export interface NodeCacheByFile {
    [file: string]: NodeImpl;
}

export class Context {
    private _nodeCacheByFile: NodeCacheByFile;
    private _sourceRoots: string[];
    private _options: Options;

    constructor(options: Options) {
        this._options = parseOptions(options);
        this._nodeCacheByFile = {};
        this._sourceRoots = [];

        const sourceRoots = new Set<string>();

        // this._options.input = this._options.input ? path.resolve(manageFileProtocol(this._options.input)) : null;
        // if (this._options.input) {
        //     sourceRoots.add(path.dirname(this._options.input));
        // }
        if (this._options.sourceRootResolution) {
            sourceRoots.add(path.resolve(this._options.sourceRootResolution));
        }
        sourceRoots.add(path.resolve());

        // "Set" keep insertion order
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/@@iterator
        this._sourceRoots = Array.from(sourceRoots);

        if (this._options.content) {
            Object.keys(this._options.content).forEach(key => {
                const file = path.resolve(key);
                const content = this._options.content[key];
                NodeImpl.Create(this, file, content);
            });
        }
        if (this._options.sourcemaps) {
            Object.keys(this._options.sourcemaps).forEach(key => {
                const file = path.resolve(key);
                const map = this._options.sourcemaps[key];
                NodeImpl.Create(this, file, undefined, map);
            });
        }
    }

    get cache() {
        return this._nodeCacheByFile;
    }

    addSourceRoot(sourceRoot: string) {
        const sourceRoots = new Set<string>(this._sourceRoots);
        sourceRoots.add(sourceRoot);
        this._sourceRoots = Array.from(sourceRoots);
    }

    removeSourceRoot(sourceRoot: string) {
        const sourceRoots = new Set<string>(this._sourceRoots);
        sourceRoots.delete(sourceRoot);
        this._sourceRoots = Array.from(sourceRoots);
    }

    get sourceRoots() {
        return this._sourceRoots;
    }

    get options() {
        return this._options;
    }
}
