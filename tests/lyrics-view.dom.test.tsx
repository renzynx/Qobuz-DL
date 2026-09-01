import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, cleanup, screen } from '@testing-library/react';
import LyricsView from '@/components/player/lyrics-view';
import type { SyncedLyric } from '@/lib/lyrics/lrc';

const lyrics: SyncedLyric[] = [
    { time: 1, line: 'a' },
    { time: 5, line: 'b' }
];

/** jsdom implements no scrolling, so the browser behaviour is mocked here. */
const scrollIntoView = vi.fn();
beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
    cleanup();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    scrollIntoView.mockClear();
});

describe('LyricsView', () => {
    it('highlights the last line whose time has passed', () => {
        render(<LyricsView syncedLyrics={lyrics} position={6} />);

        const current = screen.getByText('b');
        expect(current.getAttribute('data-current')).toBe('true');
        expect(screen.getByText('a').getAttribute('data-current')).toBe('false');
    });

    it('highlights the first line before any later time is reached', () => {
        render(<LyricsView syncedLyrics={lyrics} position={0} />);

        // The first line is stamped at 1s; at 0s nothing has passed yet, so
        // the first line carries the highlight as the upcoming line.
        expect(screen.getByText('a').getAttribute('data-current')).toBe('true');
    });

    it('highlights a line exactly at its stamp, not only before it', () => {
        // At 5s the line stamped 5 is the one being sung; `<=` vs `<` is the
        // whole difference between this and highlighting the previous line.
        render(<LyricsView syncedLyrics={lyrics} position={5} />);

        expect(screen.getByText('b').getAttribute('data-current')).toBe('true');
        expect(screen.getByText('a').getAttribute('data-current')).toBe('false');
    });

    it('auto-scrolls to the current line when the highlight moves', async () => {
        const { rerender } = render(<LyricsView syncedLyrics={lyrics} position={1} />);
        scrollIntoView.mockClear();

        rerender(<LyricsView syncedLyrics={lyrics} position={6} />);
        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        // The exact options are the browser's business; that the container
        // was asked to scroll at all is the wiring this pins.
        expect(scrollIntoView).toHaveBeenCalled();
    });

    it('does not scroll again while the highlighted line is unchanged', async () => {
        const { rerender } = render(<LyricsView syncedLyrics={lyrics} position={6} />);
        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });
        scrollIntoView.mockClear();

        rerender(<LyricsView syncedLyrics={lyrics} position={6.2} />);
        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('renders a plain-text block when only unsynced lyrics exist', () => {
        render(<LyricsView plain={'line one\nline two'} position={0} />);

        expect(screen.getByText('line one')).toBeTruthy();
        expect(screen.getByText('line two')).toBeTruthy();
        expect(document.querySelector('[data-current]')).toBeNull();
    });

    it('renders nothing when there are no lyrics at all', () => {
        render(<LyricsView plain={null} position={0} />);

        expect(screen.queryByText('a')).toBeNull();
    });
});
