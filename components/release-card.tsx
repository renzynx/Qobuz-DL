import ArtistDialog from './artist-dialog';
import DownloadAlbumButton from './download-album-button';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { AlignJustifyIcon, DiscAlbumIcon, DownloadIcon, ListPlusIcon, ListStartIcon, PlayIcon, UsersIcon } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { download } from '@/lib/download-job';
import { albumCacheOf } from '@/lib/download/request';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
    FetchedQobuzAlbum,
    formatDuration,
    formatTitle,
    getFullAlbumInfo,
    describeCatalogueItem,
    QobuzAlbum,
    QobuzArtist,
    QobuzTrack
} from '@/lib/qobuz-dl';
import { filterData } from '@/lib/search/results';
import { motion, useAnimation } from 'motion/react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { useFFmpeg } from '@/lib/ffmpeg-provider';
import { usePlayer } from '@/lib/player/context';
import { useSettings } from '@/lib/settings-provider';
import { useStatusBar } from '@/lib/status-bar/context';
import { useCountry } from '@/lib/country-provider';
import { toast } from 'sonner';

/**
 * The track a play tap should start from: the tapped track itself, or the
 * first streamable one of its album. `null` while an album's first playable
 * track is still being resolved — a play button with nothing to hand the
 * player yet must not fire it.
 */
const trackToStart = async (
    item: ReturnType<typeof describeCatalogueItem>,
    fetchedAlbumData: FetchedQobuzAlbum | null,
    setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>,
    result: QobuzAlbum | QobuzTrack | QobuzArtist,
    country: string | undefined
): Promise<QobuzTrack | null> => {
    if (item.isTrack) return (result as QobuzTrack).streamable ? (result as QobuzTrack) : null;
    if (item.isArtist || !item.album) return null;
    const album = await getFullAlbumInfo(fetchedAlbumData, setFetchedAlbumData, item.album, country).catch(() => null);
    return album?.tracks.items.find((track) => track.streamable) ?? null;
};

const ReleaseCard = ({
    result,
    resolvedTheme,
    ref,
    showArtistDialog
}: {
    result: QobuzAlbum | QobuzTrack | QobuzArtist;
    resolvedTheme: string;
    ref?: React.Ref<HTMLDivElement>;
    showArtistDialog?: boolean;
}) => {
    if (typeof showArtistDialog === 'undefined') showArtistDialog = true;
    const { ffmpegState } = useFFmpeg();
    const { setStatusBar } = useStatusBar();
    const { settings } = useSettings();
    const { play, playNextTrack, enqueue } = usePlayer();

    const [openTracklist, setOpenTracklist] = useState(false);
    const [fetchedAlbumData, setFetchedAlbumData] = useState<FetchedQobuzAlbum | null>(null);
    const [focusCard, setFocusCard] = useState(false);

    const item = describeCatalogueItem(result);
    const album = item.album ?? null;

    const [imageLoaded, setImageLoaded] = useState(false);
    const imageAnimationControls = useAnimation();

    const artist = item.artist;

    useEffect(() => {
        if (imageLoaded) imageAnimationControls.start({ scale: 1 });
    }, [imageLoaded]);

    const [openArtistDialog, setOpenArtistDialog] = useState(false);
    const { country } = useCountry();

    return (
        <div className='flap-in space-y-2' title={formatTitle(result)} ref={ref || undefined}>
            <div className='flap board-rule relative aspect-square w-full select-none overflow-hidden transition-colors group-hover:border-primary/50'>
                <div
                    className={cn(
                        'w-full z-[3] top-0 left-0 absolute transition-all aspect-square opacity-100 pointer-events-none pointer-hover:opacity-0 pointer-hover:group-hover:opacity-100 pointer-hover:focus-within:opacity-100',
                        resolvedTheme != 'light'
                            ? `pointer-hover:group-hover:bg-black/55 ${focusCard && 'bg-black/55'}`
                            : `pointer-hover:group-hover:bg-white/35 ${focusCard && 'bg-white/35'}`
                    )}
                    onClick={() => {
                        if (item.isArtist) setOpenArtistDialog(true);
                    }}
                >
                    <div className='flex flex-col h-full justify-between'>
                        <div className='space-y-0.5 p-3 flex justify-between relative overflow-x-hidden pointer-events-auto'>
                            <div className='w-full pr-9'>
                                {!item.isArtist && (item.bitDepth ?? 0) >= 24 && (
                                    <span className='rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground'>
                                        Hi-Res
                                    </span>
                                )}
                            </div>
                            {!item.isArtist && showArtistDialog && (
                                <div className='absolute top-0 right-0 p-4 pointer-events-auto'>
                                    <Button
                                        size='icon'
                                        variant='ghost'
                                        className='aspect-square size-11 touch-manipulation active:scale-95 transition-transform'
                                        onClick={async () => {
                                            setOpenArtistDialog(true);
                                        }}
                                    >
                                        <UsersIcon />
                                    </Button>
                                </div>
                            )}
                        </div>
                        {!item.isArtist && (
                            <div className='flex items-center justify-between gap-4 p-2 pointer-events-auto'>
                                <Button
                                    title={`Play '${formatTitle(result)}'`}
                                    aria-label={`Play '${formatTitle(result)}'`}
                                    size='icon'
                                    variant='ghost'
                                    className='size-11 touch-manipulation active:scale-95 transition-transform'
                                    onClick={async () => {
                                        const start = await trackToStart(item, fetchedAlbumData, setFetchedAlbumData, result, country);
                                        if (!start) {
                                            // Nothing streamable: the tap must say so rather than
                                            // doing nothing, or the button reads as broken.
                                            toast.error(`'${formatTitle(result)}' is not available to play.`);
                                            return;
                                        }
                                        play(start);
                                    }}
                                >
                                    <PlayIcon />
                                </Button>
                                {item.isTrack ? (
                                    <Button
                                        size='icon'
                                        variant='ghost'
                                        className='size-11 touch-manipulation active:scale-95 transition-transform'
                                        onClick={async () => {
                                            await download(
                                                {
                                                    target: result as QobuzTrack,
                                                    settings,
                                                    country,
                                                    albumCache: albumCacheOf(fetchedAlbumData, setFetchedAlbumData)
                                                },
                                                setStatusBar,
                                                ffmpegState
                                            );
                                        }}
                                    >
                                        <DownloadIcon />
                                    </Button>
                                ) : (
                                    <DownloadAlbumButton
                                        variant='ghost'
                                        size='icon'
                                        className='size-11 touch-manipulation active:scale-95 transition-transform'
                                        result={result as QobuzAlbum}
                                        setStatusBar={setStatusBar}
                                        ffmpegState={ffmpegState}
                                        settings={settings}
                                        fetchedAlbumData={fetchedAlbumData}
                                        setFetchedAlbumData={setFetchedAlbumData}
                                        onOpen={() => setFocusCard(true)}
                                        onClose={() => setFocusCard(false)}
                                    />
                                )}
                                {item.isTrack ? null : (
                                    <Button
                                        title='Tracklist'
                                        aria-label='Tracklist'
                                        size='icon'
                                        variant='ghost'
                                        className='size-11 touch-manipulation active:scale-95 transition-transform'
                                        onClick={async () => {
                                            setOpenTracklist(!openTracklist);
                                            await getFullAlbumInfo(fetchedAlbumData, setFetchedAlbumData, result as QobuzAlbum, country);
                                        }}
                                    >
                                        <AlignJustifyIcon />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <motion.div
                    initial={item.image?.small ? { scale: 0.9 } : { scale: 1 }}
                    animate={imageAnimationControls}
                    transition={{ duration: 0.1 }}
                    className={cn('absolute left-0 top-0 z-[2] w-full aspect-square transition-all')}
                >
                    {item.image?.small ? (
                        <>
                            {item.isArtist ? (
                                <Image
                                    fill
                                    src={item.image?.small ?? ''}
                                    alt={formatTitle(result)}
                                    className={cn(
                                        'object-cover group-hover:scale-105 transition-all w-full h-full text-[0px]',
                                        focusCard && 'scale-105',
                                        imageLoaded && 'opacity-100'
                                    )}
                                    sizes='(min-width: 1280px) calc((100vw - 96px) / 7), (min-width: 1024px) calc((100vw - 80px) / 6), (min-width: 768px) calc((100vw - 64px) / 5), (min-width: 640px) calc((100vw - 48px) / 3), calc((100vw - 32px) / 2)'
                                    onLoad={() => {
                                        setImageLoaded(true);
                                    }}
                                />
                            ) : (
                                <img
                                    crossOrigin='anonymous'
                                    src={item.image?.small ?? ''}
                                    alt={formatTitle(result)}
                                    className={cn(
                                        'object-cover group-hover:scale-105 transition-all w-full h-full text-[0px]',
                                        focusCard && 'scale-105',
                                        imageLoaded && 'opacity-100'
                                    )}
                                    sizes='(min-width: 1280px) calc((100vw - 96px) / 7), (min-width: 1024px) calc((100vw - 80px) / 6), (min-width: 768px) calc((100vw - 64px) / 5), (min-width: 640px) calc((100vw - 48px) / 3), calc((100vw - 32px) / 2)'
                                    onLoad={() => {
                                        setImageLoaded(true);
                                    }}
                                />
                            )}
                        </>
                    ) : (
                        <motion.div className='flex items-center justify-center bg-secondary w-full h-full' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {filterData.map((filter, index) => {
                                if (filter.value === item.kind) {
                                    return <filter.icon key={index} className='w-1/2 h-1/2 opacity-20' />;
                                }
                            })}
                        </motion.div>
                    )}
                </motion.div>
                <Skeleton className='absolute left-0 top-0 z-[1] w-full aspect-square flex items-center justify-center' />
            </div>
            <div className='space-y-1'>
                <div className='flex gap-1.5 items-center'>
                    {(result as QobuzAlbum | QobuzTrack).parental_warning && (
                        <p
                            className='flap flex aspect-square h-[18px] w-[18px] shrink-0 items-center justify-center text-center text-[9px] font-semibold text-primary'
                            title='Explicit'
                        >
                            E
                        </p>
                    )}
                    <h1 className='caps-cell truncate text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary'>{formatTitle(result)}</h1>
                </div>
                {!item.isArtist && (
                    <div className='caps-cell truncate text-[11px] text-muted-foreground' title={item.artists}>
                        <span className='truncate'>{item.artists}</span>
                    </div>
                )}
                {item.isTrack && album?.title ? (
                    <div className='text-xs truncate flex gap-x-0.5 items-center'>
                        <DiscAlbumIcon className='size-3.5 shrink-0' />
                        <span className='truncate'>{album.title}</span>
                    </div>
                ) : null}
            </div>
            {item.isArtist && <ArtistDialog open={openArtistDialog} setOpen={setOpenArtistDialog} artist={result as QobuzArtist} />}
            <Dialog open={openTracklist} onOpenChange={setOpenTracklist}>
                <DialogContent className='w-[600px] max-w-[90%] md:max-w-[80%] overflow-hidden'>
                    <div className='flex gap-3 overflow-hidden'>
                        <div className='relative shrink-0 aspect-square min-w-[100px] min-h-[100px] rounded-none overflow-hidden border border-border'>
                            <Skeleton className='absolute aspect-square w-full h-full' />
                            {item.image?.small && (
                                <img
                                    src={item.image?.small ?? ''}
                                    alt={formatTitle(result)}
                                    crossOrigin='anonymous'
                                    className='absolute aspect-square w-full h-full'
                                />
                            )}
                        </div>

                        <div className='flex w-full flex-col justify-between overflow-hidden'>
                            <div className='space-y-1.5 overflow-visible'>
                                <DialogTitle title={formatTitle(album || result)} className='truncate overflow-visible py-0.5 pr-2'>
                                    {formatTitle(album || result)}
                                </DialogTitle>
                                {!item.isArtist && (
                                    <DialogDescription title={item.artists} className='truncate overflow-visible '>
                                        {item.artists}
                                    </DialogDescription>
                                )}
                            </div>
                            <div className='flex items-center w-full justify-between gap-2'>
                                <div className='space-y-1.5 w-fit'>
                                    {!item.isArtist && (
                                        <DialogDescription className='truncate'>
                                            {item.tracksCount} {item.tracksCount && item.tracksCount > 1 ? 'tracks' : 'track'} - {formatDuration(album?.duration)}
                                        </DialogDescription>
                                    )}
                                </div>
                                <DownloadAlbumButton
                                    result={result as QobuzAlbum}
                                    setStatusBar={setStatusBar}
                                    ffmpegState={ffmpegState}
                                    settings={settings}
                                    fetchedAlbumData={fetchedAlbumData}
                                    setFetchedAlbumData={setFetchedAlbumData}
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => {
                                        setOpenTracklist(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <Separator />
                    {fetchedAlbumData && (
                        <ScrollArea className='max-h-[40vh]'>
                            <motion.div initial={{ maxHeight: '0vh' }} animate={{ maxHeight: '40vh' }}>
                                <div className='flex flex-col overflow-hidden pr-3'>
                                    {fetchedAlbumData.tracks.items.map((track: QobuzTrack, index: number) => {
                                        track.album = album!;
                                        return (
                                            <div key={track.id}>
                                                <div
                                                    className={cn(
                                                        'flex items-center justify-between gap-2 overflow-hidden border-b border-border/60 p-2 transition-colors hover:bg-accent group',
                                                        !track.streamable && 'opacity-50'
                                                    )}
                                                >
                                                    <div className='gap-2 flex items-center overflow-hidden'>
                                                        <span className='index-numeral w-5 shrink-0'>{String(index + 1).padStart(2, '0')}</span>
                                                        {track.parental_warning && (
                                                            <p
                                                                className='text-[9px] font-mono text-primary border border-primary/60 p-0.5 rounded-none aspect-square w-[18px] h-[18px] shrink-0 text-center justify-center items-center flex font-semibold'
                                                                title='Explicit'
                                                            >
                                                                E
                                                            </p>
                                                        )}
                                                        <p className='truncate font-medium'>{formatTitle(track)}</p>
                                                    </div>
                                                    {track.streamable && (
                                                        <div className='flex items-center shrink-0'>
                                                            <Button
                                                                title={`Play '${formatTitle(track)}'`}
                                                                aria-label={`Play '${formatTitle(track)}'`}
                                                                className='flex justify-center aspect-square h-11 w-11 [&_svg]:size-5 hover:bg-transparent touch-manipulation active:scale-95 transition-transform'
                                                                size='icon'
                                                                variant='ghost'
                                                                onClick={() => play(track)}
                                                            >
                                                                <PlayIcon className='!size-4' />
                                                            </Button>
                                                            <Button
                                                                title={`Play '${formatTitle(track)}' next`}
                                                                aria-label={`Play '${formatTitle(track)}' next`}
                                                                className='flex justify-center aspect-square h-11 w-11 [&_svg]:size-5 hover:bg-transparent touch-manipulation active:scale-95 transition-transform'
                                                                size='icon'
                                                                variant='ghost'
                                                                onClick={() => playNextTrack(track)}
                                                            >
                                                                <ListStartIcon className='!size-4' />
                                                            </Button>
                                                            <Button
                                                                title={`Add '${formatTitle(track)}' to queue`}
                                                                aria-label={`Add '${formatTitle(track)}' to queue`}
                                                                className='flex justify-center aspect-square h-11 w-11 [&_svg]:size-5 hover:bg-transparent touch-manipulation active:scale-95 transition-transform'
                                                                size='icon'
                                                                variant='ghost'
                                                                onClick={() => enqueue(track)}
                                                            >
                                                                <ListPlusIcon className='!size-4' />
                                                            </Button>
                                                            <Button
                                                                title={`Download '${formatTitle(track)}'`}
                                                                className='flex md:hidden justify-center aspect-square h-11 w-11 [&_svg]:size-5 hover:bg-transparent touch-manipulation active:scale-95 transition-transform'
                                                                size='icon'
                                                                variant='ghost'
                                                                onClick={async () => {
                                                                    await download(
                                                                        { target: track, settings, country },
                                                                        setStatusBar,
                                                                        ffmpegState
                                                                    );
                                                                    toast.info(`Added '${formatTitle(track)}' to the queue`);
                                                                }}
                                                            >
                                                                <DownloadIcon className='!size-4' />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                {index < fetchedAlbumData.tracks.items.length - 1 && <Separator />}
                                                <div />
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
            {!item.isArtist && showArtistDialog && artist && (
                <ArtistDialog open={openArtistDialog} setOpen={setOpenArtistDialog} artist={artist} />
            )}
        </div>
    );
};

export default ReleaseCard;
