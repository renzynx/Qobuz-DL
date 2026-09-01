'use client';

import React, { useState } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import PlayerSheet from '@/components/player/player-sheet';
import { usePlayer } from '@/lib/player/context';
import { formatArtists, formatTitle } from '@/lib/qobuz-dl';

/**
 * The bottom row of the app shell: the `min-h-dvh` column in the layout ends
 * with the download status zone and then this bar, so the dock sits in flow at
 * the page floor — nothing floats over the gallery, nothing is stacked on the
 * content. The expanded sheet grows the same column above the bar.
 *
 * `sticky bottom-0` keeps it pinned to the viewport bottom while the page is
 * taller than the screen, without ever leaving the flow: when the user reaches
 * the end of the document the bar is simply the last thing there, not a
 * floating panel covering the last row of results.
 *
 * The bar is a view over `usePlayer()` and owns nothing: it renders the
 * current track, forwards transport intents straight to the context, and
 * holds only the local flag for whether the expanded sheet is open.
 *
 * Motion is inherited from `MotionProvider` (`reducedMotion='user'`), so no
 * reduced-motion branch exists here — adding one would shadow the global
 * setting with a second, diverging source of truth.
 */
const PlayerBar = () => {
    const { state, current, toggle, skipForward } = usePlayer();
    const [expanded, setExpanded] = useState(false);

    // The queue check is what narrows `state.queue` for the Next button's
    // bounds test; `current` is derived from the queue and cannot survive it.
    if (!state.queue || !current) return null;

    const track = current.track;
    const title = formatTitle(track);
    const artist = formatArtists(track);

    return (
        <div className='pointer-events-none sticky bottom-0 mx-auto flex w-full max-w-screen flex-col gap-2 px-4 pb-4'>
            <PlayerSheet open={expanded} onClose={() => setExpanded(false)} />
            <motion.div
                data-testid='player-bar'
                initial={{ y: 64, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                role='button'
                tabIndex={0}
                aria-expanded={expanded}
                aria-label={`Now playing ${title} by ${artist}`}
                onClick={() => setExpanded((open) => !open)}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setExpanded((open) => !open);
                }}
                className={`pointer-events-auto container flex cursor-pointer items-center gap-3 border border-border bg-card p-2${state.playing ? ' lime-lamp' : ''}`}
            >
                <div className='relative size-11 shrink-0 overflow-hidden border border-border/60 bg-secondary'>
                    {track.album?.image?.small ? <img src={track.album.image.small} alt={title} className='size-full object-cover' /> : null}
                </div>
                <div className='flex min-w-0 flex-1 flex-col'>
                    <p className='truncate text-sm font-medium text-foreground' title={title}>
                        {title}
                    </p>
                    <p className='truncate text-xs text-muted-foreground' title={artist}>
                        {artist}
                    </p>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                    <Button
                        variant='ghost'
                        size='icon'
                        aria-label={state.playing ? 'Pause' : 'Play'}
                        title={state.playing ? 'Pause' : 'Play'}
                        className={`touch-manipulation active:scale-95 transition-transform${state.playing ? ' text-primary' : ''}`}
                        onClick={(event) => {
                            // The bar behind these buttons expands on tap; a
                            // transport control must not also navigate.
                            event.stopPropagation();
                            toggle();
                        }}
                    >
                        {state.playing ? <Pause /> : <Play />}
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        aria-label='Next'
                        title='Next'
                        disabled={state.queue.current >= state.queue.tracks.length - 1}
                        className='touch-manipulation active:scale-95 transition-transform'
                        onClick={(event) => {
                            event.stopPropagation();
                            skipForward();
                        }}
                    >
                        <SkipForward />
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default PlayerBar;
