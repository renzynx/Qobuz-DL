export type SyncedLyric = { time: number; line: string };

/**
 * An LRC body is `[mm:ss.xx] text` lines, optionally with several stamps per
 * line. Anything else — metadata tags like `[ar:...]`, blank lines — carries
 * no timing and is dropped.
 */
const STAMP = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(text: string): SyncedLyric[] {
    const entries: SyncedLyric[] = [];
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const stamps: number[] = [];
        let match: RegExpExecArray | null;
        STAMP.lastIndex = 0;
        while ((match = STAMP.exec(line)) !== null) {
            // The stamp is one decimal number split across mm:ss.ff, so it is
            // rebuilt as one decimal literal before parsing. Summing the parts
            // instead is arithmetically equal but bitwise off: 1 + 0.14
            // accumulates to 1.1400000000000001, which breaks exact equality
            // against a literal. `minutes * 60 + seconds` is an exact integer,
            // so the concatenation stays exact up to the fraction.
            const seconds = Number(match[1]) * 60 + Number(match[2]);
            stamps.push(Number(`${seconds}.${match[3] ?? '0'}`));
        }
        if (stamps.length === 0) continue;
        const words = line.replace(STAMP, '').trim();
        if (!words) continue;
        for (const time of stamps) entries.push({ time, line: words });
    }
    return entries.sort((a, b) => a.time - b.time);
}
