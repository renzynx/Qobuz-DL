'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { SyncedLyric } from '@/lib/lyrics/lrc';

/**
 * Index of the line the playhead is on: the last stamp at or before
 * `position`, or the first line when the playhead is still ahead of every
 * stamp (a highlight that starts the song rather than blinking in).
 */
export function currentLineIndex(lyrics: SyncedLyric[], position: number): number {
    const passed = lyrics.filter((l) => l.time <= position);
    return passed.length > 0 ? lyrics.indexOf(passed[passed.length - 1]) : 0;
}

type LyricsViewProps = {
    /** Timestamped lines, or null when only plain (unsynced) lyrics exist. */
    syncedLyrics?: SyncedLyric[] | null;
    /** Unsynchronised text, newline-separated, when that is all there is. */
    plain?: string | null;
    /** Playhead in seconds. */
    position: number;
};

/**
 * Renders lyrics with the current line highlighted and kept in view. Which
 * line is current is a pure function of the stamps and the playhead; the
 * scrolling is the only effect, and it fires only when that index moves.
 */
const LyricsView = ({ syncedLyrics, plain, position }: LyricsViewProps) => {
    const currentIndex = useMemo(() => (syncedLyrics ? currentLineIndex(syncedLyrics, position) : -1), [syncedLyrics, position]);
    const currentRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        // `nearest` (not `center`) keeps the first and last lines from
        // scrolling to spurious whitespace at the container's edges.
        currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [currentIndex]);

    if (syncedLyrics) {
        return (
            <div className='flex max-h-64 flex-col gap-2 overflow-y-auto py-2'>
                {syncedLyrics.map((line, index) => (
                    <span
                        key={`${line.time}-${line.line}`}
                        ref={index === currentIndex ? (node) => { currentRef.current = node; } : null}
                        data-current={index === currentIndex ? 'true' : 'false'}
                        className={`text-sm ${index === currentIndex ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                    >
                        {line.line}
                    </span>
                ))}
            </div>
        );
    }

    if (!plain) return null;

    return (
        <div className='flex max-h-64 flex-col gap-2 overflow-y-auto py-2'>
            {plain.split('\n').map((line, index) => (
                <span key={`${index}-${line}`} className='text-sm text-muted-foreground'>
                    {line}
                </span>
            ))}
        </div>
    );
};

export default LyricsView;
