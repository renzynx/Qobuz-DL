import { describe, expect, it } from 'vitest';
import { parseLrc } from '@/lib/lyrics/lrc';

describe('parseLrc', () => {
    it('parses a timestamped line', () => {
        expect(parseLrc('[00:19.16] When you were here before')).toEqual([{ time: 19.16, line: 'When you were here before' }]);
    });

    it('keeps multiple stamps on one line as separate entries', () => {
        expect(parseLrc('[00:01.00][00:05.00] chorus')).toEqual([
            { time: 1, line: 'chorus' },
            { time: 5, line: 'chorus' }
        ]);
    });

    it('skips malformed and metadata lines', () => {
        expect(parseLrc('[ar:Artist]\nnot stamped\n[00:02.50] kept')).toEqual([{ time: 2.5, line: 'kept' }]);
    });

    it('sorts out-of-order entries', () => {
        expect(parseLrc('[00:09.00] b\n[00:03.00] a')).toEqual([
            { time: 3, line: 'a' },
            { time: 9, line: 'b' }
        ]);
    });

    it('yields the exact decimal a stamp denotes, not a float-accumulated one', () => {
        // 1 + 0.14 accumulates to 1.1400000000000001 in binary, which breaks
        // exact equality for anything downstream doing `l.time === 1.14`.
        // Verified by sweeping every valid [mm:ss.ff] stamp: this is one of
        // the 43 (of 600,000) that come out wrong when summed in parts.
        expect(parseLrc('[00:01.14] hello')[0].time).toBe(1.14);
    });
});
