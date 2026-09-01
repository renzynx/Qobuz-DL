import type { FetchedQobuzAlbum, QobuzAlbum, QobuzTrack } from '@/lib/qobuz-dl';

/** Album ids are strings in the Qobuz payload (QobuzAlbum.id). */
export type PlayerTrack = { track: QobuzTrack; albumId: QobuzAlbum['id'] };
export type PlayerQueue = { tracks: PlayerTrack[]; current: number };

/**
 * A track's album id, or '' when the track carries no album.
 *
 * The fallback is the empty string, not a number: PlayerTrack.albumId is
 * QobuzAlbum['id'], which is a string. A numeric fallback here would only
 * typecheck because QobuzTrack.album is declared non-optional, so TypeScript
 * never evaluates the `??` — the number would still reach callers at runtime.
 */
const albumIdOf = (track: QobuzTrack): QobuzAlbum['id'] => track.album?.id ?? '';

/** Streamable is a Qobuz rights flag; the download path filters on it already. */
const fromAlbum = (album: FetchedQobuzAlbum): PlayerTrack[] =>
    album.tracks.items.filter((t) => t.streamable).map((track) => ({ track, albumId: album.id }));

export function startAlbum(album: FetchedQobuzAlbum, startIndex: number): PlayerQueue {
    const tracks = fromAlbum(album);
    const targetId = album.tracks.items[startIndex]?.id;
    // Look the id up in the *filtered* list: dropping non-streamable tracks
    // shifts every index after the first gap.
    const current = tracks.findIndex((t) => t.track.id === targetId);
    return { tracks, current: current === -1 ? 0 : current };
}

export function startSingle(track: QobuzTrack): PlayerQueue {
    return { tracks: [{ track, albumId: albumIdOf(track) }], current: 0 };
}

export function playNext(queue: PlayerQueue, track: QobuzTrack): PlayerQueue {
    return { ...queue, ...moved(queue, track, queue.current + 1) };
}

/**
 * Places `track` at `insertAt`, having removed any entry it already had.
 *
 * Without the removal, "play next" on a track the queue already holds plays it
 * twice. Removing an entry that sits before the current one shifts the current
 * track down by one, so `current` is corrected to keep the same track playing.
 */
function moved(queue: PlayerQueue, track: QobuzTrack, insertAt: number): PlayerQueue {
    const existing = queue.tracks.findIndex((entry) => entry.track.id === track.id);
    if (existing === queue.current) return queue;

    const tracks = queue.tracks.filter((entry) => entry.track.id !== track.id);
    const shifted = existing !== -1 && existing < queue.current ? queue.current - 1 : queue.current;
    tracks.splice(insertAt, 0, { track, albumId: albumIdOf(track) });
    return { tracks, current: shifted };
}

export function addToQueue(queue: PlayerQueue, track: QobuzTrack): PlayerQueue {
    return { ...queue, tracks: [...queue.tracks, { track, albumId: albumIdOf(track) }] };
}

export function skip(queue: PlayerQueue): PlayerQueue {
    if (queue.tracks.length === 0) return { ...queue, current: 0 };
    return { ...queue, current: Math.min(queue.current + 1, queue.tracks.length - 1) };
}

export function previous(queue: PlayerQueue): PlayerQueue {
    return { ...queue, current: Math.max(queue.current - 1, 0) };
}
