'use client';
import React, { useEffect, useState } from 'react';
import StatusBar from './status-bar';
import { useStatusBar } from '@/lib/status-bar/context';
import { cn } from '@/lib/utils';

/**
 * The download zone at the foot of the shell. It collapses to nothing when
 * there is no job: reserving its full height always would push the player
 * dock below the fold on a short page for no visible reason.
 *
 * The gate is `processing || open || complete`, not just `open`: `open` is
 * false whenever the user last collapsed the bar (openPreference=false) or
 * before the first job touches it, and a download must show its progress
 * regardless of how the bar was left.
 */
const StatusBarContainer = () => {
    const { statusBar } = useStatusBar();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const active = statusBar.processing || statusBar.open || statusBar.complete;
    if (!isMounted || !active) return null;
    return (
        <div
            data-testid='download-zone'
            className={cn('px-4 pb-4 pt-4 overflow-hidden mx-auto w-full flex justify-center border-b border-border/60 bg-background pointer-events-none')}
        >
            <div className='container relative flex'>
                <StatusBar />
            </div>
        </div>
    );
};

export default StatusBarContainer;
