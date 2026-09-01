import { describe, expect, it } from 'vitest';
import { addToQueue, playNext, previous, skip, startAlbum, startSingle } from '@/lib/player/player';
import type { FetchedQobuzAlbum, QobuzTrack } from '@/lib/qobuz-dl';

const track = (id: number, streamable = true): QobuzTrack => ({ id, title: `t${id}`, streamable, track_number: id, media_number: 1 }) as unknown as QobuzTrack;

const album = (...tracks: QobuzTrack[]): FetchedQobuzAlbum => ({ id: '10', tracks: { items: tracks } }) as unknown as FetchedQobuzAlbum;

describe('player queue', () => {
    it('loads a streamable album starting at the tapped index', () => {
        const queue = startAlbum(album(track(1), track(2, false), track(3)), 2);
        expect(queue.tracks.map((t) => t.track.id)).toEqual([1, 3]);
        expect(queue.current).toBe(1);
    });

    // Discriminates a real id lookup from a naive `Math.min(startIndex, len-1)`
    // clamp: the non-streamable track(2) shifts every post-gap index, so the
    // clamp answers 2 where the correct index is 1.
    it('maps the tapped index onto the filtered list, not the raw list', () => {
        const queue = startAlbum(album(track(1), track(2, false), track(3), track(4)), 2);
        expect(queue.tracks.map((t) => t.track.id)).toEqual([1, 3, 4]);
        expect(queue.current).toBe(1);
    });

    it('falls back to index 0 when the tapped track is not streamable', () => {
        const queue = startAlbum(album(track(1, false), track(2)), 1);
        expect(queue.current).toBe(0);
    });

    it('backfills album artwork onto a single track that arrived without it', () => {
        // The search endpoint returns tracks whose `album` has no `image`, so
        // a track played straight from search rendered an empty art box. The
        // album fetched for the queue carries the artwork and must be merged
        // in rather than dropped on the one-track fallback.
        const bare = { id: 7, title: 'solo', streamable: true, album: { id: '10', title: 'Album' } } as unknown as QobuzTrack;
        const withArt = { ...album(track(7)), image: { small: 's.jpg', large: 'l.jpg' } } as unknown as FetchedQobuzAlbum;

        const queue = startSingle(bare, withArt);
        expect(queue.tracks[0].track.album?.image?.small).toBe('s.jpg');
        expect(queue.tracks[0].track.album?.title).toBe('Album');
    });

    it('keeps artwork the track already had instead of overwriting it', () => {
        const withArt = { id: 8, title: 'arted', streamable: true, album: { id: '10', image: { small: 'own.jpg' } } } as unknown as QobuzTrack;
        const queue = startSingle(withArt, { id: '10', image: { small: 'other.jpg' } } as unknown as FetchedQobuzAlbum);
        expect(queue.tracks[0].track.album?.image?.small).toBe('own.jpg');
    });

    it('inserts play-next right after the current track', () => {
        const queue = playNext(startAlbum(album(track(1), track(2), track(3)), 0), track(9));
        expect(queue.tracks.map((t) => t.track.id)).toEqual([1, 9, 2, 3]);
    });

    it('moves a track already in the queue instead of playing it twice', () => {
        // "Play next" on a track that is already queued is a move, not a copy:
        // leaving the later entry in place plays the track twice.
        const queue = playNext(startAlbum(album(track(1), track(2), track(3)), 0), track(3));
        expect(queue.tracks.map((t) => t.track.id)).toEqual([1, 3, 2]);
    });

    it('leaves the queue alone when the track moved next is already playing', () => {
        // Current is t3 (index 2). Moving the track that is already playing to
        // "next" is a no-op — there is nothing to bring forward.
        const queue = playNext(startAlbum(album(track(1), track(2), track(3)), 2), track(3));
        expect(queue.tracks.map((t) => t.track.id)).toEqual([1, 2, 3]);
        expect(queue.current).toBe(2);
    });

    it('corrects the current index when the moved track sat before it', () => {
        // t1 is pulled from index 0 to index 3 (after current), so everything
        // between shifts down and `current` must follow the track it pointed at.
        const queue = playNext(startAlbum(album(track(1), track(2), track(3)), 2), track(1));
        expect(queue.tracks.map((t) => t.track.id)).toEqual([2, 3, 1]);
        expect(queue.current).toBe(1);
    });

    it('appends add-to-queue at the end', () => {
        const queue = addToQueue(startAlbum(album(track(1), track(2)), 0), track(9));
        expect(queue.tracks.map((t) => t.track.id)).toEqual([1, 2, 9]);
    });

    it('skips forward and stops at the end', () => {
        const queue = skip({
            tracks: [
                { track: track(1), albumId: '10' },
                { track: track(2), albumId: '10' }
            ],
            current: 1
        });
        expect(queue.current).toBe(1);
    });

    it('keeps current at 0 when skipping an empty queue', () => {
        const queue = skip({ tracks: [], current: 0 });
        expect(queue.current).toBe(0);
    });

    it('goes back and clamps at the start', () => {
        const queue = previous({ tracks: [{ track: track(1), albumId: '10' }], current: 0 });
        expect(queue.current).toBe(0);
    });

    it('startSingle makes a one-track queue', () => {
        const queue = startSingle(track(7));
        expect(queue.tracks.map((t) => t.track.id)).toEqual([7]);
        expect(queue.current).toBe(0);
    });

    // albumId is QobuzAlbum['id'], a string. A track without an album must
    // still yield a string — never the number 0, which would typecheck only
    // because QobuzTrack.album is declared non-optional.
    it('gives an album-less track a string albumId, never a number', () => {
        const orphan = track(5);
        expect(startSingle(orphan).tracks[0].albumId).toBe('');
        expect(typeof startSingle(orphan).tracks[0].albumId).toBe('string');
        expect(playNext({ tracks: [], current: 0 }, orphan).tracks[0].albumId).toBe('');
        expect(addToQueue({ tracks: [], current: 0 }, orphan).tracks[0].albumId).toBe('');
    });

    it('carries the album id from the track onto the queue entry', () => {
        const withAlbum = { ...track(6), album: { id: 'abc' } } as unknown as QobuzTrack;
        expect(startSingle(withAlbum).tracks[0].albumId).toBe('abc');
    });
});
