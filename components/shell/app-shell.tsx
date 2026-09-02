'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Disc3, Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/search-bar/search-bar';
import { useCrate } from '@/lib/crate';
import { emitSearch } from '@/lib/search/bus';

/**
 * The station name in flap tiles — CRATE spelled the way the concourse
 * spells everything, one character per cell, amber lamp for the letter
 * that marks the live surface.
 */
const StationMark = () => (
    <div className='flex gap-[3px] px-3' aria-label='Crate'>
        {['C', 'R', 'A', 'T', 'E'].map((ch, i) => (
            <span
                key={i}
                className={cn('flap flex size-8 items-center justify-center text-sm font-bold text-foreground', i === 2 && 'lamp-amber text-primary')}
                aria-hidden='true'
            >
                {ch}
            </span>
        ))}
    </div>
);

/**
 * The fixed navigation legend — a station's line board: Home, Search,
 * Transfers. Weight and an amber dot mark the platform you're on; the
 * legend never edits the terrain.
 */
const NAV = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/transfers', label: 'Transfers', icon: Disc3 }
];

function NavLegend() {
    const pathname = usePathname();

    return (
        <nav className='flex flex-col gap-0.5 px-2' aria-label='Main'>
            {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                            active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className='size-4 shrink-0' strokeWidth={active ? 2.5 : 1.75} />
                        <span className='caps-cell truncate'>{label}</span>
                        {active && <span className='lamp-dot ml-auto shrink-0' aria-hidden='true' />}
                    </Link>
                );
            })}
        </nav>
    );
}

/**
 * The crate rail: real pinned searches from localStorage. Departures you've
 * looked up before, one tap from the timetable again. Honest empty state.
 */
function CrateRail() {
    const crate = useCrate();
    const router = useRouter();

    return (
        <div className='flex flex-col gap-0.5 px-2'>
            <p className='index-numeral px-3 pb-1 pt-4'>Dug here before</p>
            {crate.entries.length === 0 && <p className='px-3 py-1.5 text-sm text-muted-foreground/70'>Searches you run pin here.</p>}
            {crate.entries.map((entry) => (
                <button
                    key={entry}
                    type='button'
                    className='flex items-center justify-start gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground'
                    onClick={() => {
                        router.push('/');
                        setTimeout(() => emitSearch(entry), 400);
                    }}
                >
                    <span className='caps-cell truncate'>{entry}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * The three-column concourse: steel left column (station), the board
 * (main), and the platform dock across the floor. Below `lg` the legend
 * moves to a bottom bar and the board stacks.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex min-h-dvh flex-col lg:flex-row'>
            <header className='steel hidden w-56 shrink-0 flex-col gap-3 border-r border-border bg-sidebar p-2 lg:flex'>
                <StationMark />
                <NavLegend />
                <div className='mt-2 flex-1 overflow-y-auto'>
                    <CrateRail />
                </div>
            </header>

            <div className='flex min-w-0 flex-1 flex-col'>
                <div className='steel sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border px-4'>
                    <div className='min-w-0 flex-1 lg:max-w-md'>
                        <SearchBar />
                    </div>
                    <div id='shell-header-actions' className='ml-auto flex items-center gap-2' />
                </div>

                <main className='min-w-0 flex-1 px-4 py-6 lg:px-8'>{children}</main>
            </div>

            <nav aria-label='Main' className='steel sticky bottom-0 z-20 flex border-t border-border lg:hidden'>
                <MobileLegend />
            </nav>
        </div>
    );
}

function MobileLegend() {
    const pathname = usePathname();
    return (
        <>
            {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px]', active ? 'text-foreground' : 'text-muted-foreground')}
                    >
                        <Icon className='size-5' strokeWidth={active ? 2.5 : 1.75} />
                        <span className='caps-cell'>{label}</span>
                    </Link>
                );
            })}
        </>
    );
}
