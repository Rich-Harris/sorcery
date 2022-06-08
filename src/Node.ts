import type { SourceMapProps } from './SourceMap';
import type { Options } from './Options';
import type { Trace } from './Trace';

export interface Node {
    readonly isOriginalSource: boolean;
    readonly isCompleteSourceContent: boolean;

    readonly content: string;
    readonly map: SourceMapProps;
    readonly file: string; 

    load (): Promise<void>;
    loadSync (): void;

    /**
     * Traces a segment back to its origin
     * @param {number} lineIndex - the zero-based line index of the
       segment as found in `this`
     * @param {number} columnIndex - the zero-based column index of the
       segment as found in `this`
     * @param {string || null} - if specified, the name that should be
       (eventually) returned, as it is closest to the generated code
     * @returns {object}
         @property {string} source - the filepath of the source
         @property {number} line - the one-based line index
         @property {number} column - the zero-based column index
         @property {string || null} name - the name corresponding
         to the segment being traced
     */
    trace ( lineIndex: number, columnIndex: number, name?: string, options?: Options ): Trace;
}