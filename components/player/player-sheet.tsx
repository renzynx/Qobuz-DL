'use client';

import React, { useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import LyricsView from '@/components/player/lyrics-view';
import { usePlayer, usePlayerPosition } from '@/lib/player/context';
import { formatArtists, formatTitle } from '@/lib/qobuz-dl';

/**
 * The sheet owns nothing: it is a view over `usePlayer()`. The bar opens and
 * closes it; while open it replaces the bar's compact row with the full
 * transport — artwork, seek, step, lyrics — forwarding every intent to the
 * context the same way the bar does.
 */
type PlayerSheetProps = {
    open: boolean;
    onClose: () => void;
};

const PlayerSheet = ({ open, onClose }: PlayerSheetProps) => {
    const { state, current, toggle, seek, skipForward, skipBackward, syncedLyrics, plainLyrics } = usePlayer();
    const position = usePlayerPosition();
    /** Where the thumb is being dragged, while it is being dragged. */
    const [scrub, setScrub] = useState<number | null>(null);
    if (!open || !state.queue || !current) return null;

    const track = current.track;
    const title = formatTitle(track);
    const artist = formatArtists(track);
    const duration = state.duration || 1;

    return (
        <motion.div
            data-testid='player-sheet'
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            role='dialog'
            aria-label={`Now playing ${title} by ${artist}`}
            className='pointer-events-auto container flex flex-col gap-4 border border-border bg-card p-4'
        >
            <div className='flex items-start justify-between'>
                <p className='index-numeral text-muted-foreground'>Now playing</p>
                <Button
                    variant='ghost'
                    size='icon'
                    aria-label='Close'
                    title='Close'
                    className='touch-manipulation active:scale-95 transition-transform'
                    onClick={onClose}
                >
                    <X />
                </Button>
            </div>
            <div className='flex flex-col items-center gap-4'>
                <div className='size-40 overflow-hidden border border-border/60 bg-secondary'>
                    {track.album?.image?.large ? <img src={track.album.image.large} alt={title} className='size-full object-cover' /> : null}
                </div>
                <div className='flex min-w-0 flex-col items-center'>
                    <p className='truncate text-sm font-medium text-foreground' title={title}>
                        {title}
                    </p>
                    <p className='truncate text-xs text-muted-foreground' title={artist}>
                        {artist}
                    </p>
                </div>
                <Slider
                    aria-label='Seek'
                    value={[Math.min(scrub ?? position, duration)]}
                    max={duration}
                    step={1}
                    onValueChange={(values) => setScrub(values[0] ?? 0)}
                    onValueCommit={(values) => {
                        setScrub(null);
                        seek(values[0] ?? 0);
                    }}
                    className='w-full'
                />
                <div className='flex items-center gap-2'>
                    <Button
                        variant='ghost'
                        size='icon'
                        aria-label='Previous'
                        title='Previous'
                        disabled={state.queue.current <= 0}
                        className='touch-manipulation active:scale-95 transition-transform'
                        onClick={skipBackward}
                    >
                        <SkipBack />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        aria-label={state.playing ? 'Pause' : 'Play'}
                        title={state.playing ? 'Pause' : 'Play'}
                        className='touch-manipulation active:scale-95 transition-transform'
                        onClick={toggle}
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
                        onClick={skipForward}
                    >
                        <SkipForward />
                    </Button>
                </div>
                <LyricsView syncedLyrics={syncedLyrics} plain={plainLyrics} position={position} />
            </div>
        </motion.div>
    );
};

export default PlayerSheet;
