import type { Trace } from './Trace';
import type { SourceMap } from './SourceMap';
import type { Stats } from './Stats';

export interface Chain {
    stats (): Stats;

    apply ( apply_options: any ): SourceMap | null;

    trace ( oneBasedLineIndex: number, zeroBasedColumnIndex: number, trace_options: any ): Trace;

    write ( dest: string, write_options: any ): Promise<void>;
    writeSync ( dest: string, write_options: any ): void;
};

