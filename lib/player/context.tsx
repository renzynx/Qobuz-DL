'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getApiClient } from '@/lib/api/client';
import { useCountry } from '@/lib/country-provider';
import { parseLrc, type SyncedLyric } from '@/lib/lyrics/lrc';
import { lrclib } from '@/lib/lyrics/lrclib';
import type { FetchedQobuzAlbum, QobuzTrack } from '@/lib/qobuz-dl';
import { addToQueue, playNext, previous, skip, startAlbum, startSingle, type PlayerQueue, type PlayerTrack } from './player';

/** Everything a view needs to render the player; `queue` is null before the first play. */
export type PlayerState = { queue: PlayerQueue | null; playing: boolean; position: number; duration: number };

export type PlayerContextValue = {
    state: PlayerState;
    current: PlayerTrack | null;
    play: (track: QobuzTrack) => void;
    playNextTrack: (track: QobuzTrack) => void;
    enqueue: (track: QobuzTrack) => void;
    toggle: () => void;
    seek: (seconds: number) => void;
    skipForward: () => void;
    skipBackward: () => void;
    syncedLyrics: SyncedLyric[] | null;
    /** Plain (unsynced) lyrics, or null when absent or a synced variant won. */
    plainLyrics: string | null;
};

type LoadedTrack = { track: QobuzTrack; url: string };

/** Highest quality the API exposes; the download path defaults to the same value. */
const STREAM_QUALITY = '27';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);
/**
 * The playhead lives in its own context: `timeupdate` fires ~4Hz and would
 * otherwise re-render every `usePlayer` consumer — including each
 * ReleaseCard in the search grid — on every tick.
 */
const PositionContext = createContext<number | undefined>(undefined);

/**
 * Resolves the album a track belongs to, or `null` when it cannot be reached.
 *
 * Returns null rather than throwing: a failed album lookup degrades to a
 * one-track queue, so the track the user tapped still plays.
 */
async function fetchAlbum(albumId: string, country: string | null): Promise<FetchedQobuzAlbum | null> {
    const client = getApiClient();
    const album = await client.unwrap<FetchedQobuzAlbum>(client.routes.album, {
        params: { album_id: albumId },
        country
    });
    return album?.tracks?.items ? album : null;
}

/** Resolves a CDN URL for one track. Throws on failure — the caller decides. */
async function fetchStreamUrl(trackId: number, country: string | null): Promise<string> {
    const client = getApiClient();
    const { url } = await client.unwrap<{ url: string }>(client.routes.download, {
        params: { track_id: trackId, quality: STREAM_QUALITY },
        country
    });
    return url;
}

/** Publishes title/artist/artwork to the OS. Absent API → no-op. */
function publishMetadata(track: QobuzTrack): void {
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return;
    const artwork = [track.album?.image?.large, track.album?.image?.small].filter((url): url is string => Boolean(url));
    navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.title,
        artist: track.performer?.name ?? '',
        album: track.album?.title ?? '',
        ...(artwork.length > 0 ? { artwork: artwork.map((src) => ({ src })) } : {})
    });
}

/**
 * Synced and plain lyrics for a track, or null on every failure path.
 *
 * A lyrics miss must never interrupt playback, so lookup failures — offline,
 * malformed, no entry — are indistinguishable from "no entry". Synced wins
 * when both variants exist; plain is the fallback the sheet renders.
 */
async function fetchLyrics(track: QobuzTrack): Promise<{ synced: SyncedLyric[] | null; plain: string | null } | null> {
    try {
        const lyrics = await lrclib.fetchLyrics({
            artist: track.performer?.name ?? '',
            title: track.title,
            album: track.album?.title,
            duration: track.duration
        });
        if (!lyrics) return null;
        return { synced: lyrics.synced ? parseLrc(lyrics.synced) : null, plain: lyrics.synced ? null : lyrics.plain };
    } catch {
        // lrclib rejects on a network failure rather than returning null;
        // an escaped rejection here would surface as an unhandled one.
        return null;
    }
}

/** The queue as an index into `queue.tracks`, clamped to the tracks that exist. */
const currentOf = (queue: PlayerQueue | null): PlayerTrack | null => queue?.tracks[queue.current] ?? null;

function usePlayerValue(): { audioRef: React.RefObject<HTMLAudioElement | null>; value: PlayerContextValue; position: number } {
    const [state, setState] = useState<PlayerState>({ queue: null, playing: false, position: 0, duration: 0 });
    const [position, setPosition] = useState(0);
    const [syncedLyrics, setSyncedLyrics] = useState<SyncedLyric[] | null>(null);
    const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    /**
     * Mirrors `state.queue` for the `ended`/`error` listeners, which are bound
     * once and would otherwise read the queue as it was when they were bound.
     */
    const queueRef = useRef<PlayerQueue | null>(null);
    /** Cancels the URL fetch of a track the user has already left behind. */
    const abortRef = useRef<AbortController | null>(null);
    /** Album id → album, so a second tap on the same album costs no request. */
    const albumCache = useRef(new Map<string, FetchedQobuzAlbum>());
    /** Track id → CDN URL, filled one track ahead so `ended` has no gap. */
    const urlCache = useRef(new Map<number, string>());
    /**
     * Mirrors the browsing country. Kept as a ref rather than a dependency so
     * a country change never rebuilds `loadAt` — its identity change would
     * re-run the audio effect and pause playback mid-track.
     */
    const countryRef = useRef<string | null>(null);
    /** Guards the auto-skip chain so a failing queue cannot recurse. */
    const advancingRef = useRef(false);
    /** Cancels superseded `play` calls; the last tap wins. */
    const playGenerationRef = useRef(0);
    /** The track whose lyrics were last requested, so repeats dedupe. */
    const lyricsTrackIdRef = useRef<number | null>(null);

    const { country } = useCountry();
    useEffect(() => {
        countryRef.current = country ?? null;
    }, [country]);

    const setQueue = useCallback((queue: PlayerQueue | null) => {
        queueRef.current = queue;
        setState((prev) => ({ ...prev, queue }));
    }, []);

    const playTrack = useCallback(async (loaded: LoadedTrack, position: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.src = loaded.url;
        audio.currentTime = position;
        setPosition(position);
        setState((prev) => ({ ...prev, playing: true, position, duration: loaded.track.duration ?? 0 }));
        try {
            await audio.play();
        } catch {
            // Autoplay can be refused before a user gesture; the element is
            // loaded either way, so the failure is not worth surfacing.
            setState((prev) => ({ ...prev, playing: false }));
        }
        publishMetadata(loaded.track);
        // A lookup still in flight when the track changed must not land
        // afterwards onto the new track's lyrics; the ref holds the track
        // the provider last committed to, so a stale answer is dropped.
        lyricsTrackIdRef.current = loaded.track.id;
        void fetchLyrics(loaded.track).then((lyrics) => {
            if (lyricsTrackIdRef.current !== loaded.track.id) return;
            setSyncedLyrics(lyrics?.synced ?? null);
            setPlainLyrics(lyrics?.plain ?? null);
        });
    }, []);

    /**
     * Loads the track at `index` in the current queue, advancing past tracks
     * whose stream URL cannot be resolved and stopping at the end. `resume`
     * starts playback at a position instead of the top — the pause/toggle
     * path hands over the playhead it had.
     */
    const loadAt = useCallback(
        async (index: number, resume: number = 0) => {
            const queue = queueRef.current;
            if (!queue) return;
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            const target = queue.tracks[index];
            if (!target) {
                setQueue({ ...queue, current: Math.max(index - 1, 0) });
                setState((prev) => ({ ...prev, playing: false, position: 0 }));
                setPosition(0);
                return;
            }

            setQueue({ ...queue, current: index });
            setSyncedLyrics(null);
            setPlainLyrics(null);
            const cached = urlCache.current.get(target.track.id);
            if (cached) {
                await playTrack({ track: target.track, url: cached }, resume);
                void prefetch(index + 1);
                return;
            }

            let url: string;
            try {
                url = await fetchStreamUrl(target.track.id, countryRef.current);
            } catch (error) {
                if (controller.signal.aborted) return;
                toast.error(error instanceof Error ? error.message : 'Could not load this track.');
                if (!advancingRef.current) {
                    advancingRef.current = true;
                    await loadAt(index + 1);
                    advancingRef.current = false;
                } else {
                    setState((prev) => ({ ...prev, playing: false, position: 0 }));
                    setPosition(0);
                }
                return;
            }
            if (controller.signal.aborted) return;
            urlCache.current.set(target.track.id, url);
            await playTrack({ track: target.track, url }, resume);
            void prefetch(index + 1);
        },
        [setQueue, playTrack]
    );

    /**
     * Resolves the next track's URL while the current one plays, so `ended`
     * does not wait on a round trip — several seconds on hi-res tracks.
     */
    const prefetch = useCallback(async (index: number) => {
        const queue = queueRef.current;
        const target = queue?.tracks[index];
        if (!target || urlCache.current.has(target.track.id)) return;
        try {
            const url = await fetchStreamUrl(target.track.id, countryRef.current);
            if (abortRef.current?.signal.aborted) return;
            urlCache.current.set(target.track.id, url);
        } catch {
            // A prefetch miss costs nothing up front; loadAt reports it if
            // that track is ever reached.
        }
    }, []);

    /** Moves the queue to `next` and loads whatever lands under the cursor. */
    const moveTo = useCallback(
        async (next: (queue: PlayerQueue) => PlayerQueue) => {
            const queue = queueRef.current;
            if (!queue) return;
            const moved = next(queue);
            setQueue(moved);
            await loadAt(moved.current);
        },
        [setQueue, loadAt]
    );

    const play = useCallback(
        async (track: QobuzTrack) => {
            const generation = ++playGenerationRef.current;
            const albumId = track.album?.id;
            let queue: PlayerQueue | null = null;
            let album: FetchedQobuzAlbum | null = null;
            if (albumId) {
                const cached = albumCache.current.get(albumId) ?? null;
                album = cached ?? (await fetchAlbum(albumId, countryRef.current).catch(() => null));
                if (generation !== playGenerationRef.current) return;
                if (album) {
                    albumCache.current.set(albumId, album);
                    const index = album.tracks.items.findIndex((item) => item.id === track.id);
                    queue = startAlbum(album, index === -1 ? 0 : index);
                }
            }
            setQueue(queue ?? startSingle(track, album ?? null));
            await loadAt(queue?.current ?? 0);
        },
        [setQueue, loadAt]
    );

    const playNextTrack = useCallback(
        (track: QobuzTrack) => {
            const queue = queueRef.current;
            if (!queue) return;
            setQueue(playNext(queue, track));
        },
        [setQueue]
    );

    const enqueue = useCallback(
        (track: QobuzTrack) => {
            const queue = queueRef.current;
            if (!queue) return;
            setQueue(addToQueue(queue, track));
        },
        [setQueue]
    );

    const toggle = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !queueRef.current) return;
        const queue = queueRef.current;
        if (audio.paused) {
            const target = queue.tracks[queue.current];
            if (!target) return;
            // The element can hold the previous track's bytes when the current
            // one failed to load; resume must refetch in that case rather than
            // replay stale bytes against the failed track's title.
            if (urlCache.current.get(target.track.id) === audio.src) {
                void playTrack({ track: target.track, url: audio.src }, audio.currentTime);
                return;
            }
            void loadAt(queue.current, audio.currentTime);
            return;
        }
        audio.pause();
        setState((prev) => ({ ...prev, playing: false }));
    }, [playTrack, loadAt]);

    const seek = useCallback((seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = seconds;
        setPosition(seconds);
        setState((prev) => ({ ...prev, position: seconds }));
    }, []);

    const skipForward = useCallback(() => void moveTo(skip), [moveTo]);
    const skipBackward = useCallback(() => void moveTo(previous), [moveTo]);

    // One audio element for the whole app, rendered by this provider and owned
    // by nobody else. It must be in the document rather than a detached
    // `new Audio()`, or nothing outside the provider can observe its state.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTimeUpdate = () => setPosition(audio.currentTime);
        const onLoadedMetadata = () => setState((prev) => ({ ...prev, duration: audio.duration }));
        const onEnded = () => void loadAt((queueRef.current?.current ?? -1) + 1);
        const onPause = () => setState((prev) => ({ ...prev, playing: false }));
        // A cached URL that went stale mid-stream is evicted before the skip,
        // so returning to that track fetches a fresh one instead of replaying
        // the dead URL.
        const onError = () => {
            const queue = queueRef.current;
            const target = queue?.tracks[queue.current];
            if (target) urlCache.current.delete(target.track.id);
            void loadAt((queueRef.current?.current ?? -1) + 1);
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('error', onError);
        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('error', onError);
            abortRef.current?.abort();
            audioRef.current = null;
        };
    }, [loadAt]);

    return {
        audioRef,
        value: useMemo(
            () => ({
                state,
                current: currentOf(state.queue),
                play: (track: QobuzTrack) => void play(track),
                playNextTrack,
                enqueue,
                toggle,
                seek,
                skipForward,
                skipBackward,
                syncedLyrics,
                plainLyrics
            }),
            [state, play, playNextTrack, enqueue, toggle, seek, skipForward, skipBackward, syncedLyrics, plainLyrics]
        ),
        position
    };
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { audioRef, value, position } = usePlayerValue();
    return (
        <PlayerContext.Provider value={value}>
            <PositionContext.Provider value={position}>
                <audio ref={audioRef} preload='none' />
                {children}
            </PositionContext.Provider>
        </PlayerContext.Provider>
    );
};

export function usePlayer(): PlayerContextValue {
    const context = useContext(PlayerContext);
    if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
    return context;
}

/**
 * The playhead in seconds. Reads from the fast-firing position context so a
 * 4Hz tick re-renders only the components that show it, not every consumer.
 */
export function usePlayerPosition(): number {
    const position = useContext(PositionContext);
    if (position === undefined) throw new Error('usePlayerPosition must be used within a PlayerProvider');
    return position;
}
