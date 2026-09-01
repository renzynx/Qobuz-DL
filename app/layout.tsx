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
import { Geist, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

/*
DESIGN CONTRACT — Crate, canon build (seed qobuz-dl-identity-2026)

THESIS: A record crate you can play and empty. Crate is the only app where
listening and taking the file with you are one gesture, so the shell carries
player, catalogue AND transfers as equal citizens — not a downloader with a
player bolted on. It refuses the incumbent's exhibition void (near-black plus
one neon accent: the AI-default cluster this category always ships).

OWN-WORLD: Warm drenched dark — #121212 ground, #0A0A0A nav, #181818 raised
card, #1F1F1F hover. One live accent, lime #A3E635, spent only on the thing
that is happening right now: the active nav row, the playing equaliser, the
transfer in flight. Album art is the only saturated color; chrome stays warm
and near-neutral. Geist UI at 13-14px, instrument-serif nowhere, mono reserved
for timings and counts. 8px radius on controls, 4px on rows, square art.

STORY: Visitor lands on Home — a Bandcamp-style weekly album spotlight, then
their recent crates. Searches; results fill the main column as a dense art
grid. Plays: the dock wakes. Downloads: the action flips to state
(HyperCard's discipline), the sidebar Transfers row counts up (split-flap's
row-level live update, never a modal), and the file lands.

FIRST VIEWPORT (1440x900): 224px nav left — wordmark, Search/Home/Transfers,
then "Your Crate" playlists; translucent topbar with a single search pill;
main column opens on a full-bleed weekly album spotlight with its Download
control, then a "Recently played" art grid; player dock pinned across the
bottom, art + title left, transport centre, transfers count right.

FORM: User-pinned canon (Spotify + Tidal + Bandcamp) — a brief-pinned
decision beats the roll, so the canon is executed at full fidelity with the
three declined challengers' disciplines raised into it: split-flap row-level
live update, orienteering fixed-legend nav, HyperCard's action-flips-to-state.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
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
            <body className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`} suppressHydrationWarning>
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
                                                <div className='sticky bottom-0 z-[30] flex w-full max-h-dvh flex-col border-t border-border bg-background'>
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
