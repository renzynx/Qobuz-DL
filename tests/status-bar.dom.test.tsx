import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ActivityIcon } from 'lucide-react';
import { StatusBarProvider, useStatusBar } from '@/lib/status-bar/context';
import { createJob, getActiveQueue } from '@/lib/status-bar/jobs';
import StatusBarContainer from '@/components/status-bar/container';

const settle = () => new Promise((r) => setTimeout(r, 0));

/**
 * The hold under test fires 700ms after the queue empties, so the timer is
 * advanced explicitly rather than awaited in real time.
 */
const advanceHold = async () => {
    await act(async () => {
        vi.advanceTimersByTime(700);
        for (let i = 0; i < 3; i++) await settle();
    });
};

describe('completion hold', () => {
    it('clears the bar after the queued job that filled it finishes', async () => {
        const captured: { setStatusBar?: ReturnType<typeof useStatusBar>['setStatusBar']; statusBar?: ReturnType<typeof useStatusBar>['statusBar'] } = {};
        const Probe = () => {
            const value = useStatusBar();
            captured.setStatusBar = value.setStatusBar;
            captured.statusBar = value.statusBar;
            return null;
        };

        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            render(
                <StatusBarProvider>
                    <Probe />
                </StatusBarProvider>
            );

            const setStatusBar = captured.setStatusBar!;

            await act(async () => {
                // The production path: the download job mirrors progress into
                // the status bar from inside run(), and createJob's finally
                // clears processing and removes the queue entry.
                createJob({
                    queue: getActiveQueue(),
                    setStatusBar,
                    title: 'Moth To A Flame',
                    icon: ActivityIcon,
                    run: async () => {
                        setStatusBar((prev) => ({
                            ...prev,
                            open: true,
                            processing: true,
                            title: 'Moth To A Flame',
                            description: 'Applying metadata...',
                            progress: 100,
                            complete: true
                        }));
                        await settle();
                    }
                });
                for (let i = 0; i < 8; i++) await settle();
            });

            expect(captured.statusBar?.title).toBe('Moth To A Flame');
            expect(captured.statusBar?.complete).toBe(true);
            expect(getActiveQueue().size).toBe(0);

            await advanceHold();

            expect(captured.statusBar?.title).toBe('');
            expect(captured.statusBar?.description).toBe('');
            expect(captured.statusBar?.complete).toBe(false);
            expect(captured.statusBar?.open).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('status bar container gate', () => {
    it('shows the zone while a job is processing even when the bar was collapsed', async () => {
        // The user collapsed the bar during an earlier download
        // (openPreference=false). A new download must still be visible — the
        // zone gated on `open` alone rendered nothing for the whole job.
        const captured: { setStatusBar?: ReturnType<typeof useStatusBar>['setStatusBar'] } = {};
        const Probe = () => {
            captured.setStatusBar = useStatusBar().setStatusBar;
            return null;
        };

        render(
            <StatusBarProvider>
                <StatusBarContainer />
                <Probe />
            </StatusBarProvider>
        );

        expect(document.querySelector('[data-testid="download-zone"]')).toBeNull();

        await act(async () => {
            captured.setStatusBar!((prev) => ({ ...prev, processing: true, open: false, progress: 40 }));
            await settle();
        });

        // The zone is the top row of the floor dock; the player plate renders
        // beneath it inside the same dock (layout.tsx), so "processing means
        // visible" is what this pins.
        expect(document.querySelector('[data-testid="download-zone"]')).not.toBeNull();
    });
});
