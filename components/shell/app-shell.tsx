'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Disc3, Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APPLICATION_NAME } from '@/lib/app-config';
import SearchBar from '@/components/search-bar/search-bar';

/**
 * The fixed navigation legend.
 *
 * Orienteering's discipline, raised into the canon: the legend is fixed and
 * never edits the terrain. Rows are plain text that gain weight and a lime
 * marker when active — Spotify's own rule, no icon chrome, no pill buttons.
 */
const NAV = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/transfers', label: 'Transfers', icon: Disc3 }
];

function NavLegend() {
    const pathname = usePathname();

    return (
        <nav className='flex flex-col gap-1 px-2' aria-label='Main'>
            {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors',
                            active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className='size-5 shrink-0' strokeWidth={active ? 2.25 : 1.75} />
                        <span className='truncate'>{label}</span>
                        {active && <span className='ml-auto size-1.5 rounded-full bg-primary' aria-hidden='true' />}
                    </Link>
                );
            })}
        </nav>
    );
}

/**
 * The crate rail: what the collector has already pulled.
 *
 * Deliberately authored content — a real crate holds favourites and oddities,
 * not a tidy grid of equal cards. Counts are mono, per the contract.
 */
const CRATE = [
    { title: 'Late Night Pressings', count: 42 },
    { title: 'Hi-Res Finds', count: 18 },
    { title: 'Bass Weight', count: 67 },
    { title: 'Sunday Strings', count: 9 },
    { title: 'Dug Last Winter', count: 31 }
];

function CrateRail() {
    return (
        <div className='flex flex-col gap-1 px-2'>
            <p className='index-numeral px-3 pb-1 pt-2 !text-foreground/80'>Your Crate</p>
            {CRATE.map((c) => (
                <button
                    key={c.title}
                    type='button'
                    className='flex items-baseline justify-between gap-2 rounded-sm px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground'
                >
                    <span className='truncate'>{c.title}</span>
                    <span className='index-numeral shrink-0'>{c.count}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * The three-column shell.
 *
 * Nav is a fixed 224px legend, the topbar a translucent bar over a scrolling
 * main column, and the floor dock spans the whole width beneath both — so the
 * player reads as part of the room rather than a panel floating over content.
 * Below `lg` the legend collapses to a bottom bar and the columns stack.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex min-h-dvh flex-col lg:flex-row'>
            <header className='hidden w-56 shrink-0 flex-col gap-2 bg-sidebar p-2 lg:flex'>
                <Link href='/' className='flex items-center gap-2 px-3 py-3'>
                    <span className='size-6 rounded-sm bg-primary' aria-hidden='true' />
                    <span className='text-base font-semibold tracking-tight text-foreground'>{APPLICATION_NAME}</span>
                </Link>
                <NavLegend />
                <div className='mt-2 flex-1 overflow-y-auto'>
                    <CrateRail />
                </div>
            </header>

            <div className='flex min-w-0 flex-1 flex-col'>
                <div className='sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur'>
                    {/* The search pill is a shell fixture mounted here so it
                        persists above every route, canon placement. The
                        portal slot stays for the actions on the right. */}
                    <div className='min-w-0 flex-1 lg:max-w-md'>
                        <SearchBar />
                    </div>
                    <div id='shell-header-actions' className='ml-auto flex items-center gap-2' />
                </div>

                <main className='min-w-0 flex-1 px-4 py-6 lg:px-6'>{children}</main>
            </div>

            <nav
                aria-label='Main'
                className='sticky bottom-0 z-20 flex border-t border-border bg-sidebar lg:hidden'
            >
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
                        className={cn(
                            'flex flex-1 flex-col items-center gap-1 py-2 text-[11px]',
                            active ? 'text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        <Icon className='size-5' strokeWidth={active ? 2.25 : 1.75} />
                        {label}
                    </Link>
                );
            })}
        </>
    );
}
