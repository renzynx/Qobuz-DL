import GrainField from '@/components/grain-field';
import MotionProvider from '@/components/motion-provider';
import PlayerBar from '@/components/player/player-bar';
import StatusBarContainer from '@/components/status-bar/container';
import { ThemeProvider } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import ChangelogDialog from '@/components/ui/changelog-dialog';
import SettingsForm from '@/components/ui/settings-form';
import { Toaster } from '@/components/ui/sonner';
import { APPLICATION_NAME, IS_DEFAULT_APPLICATION_NAME } from '@/lib/app-config';
import { CountryProvider } from '@/lib/country-provider';
import { FFmpegProvider } from '@/lib/ffmpeg-provider';
import { PlayerProvider } from '@/lib/player/context';
import { SettingsProvider } from '@/lib/settings-provider';
import { StatusBarProvider } from '@/lib/status-bar/context';
import { FaGithub } from '@react-icons/all-files/fa/FaGithub';
import type { Metadata } from 'next';
import { Geist, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

/*
DESIGN CONTRACT — Gallery Blackout (seed 6a1ff499): near-black exhibition void; releases hang as
hairline plates against an off-centre rail; acid lime (#D8FF3E) is the only light source (primary
action, focus, live states); Instrument Serif wordmark, JetBrains Mono measurements, Geist UI text;
film-grain field replaces the particle background. FINISH: unreviewed and undocumented is
unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping
raster carrying its provenance.
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
                                            <div className='fixed justify-between items-start flex w-full max-w-screen p-4 z-[10]'>
                                                <div className='flex flex-col gap-2'>
                                                    <SettingsForm />
                                                    <ChangelogDialog />
                                                </div>
                                                <div className='flex gap-2 items-center'>
                                                    <a href='https://github.com/d0nj/Qobuz-DL' target='_blank' rel='noopener noreferrer'>
                                                        <Button variant='ghost' size='icon'>
                                                            <FaGithub />
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>
                                            <div className='flex flex-col min-h-screen'>
                                                <main className='px-6 pb-12 pt-28 md:pt-24 2xl:pt-40 min-h-full flex-1 flex flex-col items-center justify-center gap-2 z-[2] overflow-x-hidden max-w-screen overflow-y-hidden'>
                                                    {children}
                                                </main>
                                                <PlayerBar />
                                                <Toaster closeButton richColors />
                                                <StatusBarContainer />
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
