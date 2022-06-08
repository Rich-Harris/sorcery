export interface Trace {
    /**
    @property {string} source - the filepath of the source
    @property {number} line - the one-based line index
    @property {number} column - the zero-based column index
    @property {string || null} name - the name corresponding
     */
    source: string;
    line: number;
    column: number;
    name: string | null;
}
