'use client';

import React, { useMemo } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useStatusBar } from '@/lib/status-bar/context';

/**
 * Transfers: the live departure board. Every download is a departure — the
 * row in flight carries the amber lamp, pending rows wait with the clock,
 * and the board says so when nothing is moving. Real queue state only.
 */
const TransfersView = () => {
    const { statusBar } = useStatusBar();
    const pending = statusBar.queue ?? [];

    const rows = useMemo(() => {
        const active = statusBar.processing
            ? [{ title: statusBar.title, UUID: 'active', running: true, remove: statusBar.onCancel }]
            : [];
        return [
            ...active,
            ...pending.map((job) => ({ title: job.title, UUID: job.UUID, running: false, remove: job.remove }))
        ];
    }, [statusBar.processing, statusBar.title, statusBar.onCancel, pending]);

    return (
        <section aria-label='Transfers'>
            <div className='board-rule caps-cell mb-6 flex items-baseline justify-between border-b-0 py-2 text-sm text-foreground'>
                <span>Departures</span>
                <span className={rows.length === 0 ? 'text-muted-foreground' : 'text-primary'}>
                    {rows.length === 0 ? 'BOARD CLEAR' : `${rows.length} IN FLIGHT`}
                </span>
            </div>

            {rows.length === 0 ? (
                <div className='flap mx-auto max-w-xl p-10 text-center'>
                    <p className='caps-cell text-sm text-foreground'>No departures.</p>
                    <p className='mt-2 text-sm text-muted-foreground'>
                        Every release you download boards here while it moves — search the timetable and pull one in.
                    </p>
                </div>
            ) : (
                <ol className='flex flex-col'>
                    {rows.map((row) => (
                        <li
                            key={row.UUID}
                            className={`board-rule flex items-center gap-4 px-4 py-3 ${row.running ? 'lamp-amber' : ''}`}
                        >
                            {row.running ? (
                                <Loader2 className='size-4 shrink-0 animate-spin text-primary' aria-hidden='true' />
                            ) : (
                                <Clock className='size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                            )}
                            <span className='caps-cell min-w-0 flex-1 truncate text-sm text-foreground'>{row.title}</span>
                            {row.running && (
                                <span className='index-numeral shrink-0 text-primary'>{Math.round(statusBar.progress * 100)}%</span>
                            )}
                            {row.remove && (
                                <button
                                    type='button'
                                    onClick={row.remove}
                                    className='caps-cell lamp-red shrink-0 px-2 py-1 text-sm transition-colors hover:text-destructive'
                                >
                                    Cancel
                                </button>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
};

export default TransfersView;
