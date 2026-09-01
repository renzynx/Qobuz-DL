import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { act, render, cleanup, fireEvent, screen } from '@testing-library/react';
import { useEffect } from 'react';
import ReleaseCard from '@/components/release-card';
import { PlayerProvider, usePlayer } from '@/lib/player/context';
import { FFmpegProvider } from '@/lib/ffmpeg-provider';
import { SettingsProvider } from '@/lib/settings-provider';
import { StatusBarProvider } from '@/lib/status-bar/context';
import { CountryProvider, useCountry } from '@/lib/country-provider';
import type { QobuzAlbum, QobuzTrack } from '@/lib/qobuz-dl';

/**
 * The card is a leaf of the app tree: it reaches for the settings, country,
 * ffmpeg and status-bar providers even to render a play button. Rendering it
 * under the real providers keeps this test honest about the wiring instead of
 * substituting a mock tree that could drift from production.
 */

const toastErrors: string[] = [];
vi.mock('sonner', () => ({
    toast: {
        error: (message: string) => {
            toastErrors.push(message);
            return 'id';
        },
        info: () => 'id',
        success: () => 'id'
    }
}));

/** jsdom ships no media playback and no Media Session API; both are filled in. */
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

    // Radix's ScrollArea measures its viewport with one; jsdom has none.
    class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: ResizeObserverStub });
});

afterAll(() => {
    const element = window.HTMLMediaElement.prototype as unknown as Record<string, unknown>;
    Object.defineProperty(element, 'play', { configurable: true, value: mediaPrototypes.play });
    Object.defineProperty(element, 'pause', { configurable: true, value: mediaPrototypes.pause });
    Object.defineProperty(element, 'paused', mediaPrototypes.paused as PropertyDescriptor);
});

const album = {
    id: '10',
    title: 'Album',
    duration: 300,
    tracks_count: 3,
    released_at: 1500000000,
    maximum_bit_depth: 24,
    maximum_sampling_rate: 96,
    artist: { name: 'Artist One', id: 99 },
    image: { small: 's', large: 'l' },
    genre: { name: 'Electronic' }
} as unknown as QobuzAlbum;

const track = (id: number, title: string, streamable = true): QobuzTrack =>
    ({
        id,
        title,
        streamable,
        duration: 100,
        track_number: id,
        media_number: 1,
        performer: { name: 'Artist One', id: 99 },
        album
    }) as unknown as QobuzTrack;

const settle = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => {
    for (let i = 0; i < 10; i++) await settle();
};

/** The options `unwrap` receives; country travels as a sibling of params. */
type UnwrapOptions = { params?: Record<string, unknown>; country?: string | null };

/** Album 10 holds three tracks; the stream URL echoes the requested track id. */
const unwrapMock = vi.fn().mockImplementation((path: string, options?: UnwrapOptions) =>
    path.includes('album')
        ? Promise.resolve({ ...album, tracks: { items: [track(1, 't1'), track(2, 't2'), track(3, 't3')] } })
        : Promise.resolve({ url: `https://cdn.example.com/stream?id=${String(options?.params?.track_id ?? '?')}` })
);

vi.mock('@/lib/api/client', () => ({
    getApiClient: () => ({
        unwrap: unwrapMock,
        routes: { album: '/api/get-album', download: '/api/download-music' }
    })
}));

// Captured in an effect: assigning during render would be a side effect.
let hook: ReturnType<typeof usePlayer> | null = null;
const Probe = () => {
    const value = usePlayer();
    useEffect(() => {
        hook = value;
    });
    return null;
};

const audio = () => document.querySelector('audio')!;

const renderCard = (result: QobuzAlbum | QobuzTrack) =>
    render(
        <SettingsProvider>
            <CountryProvider>
                <StatusBarProvider>
                    <FFmpegProvider>
                        <PlayerProvider>
                            <ReleaseCard result={result} resolvedTheme='dark' />
                            <Probe />
                        </PlayerProvider>
                    </FFmpegProvider>
                </StatusBarProvider>
            </CountryProvider>
        </SettingsProvider>
    );

beforeEach(() => {
    hook = null;
    toastErrors.length = 0;
    unwrapMock.mockClear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404 } as unknown as Response)));
});

describe('card play button', () => {
    it('plays the track when a track card is tapped', async () => {
        renderCard(track(1, 't1'));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 't1'" }));
            await flush();
        });

        expect(audio().src).toContain('id=1');
        expect(hook!.current?.track.id).toBe(1);
        cleanup();
    });

    it('plays the album from its first streamable track', async () => {
        // Track 1 is not streamable, so the first playable track is t2 — the
        // button must not ask for a stream that the API will refuse.
        unwrapMock.mockImplementationOnce((path: string, options?: { params?: Record<string, unknown> }) =>
            path.includes('album')
                ? Promise.resolve({
                      ...album,
                      tracks: { items: [track(1, 't1', false), track(2, 't2'), track(3, 't3')] }
                  })
                : Promise.resolve({ url: `https://cdn.example.com/stream?id=${String(options?.params?.track_id ?? '?')}` })
        );

        renderCard(album);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 'Album'" }));
            await flush();
        });

        expect(audio().src).toContain('id=2');
        expect(hook!.current?.track.id).toBe(2);
        cleanup();
    });

    it('reports an album that has nothing streamable instead of doing nothing', async () => {
        // Every track is unstreamable, so there is no track to hand the
        // player. The tap must say so: a button that silently does nothing
        // reads as a broken app, not as an unavailable release.
        unwrapMock.mockImplementationOnce((path: string, options?: { params?: Record<string, unknown> }) =>
            path.includes('album')
                ? Promise.resolve({ ...album, tracks: { items: [track(1, 't1', false), track(2, 't2', false)] } })
                : Promise.resolve({ url: `https://cdn.example.com/stream?id=${String(options?.params?.track_id ?? '?')}` })
        );

        renderCard(album);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 'Album'" }));
            await flush();
        });

        expect(toastErrors.length).toBeGreaterThan(0);
        expect(hook!.state.queue).toBeNull();
        expect(audio().src).toBe('');
        cleanup();
    });

    it('reports an unstreamable track card instead of doing nothing', async () => {
        // A track card with the rights flag off can never produce a stream.
        // The same contract as the album branch: say so, touch nothing.
        renderCard(track(1, 't1', false));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 't1'" }));
            await flush();
        });

        expect(toastErrors.length).toBeGreaterThan(0);
        expect(hook!.state.queue).toBeNull();
        expect(audio().src).toBe('');
        cleanup();
    });

    it('carries the browsing country from the card tree into the player requests', async () => {
        // The card and the provider sit under the same CountryProvider in
        // production; a play tap must forward what that context holds or the
        // stream is served for the wrong region.
        const SetFR = () => {
            const { setCountry } = useCountry();
            useEffect(() => {
                setCountry('FR');
            }, []);
            return null;
        };

        render(
            <SettingsProvider>
                <CountryProvider>
                    <SetFR />
                    <StatusBarProvider>
                        <FFmpegProvider>
                            <PlayerProvider>
                                <ReleaseCard result={track(1, 't1')} resolvedTheme='dark' />
                                <Probe />
                            </PlayerProvider>
                        </FFmpegProvider>
                    </StatusBarProvider>
                </CountryProvider>
            </SettingsProvider>
        );

        await act(async () => {
            await flush();
            fireEvent.click(screen.getByRole('button', { name: "Play 't1'" }));
            await flush();
        });

        const countries = unwrapMock.mock.calls
            .filter((call) => String(call[0]).includes('download'))
            .map((call) => (call[1] as UnwrapOptions | undefined)?.country);
        expect(countries).toContain('FR');
        cleanup();
    });
});

describe('tracklist row controls', () => {
    it('plays the tapped row from the album tracklist', async () => {
        renderCard(album);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Tracklist' }));
            await flush();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 't2'" }));
            await flush();
        });

        expect(audio().src).toContain('id=2');
        expect(hook!.state.queue?.tracks.map((t) => t.track.id)).toEqual([1, 2, 3]);
        cleanup();
    });

    it('queues a row to play next', async () => {
        renderCard(album);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Tracklist' }));
            await flush();
        });

        // Start from t1 so a "next" insert has room to be observed.
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 't1'" }));
            await flush();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 't3' next" }));
            await flush();
        });

        // `enqueue` would give [1, 2, 3]; a copying play-next would give
        // [1, 3, 2, 3]. Only a move produces [1, 3, 2] — the row's track is
        // lifted from later in the album queue rather than duplicated.
        expect(hook!.state.queue?.tracks.map((t) => t.track.id)).toEqual([1, 3, 2]);
        expect(hook!.current?.track.id).toBe(1);
        expect(audio().src).toContain('id=1');
        cleanup();
    });

    it('appends a row to the queue without touching what is playing', async () => {
        renderCard(album);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Tracklist' }));
            await flush();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Play 't2'" }));
            await flush();
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: "Add 't1' to queue" }));
            await flush();
        });

        // The album queue already holds all three tracks; appending t1 must
        // leave the current track untouched and grow the queue to four.
        expect(hook!.state.queue?.tracks.map((t) => t.track.id)).toEqual([1, 2, 3, 1]);
        expect(hook!.current?.track.id).toBe(2);
        expect(audio().src).toContain('id=2');
        cleanup();
    });
});
