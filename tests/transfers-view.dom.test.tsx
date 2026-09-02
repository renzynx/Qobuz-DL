import { describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StatusBarProvider, useStatusBar } from '@/lib/status-bar/context';
import TransfersView from '../app/transfers-view';

/**
 * The transfers page is a read over the real status-bar queue: empty shows an
 * honest empty state, jobs render as rows, and the running job shows progress.
 * (A route smoke test: this is the module the shell's Transfers item mounts.)
 */
describe('transfers view', () => {
    const mount = (ui: React.ReactElement) => render(<StatusBarProvider>{ui}</StatusBarProvider>);

    it('shows an honest empty state when nothing has ever been queued', () => {
        mount(<TransfersView />);
        expect(screen.getByText('No departures.')).toBeTruthy();
        expect(screen.getByText('BOARD CLEAR')).toBeTruthy();
    });

    it('renders queued jobs as rows with the running one marked', async () => {
        let setStatusBar: ReturnType<typeof useStatusBar>['setStatusBar'] | undefined;
        const Capture = () => {
            setStatusBar = useStatusBar().setStatusBar;
            return null;
        };
        mount(
            <>
                <Capture />
                <TransfersView />
            </>
        );

        await act(async () => {
            setStatusBar!((prev) => ({
                ...prev,
                processing: true,
                // The ACTIVE job is carried by the status fields, never by
                // `queue` (createJob only lists jobs waiting behind a runner).
                title: 'Random Access Memories',
                progress: 0.42,
                queue: [{ title: 'Discovery', UUID: 'b' }]
            }));
        });

        expect(screen.getByText('Random Access Memories')).toBeTruthy();
        expect(screen.getByText('Discovery')).toBeTruthy();
        expect(screen.getByText('2 IN FLIGHT')).toBeTruthy();
        expect(screen.getByText('42%')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
    });
});
