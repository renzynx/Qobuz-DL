import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { act, render, cleanup, fireEvent, screen } from '@testing-library/react';
import { useEffect } from 'react';
import PlayerSheet from '@/components/player/player-sheet';
import { PlayerProvider, usePlayer, usePlayerPosition } from '@/lib/player/context';
import { CountryProvider } from '@/lib/country-provider';
import type { QobuzTrack } from '@/lib/qobuz-dl';

const toastErrors: string[] = [];
vi.mock('sonner', () => ({
    toast: {
        error: (message: string) => {
            toastErrors.push(message);
            return 'id';
        }
    }
}));

/** jsdom ships no media playback; play/pause and `paused` are filled in. */
const mediaPrototypes = { play: undefined as unknown, pause: undefined as unknown, paused: undefined as unknown };

beforeAll(() => {
    const element = window.HTMLMediaElement.prototype as unknown as Record<string, unknown>;
    mediaPrototypes.play = element.play;
    mediaPrototypes.pause = element.pause;
    mediaPrototypes.paused = Object.getOwnPropertyDescriptor(element, 'paused');

    const pausedByElement = new WeakMap<object, boolean>();
    Object.defineProperty(element, 'paused', {
        configurable: true,
        get(this: object) {
            return pausedByElement.get(this) ?? true;
        }
    });
    Object.defineProperty(element, 'play', {
        configurable: true,
        value: function (this: HTMLAudioElement) {
            pausedByElement.set(this, false);
            return Promise.resolve();
        }
    });
    Object.defineProperty(element, 'pause', {
        configurable: true,
        value: function (this: HTMLAudioElement) {
            pausedByElement.set(this, true);
            this.dispatchEvent(new Event('pause'));
        }
    });

    Object.defineProperty(window, 'MediaMetadata', {
        configurable: true,
        writable: true,
        value: class {
            constructor(init: Record<string, unknown>) {
                Object.assign(this, init);
            }
        }
    });
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, writable: true, value: { metadata: null } });

    // jsdom ships no ResizeObserver, and Radix's slider sizes its track with
    // one — without this stand-in the sheet crashes before it renders.
    class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: ResizeObserverStub });

    // jsdom implements no pointer capture either, and Radix's slider holds a
    // drag through it: move events are ignored unless the element reports
    // capture. Element sizes are 0 in jsdom, so the track is measured by the
    // handler as width 0; the stub keeps capture bookkeeping honest while the
    // drag position is supplied by the test below.
    const captured = new WeakMap<object, Set<number>>();
    const proto = Element.prototype as unknown as Record<string, unknown>;
    Object.defineProperty(proto, 'setPointerCapture', {
        configurable: true,
        writable: true,
        value: function (this: Element, id: number) {
            const set = captured.get(this) ?? new Set<number>();
            set.add(id);
            captured.set(this, set);
        }
    });
    Object.defineProperty(proto, 'hasPointerCapture', {
        configurable: true,
        writable: true,
        value: function (this: Element, id: number) {
            return captured.get(this)?.has(id) ?? false;
        }
    });
    Object.defineProperty(proto, 'releasePointerCapture', {
        configurable: true,
        writable: true,
        value: function (this: Element, id: number) {
            captured.get(this)?.delete(id);
        }
    });
});

afterAll(() => {
    const element = window.HTMLMediaElement.prototype as unknown as Record<string, unknown>;
    Object.defineProperty(element, 'play', { configurable: true, value: mediaPrototypes.play });
    Object.defineProperty(element, 'pause', { configurable: true, value: mediaPrototypes.pause });
    Object.defineProperty(element, 'paused', mediaPrototypes.paused as PropertyDescriptor);
});

const track = {
    id: 1,
    title: 't1',
    streamable: true,
    duration: 100,
    performer: { name: 'Artist One', id: 99 },
    album: { id: '10', title: 'Album', image: { small: 's', large: 'l' } }
} as unknown as QobuzTrack;

const settle = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => {
    for (let i = 0; i < 10; i++) await settle();
};

const unwrapMock = vi
    .fn()
    .mockImplementation((path: string, options?: { params?: Record<string, unknown> }) =>
        path.includes('album')
            ? Promise.resolve({ id: '10', tracks: { items: [track, { ...track, id: 2, title: 't2' }] } })
            : Promise.resolve({ url: `https://cdn.example.com/stream?id=${String(options?.params?.track_id ?? '?')}` })
    );

vi.mock('@/lib/api/client', () => ({
    getApiClient: () => ({
        unwrap: unwrapMock,
        routes: { album: '/api/get-album', download: '/api/download-music' }
    })
}));

let hook: ReturnType<typeof usePlayer> | null = null;
let positionHook: ReturnType<typeof usePlayerPosition> | null = null;
const Probe = () => {
    const value = usePlayer();
    const position = usePlayerPosition();
    useEffect(() => {
        hook = value;
        positionHook = position;
    });
    return null;
};

const audio = () => document.querySelector('audio')!;

/** jsdom implements no scrolling; LyricsView asks the browser to do it. */
beforeAll(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});

beforeEach(() => {
    hook = null;
    positionHook = null;
    unwrapMock.mockClear();
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: false, status: 404 } as unknown as Response))
    );
});

const mountSheet = async (lyrics?: unknown) => {
    if (lyrics) {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(lyrics) } as unknown as Response))
        );
    }
    render(
        <CountryProvider>
            <PlayerProvider>
                <PlayerSheet open onClose={() => {}} />
                <Probe />
            </PlayerProvider>
        </CountryProvider>
    );
    await act(async () => {
        hook!.play(track);
        await flush();
    });
};

/** jsdom ships no PointerEvent, so a drag is dispatched with hand-built events. */
const pointerEvent = (type: 'pointerdown' | 'pointermove' | 'pointerup', x: number) => {
    const event = new window.Event(type, { bubbles: true }) as unknown as PointerEvent;
    Object.defineProperty(event, 'clientX', { value: x });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    return event;
};

describe('PlayerSheet', () => {
    it('renders the current track with large album art', async () => {
        await mountSheet();

        expect(screen.getByText('t1')).toBeTruthy();
        expect(screen.getByText('Artist One')).toBeTruthy();
        const art = screen.getByRole('img', { name: 't1' });
        // Spec calls for the large artwork in the expanded sheet; the small
        // thumbnail belongs to the bar.
        expect(art.getAttribute('src')).toBe('l');
        cleanup();
    });

    it('seeks by way of the slider', async () => {
        await mountSheet();

        const slider = screen.getByRole('slider', { name: 'Seek' });
        await act(async () => {
            fireEvent.keyDown(slider, { key: 'ArrowRight' });
            await flush();
        });

        expect(positionHook!).toBeGreaterThan(0);
        expect(audio().currentTime).toBe(positionHook!);
        cleanup();
    });

    it('does not seek while the playhead merely moves under a paused slider', async () => {
        await mountSheet();
        const seeked = vi.spyOn(hook!, 'seek');

        // The context's timeupdate cadence moves `position` while the slider
        // value tracks it; a controlled slider must not turn that read-back
        // into a seek loop.
        const slider = screen.getByRole('slider', { name: 'Seek' });
        await act(async () => {
            Object.defineProperty(audio(), 'currentTime', { value: 42, configurable: true });
            audio().dispatchEvent(new Event('timeupdate'));
            await flush();
        });

        expect(seeked).not.toHaveBeenCalled();
        expect(slider.getAttribute('aria-valuenow')).toBe('42');
        cleanup();
    });

    it('drags the slider and seeks only when the thumb is released', async () => {
        await mountSheet();
        const slider = screen.getByRole('slider', { name: 'Seek' });
        // The Root span is where Radix measures the drag scale from.
        const root = slider.parentElement!.parentElement!;
        // jsdom lays every element out at 0×0, so the geometry the drag maths
        // runs on is supplied directly: a 100px-wide track at x=0.
        root.getBoundingClientRect = () => ({ width: 100, left: 0, right: 100 }) as DOMRect;

        await act(async () => {
            root.dispatchEvent(pointerEvent('pointerdown', 20));
            await flush();
        });
        expect(audio().currentTime).toBe(0);

        await act(async () => {
            root.dispatchEvent(pointerEvent('pointermove', 80));
            await flush();
        });
        // Mid-drag the thumb has moved but the element has not been asked to.
        // Radix re-mounts the thumb as the value changes, so it is queried
        // fresh rather than held.
        expect(screen.getByRole('slider', { name: 'Seek' }).getAttribute('aria-valuenow')).toBe('80');
        expect(audio().currentTime).toBe(0);

        await act(async () => {
            root.dispatchEvent(pointerEvent('pointerup', 80));
            await flush();
        });
        expect(audio().currentTime).toBe(80);
        expect(positionHook!).toBe(80);
        cleanup();
    });

    it('steps tracks and reports the position through the context', async () => {
        await mountSheet();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Next' }));
            await flush();
        });
        expect(hook!.state.queue?.current).toBe(1);
        expect(screen.getByText('t2')).toBeTruthy();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
            await flush();
        });
        expect(hook!.state.queue?.current).toBe(0);
        expect(screen.getByText('t1')).toBeTruthy();
        cleanup();
    });

    it('disables Previous at the head of the queue', async () => {
        await mountSheet();

        expect(screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(true);
        cleanup();
    });

    it('renders the synced lyrics for the current track', async () => {
        await mountSheet({ plainLyrics: 'a', syncedLyrics: '[00:01.00] one\n[00:02.00] two' });

        const lines = document.querySelectorAll('[data-current]');
        expect(lines.length).toBe(2);
        expect(screen.getByText('one').getAttribute('data-current')).toBe('true');
        cleanup();
    });

    it('renders plain lyrics as a static block when no synced variant exists', async () => {
        // The words without timestamps: no highlight, no scroll, just text.
        await mountSheet({ plainLyrics: 'plain line one\nplain line two', syncedLyrics: null });

        expect(screen.getByText('plain line one')).toBeTruthy();
        expect(screen.getByText('plain line two')).toBeTruthy();
        expect(document.querySelector('[data-current]')).toBeNull();
        cleanup();
    });

    it('closes through onClose when the close button is tapped', async () => {
        let closed = false;
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ plainLyrics: 'a', syncedLyrics: '[00:01.00] one' }) } as unknown as Response))
        );
        render(
            <CountryProvider>
                <PlayerProvider>
                    <PlayerSheet
                        open
                        onClose={() => {
                            closed = true;
                        }}
                    />
                    <Probe />
                </PlayerProvider>
            </CountryProvider>
        );
        await act(async () => {
            hook!.play(track);
            await flush();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Close' }));
            await flush();
        });
        expect(closed).toBe(true);
        cleanup();
    });

    it('stays closed when told to', async () => {
        render(
            <CountryProvider>
                <PlayerProvider>
                    <PlayerSheet open={false} onClose={() => {}} />
                    <Probe />
                </PlayerProvider>
            </CountryProvider>
        );
        await act(async () => {
            hook!.play(track);
            await flush();
        });

        expect(document.querySelector('[data-testid="player-sheet"]')).toBeNull();
        cleanup();
    });
});
