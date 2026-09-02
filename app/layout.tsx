import GrainField from '@/components/grain-field';
import MotionProvider from '@/components/motion-provider';
import PlayerBar from '@/components/player/player-bar';
import StatusBarContainer from '@/components/status-bar/container';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { APPLICATION_NAME, IS_DEFAULT_APPLICATION_NAME } from '@/lib/app-config';
import { CountryProvider } from '@/lib/country-provider';
import { FFmpegProvider } from '@/lib/ffmpeg-provider';
import { PlayerProvider } from '@/lib/player/context';
import { SettingsProvider } from '@/lib/settings-provider';
import { StatusBarProvider } from '@/lib/status-bar/context';
import AppShell from '@/components/shell/app-shell';
import HeaderActions from '@/components/shell/header-actions';
import type { Metadata } from 'next';
import { Geist, Instrument_Serif, JetBrains_Mono, Oswald } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

/*
DESIGN CONTRACT — Crate × Split-Flap Concourse (seed split-flap-departure-board)
Full replacement of the Canon gray world. The Canon passed only where it
overlapped this world; every surface below is rebuilt in flap grammar.

THESIS: A station concourse for music. Crate is the only app where listening
and taking the file with you are one gesture; the split-flap board is the one
artifact built for exactly that job — rows of departures, one arriving, none
waiting. It refuses both the prior worlds: the near-black neon exhibition and
the template-gray SaaS shell they became.

OWN-WORLD: matte black flap faces on a brushed-steel ground; ONE condensed
white face everywhere, characters in fixed cells, destinations in caps;
amber lamp = the job in flight; dim red = cancelled; rows are ruled, columns
never move, only flaps. Information arrives by flip cascade, never by fade.

STORY: The visitor scans the board (catalogue rows, flipped into view),
picks a departure (album), and watches it board (download) — amber lamp on,
row level, flap by flap. The player is the station's platform announcement:
quiet, persistent, always underfoot. Everything is a row on a board.

FIRST VIEWPORT (1440×900): steel-grey shell; left column = the station
name CRATE in flap tiles over Home/Search/Transfers; main column = the
board: a hairline-ruled grid of departures, each row = square art cell +
caps title/artist in flap cells + hi-res mark + actions on hover; topbar =
thin steel band with the timetable search; floor = the platform dock with
player + live transfer row. Mobile: the board narrows to priority columns.

FORM: user-pinned replacement (split-flap concourse, challenger source
signals-instruments-split-flap-concourse). Catalog grammar committed across
navigation, content, controls, states, motion. Raises kept from earlier
verdicts: orienteering fixed-legend nav; HyperCard action-flips-to-state.

FINISH: unreviewed and undocumented is unfinished; this build ends with
the finish review, the verdict, DESIGN.md, and every shipping raster
carrying its provenance.
*/

const geist = Geist({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-geist-sans'
});

const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    display: 'swap',
    variable: '--font-instrument-serif'
});

const oswald = Oswald({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    display: 'swap',
    variable: '--font-oswald'
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-jetbrains-mono'
});

export const metadata: Metadata = {
    metadataBase: new URL('https://www.qobuz-dl.com/'), // Site URL
    title: {
        default: `${APPLICATION_NAME} - A frontend browser client for downloading music for Qobuz.`,
        template: APPLICATION_NAME
    },
    description: 'A frontend browser client for downloading music for Qobuz.',
    openGraph: {
        images: IS_DEFAULT_APPLICATION_NAME ? [{ url: '/logo/qobuz-banner.png', width: 650, height: 195, alt: 'Qobuz Logo' }] : []
    },
    keywords: [APPLICATION_NAME, 'music', 'downloader', 'hi-res', 'qobuz', 'flac', 'alac', 'mp3', 'aac', 'opus', 'wav', 'qobuz download']
};

/**
 * Settings, changelog and the repo link render through the client component
 * `components/shell/header-actions.tsx`, portalled into the shell topbar.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang='en' className='dark' suppressHydrationWarning>
            <body className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${oswald.variable} antialiased`} suppressHydrationWarning>
                <FFmpegProvider>
                    <MotionProvider>
                        <CountryProvider>
                            <StatusBarProvider>
                                <PlayerProvider>
                                    <SettingsProvider>
                                        <ThemeProvider attribute='class' defaultTheme='dark' enableSystem>
                                            <GrainField />
                                            <div className='flex min-h-dvh flex-col'>
                                                <AppShell>
                                                    {children}
                                                    {/* Topbar actions render into the shell's reserved slot, so the
                                                        header stays a single translucent band over the content. */}
                                                    <HeaderActions />
                                                </AppShell>
                                                {/* One dock owns the page floor: the download strip and
                                                    the player plate are rows of the same unit, never two
                                                    floating bands stacked over each other. */}
                                                {/* `max-h-dvh` caps the dock at the viewport so the expanded sheet
                                                    grows into that budget and scrolls internally, instead of
                                                    pushing the transport past the fold on a short screen. */}
                                                <div className='steel sticky bottom-0 z-[30] flex w-full max-h-dvh flex-col border-t border-border bg-background'>
                                                    <StatusBarContainer />
                                                    <PlayerBar />
                                                </div>
                                                <Toaster closeButton richColors />
                                            </div>
                                        </ThemeProvider>
                                    </SettingsProvider>
                                </PlayerProvider>
                            </StatusBarProvider>
                        </CountryProvider>
                        <Script src='https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.9.7/dist/ffmpeg.min.js' strategy='beforeInteractive' />
                        <Script src='https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js' strategy='beforeInteractive' />
                    </MotionProvider>
                </FFmpegProvider>
            </body>
        </html>
    );
}
