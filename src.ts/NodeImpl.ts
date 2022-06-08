import { resolve, dirname } from 'path';
import { decode, SourceMapMappings } from 'sourcemap-codec';
import { getMap, getMapSync } from './utils/getMap';
import { getContent, getContentSync } from './utils/getContent';
import { existsSync } from 'fs-extra';

import type { Node } from './Node';
import type { Trace } from './Trace';
import type { Options } from './Options';
import { manageFileProtocol } from './utils/path';
import type { Context } from './Context';
import type { SourceMapProps } from './SourceMap';

export class NodeImpl implements Node {
    static Create(context: Context, file: string, content?: string, map?: SourceMapProps): NodeImpl {
        let node: NodeImpl;
        file = file ? resolve(manageFileProtocol(file)) : null;
        if (file) {
            let node = context.cache[file];
            if (node) {
                if (node._content === undefined) {
                    node._content = content;
                }
            }
            else {
                node = new NodeImpl(context, file, content);
                context.cache[file] = node;
            }
        }
        else if (content) {
            node = new NodeImpl(context, undefined, content);
        }
        else {
            throw new Error('A source must specify either file or content');
        }
        node._map = map;
        return node;
    }

    private _context: Context;
    private _content: string;
    private _file: string;
    private _map: SourceMapProps;
    private _mappings: SourceMapMappings;
    private _sources: NodeImpl[];
    private _decodingTime: number;

    private constructor(context: Context, file: string, content: string) {
        this._context = context;

        this._file = file;
        this._content = content || undefined; // sometimes exists in sourcesContent, sometimes doesn't

        // these get filled in later
        this._map = undefined;
        this._mappings = null;
        this._sources = null;

        this._decodingTime = 0;
    }

    get context() {
        return this._context;
    }

    get content() {
        return this._content;
    }

    get sources() {
        return this._sources;
    }

    get file() {
        return this._content;
    }

    get map() {
        return this._map;
    }

    get decodingTime() {
        return this._decodingTime;
    }

    get mappings() {
        return this._mappings;
    }

    get isOriginalSource() {
        return (this._map == null);
    }

    get isCompleteSourceContent() {
        if (this.isOriginalSource) {
            return true;
        }
        return (this._sources == null) || this._sources.some((node) => node._content == null);
    }

    load(): Promise<void> {
        return getContent(this).then(content => {
            this._content = content;
            if (content == null) {
                return;
            }

            return getMap(this).then(map => {
                this._map = map;
                if (map == null) {
                    return;
                }
                this.resolveMap();

                return Promise.all(this._sources.map(node => node.load()))
                .then(() => {});
            });
        });
     }

    loadSync(): void {
        this._content = getContentSync(this);
        if (this._content != null) {
            this._map = getMapSync(this);
            if (this._map != null) {
                this.resolveMap();
                this._sources.forEach(node => node.loadSync());
            }
        }
    }

    trace(lineIndex: number, columnIndex: number, name?: string, options?: Options): Trace {
        // If this node doesn't have a source map, we have
        // to assume it is the original source
        if (this.isOriginalSource || (options && options.flatten === 'existing' && !this.isCompleteSourceContent)) {
            return {
                source: this._file,
                line: lineIndex + 1,
                column: columnIndex || 0,
                name: name
            };
        }

        // Otherwise, we need to figure out what this position in
        // the intermediate file corresponds to in *its* source
        const segments = this._mappings[lineIndex];

        if (!segments || segments.length === 0) {
            return null;
        }

        if (columnIndex != null) {
            let len = segments.length;
            let i;

            for (i = 0; i < len; i += 1) {
                let generatedCodeColumn = segments[i][0];

                if (generatedCodeColumn > columnIndex) {
                    break;
                }

                if (generatedCodeColumn === columnIndex) {
                    if (segments[i].length < 4) return null;

                    let sourceFileIndex = segments[i][1] || 0;
                    let sourceCodeLine = segments[i][2] || 0;
                    let sourceCodeColumn = segments[i][3] || 0;
                    let nameIndex = segments[i][4] || 0;

                    let parent = this._sources[sourceFileIndex];
                    return parent.trace(sourceCodeLine, sourceCodeColumn, this._map.names[nameIndex] || name, options);
                }
            }
        }

        // fall back to a line mapping
        let sourceFileIndex = segments[0][1] || 0;
        let sourceCodeLine = segments[0][2] || 0;
        let nameIndex = segments[0][4] || 0;

        let parent = this._sources[sourceFileIndex];
        return parent.trace(sourceCodeLine, null, this._map.names[nameIndex] || name, options);
    }

    resolveMap() {
        const map = this._map;

        // Browserify or similar tools when inlining the map, set the file to a generic name like "generated.js"
        // We restore the proper name here
        map.file = this._file || map.file;

        let hrDecodingStart = process.hrtime();
        this._mappings = decode(map.mappings);
        let hrDecodingTime = process.hrtime(hrDecodingStart);
        this._decodingTime = 1e9 * hrDecodingTime[0] + hrDecodingTime[1];

        const sourcesContent = map.sourcesContent || [];

        const mapSourceRoot = map.sourceRoot ? manageFileProtocol(map.sourceRoot) : '';
        var sourceRoots = this._context.sourceRoots.map((sourceRoot) => resolve(sourceRoot, mapSourceRoot));
        if (this._file) {
            sourceRoots.unshift(resolve(dirname(this._file), mapSourceRoot));
        }

        this._sources = map.sources.map((source, i) => {
            const content = (sourcesContent[i] == null) ? undefined : sourcesContent[i];
            if (source) {
                const fileResolved = sourceRoots
                    .map((sourceRoot) => {
                        return resolve(sourceRoot, source);
                    });
                    source = fileResolved.find(existsSync) || fileResolved[0];
            }
            return NodeImpl.Create(this._context, source, content);
        });
    }
}
