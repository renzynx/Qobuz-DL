'use client';

import React, { useMemo } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useStatusBar } from '@/lib/status-bar/context';

/**
 * Transfers: the download queue as a page, not a pop-up.
 *
 * The queue state already lives in the status-bar provider — every download
 * registers its title and progress there — so this view is a read over that
 * state. Nothing is faked: an empty crate is an empty crate.
 */
const TransfersView = () => {
    const { statusBar } = useStatusBar();
    const pending = statusBar.queue ?? [];

    /**
     * The active job never sits in `queue` — `createJob` registers queue
     * entries only for jobs waiting behind a running one. The live job is
     * carried by the status fields, so it is composed in here as the first
     * row, with the pending ones behind it. Both sources, one list.
     */
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
            <div className='mb-6 flex items-baseline justify-between'>
                <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Transfers</h1>
                <p className='index-numeral'>{rows.length === 0 ? 'IDLE' : `${rows.length} JOB${rows.length > 1 ? 'S' : ''}`}</p>
            </div>

            {rows.length === 0 ? (
                <div className='rounded-lg border border-border bg-card p-10 text-center'>
                    <p className='text-sm font-medium text-foreground'>Nothing in the queue.</p>
                    <p className='mt-2 text-sm text-muted-foreground'>
                        Every release you download lands here while it moves — search for something and pull it in.
                    </p>
                </div>
            ) : (
                <ol className='flex flex-col gap-2'>
                    {rows.map((row) => (
                        <li key={row.UUID} className='flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3'>
                            {row.running ? (
                                <Loader2 className='size-4 shrink-0 animate-spin text-primary' aria-hidden='true' />
                            ) : (
                                <Clock className='size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                            )}
                            <span className='min-w-0 flex-1 truncate text-sm font-medium text-foreground'>{row.title}</span>
                            {row.running && (
                                <span className='index-numeral shrink-0 text-primary'>{Math.round(statusBar.progress * 100)}%</span>
                            )}
                            {row.remove && (
                                <button
                                    type='button'
                                    onClick={row.remove}
                                    className='index-numeral shrink-0 rounded-sm px-2 py-1 transition-colors hover:text-destructive'
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
