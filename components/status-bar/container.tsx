'use client';
import React, { useEffect, useState } from 'react';
import StatusBar from './status-bar';
import { useStatusBar } from '@/lib/status-bar/context';
import { cn } from '@/lib/utils';

/**
 * The download zone at the foot of the shell. It collapses to nothing when
 * there is no job: reserving its full height always would push the player
 * dock below the fold on a short page for no visible reason.
 */
const StatusBarContainer = () => {
    const { statusBar } = useStatusBar();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted || !statusBar.open) return null;
    return (
        <div
            className={cn(
                'px-4 pb-4 pt-6 overflow-hidden mx-auto w-full flex min-h-[156px] justify-center border-t border-border bg-background pointer-events-none'
            )}
        >
            <div className='container relative flex'>
                <StatusBar />
            </div>
        </div>
    );
};

export default StatusBarContainer;
