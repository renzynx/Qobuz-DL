'use client';

import { useCallback, useEffect, useState } from 'react';
import { onSearchEvent } from '@/lib/search/bus';

/**
 * The crate: queries this browser has dug before.
 *
 * Real data only — every search the pill publishes pins here, capped and
 * deduped, persisted in localStorage. The rail is a mirror of this, so an
 * untouched install shows an honest empty state.
 */
const KEY = 'crate:searches';
const MAX = 12;

function read(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        const list = raw ? (JSON.parse(raw) as unknown) : [];
        return Array.isArray(list) ? list.filter((e): e is string => typeof e === 'string') : [];
    } catch {
        return [];
    }
}

export function useCrate() {
    const [entries, setEntries] = useState<string[]>([]);

    useEffect(() => {
        setEntries(read());
        return onSearchEvent((query) => {
            setEntries((prev) => {
                const next = [query, ...prev.filter((e) => e !== query)].slice(0, MAX);
                try {
                    window.localStorage.setItem(KEY, JSON.stringify(next));
                } catch {
                    // Quota or disabled storage: the rail still works in-session.
                }
                return next;
            });
        });
    }, []);

    const remove = useCallback((entry: string) => {
        setEntries((prev) => {
            const next = prev.filter((e) => e !== entry);
            try {
                window.localStorage.setItem(KEY, JSON.stringify(next));
            } catch {
                // Same tolerance as above.
            }
            return next;
        });
    }, []);

    return { entries, remove };
}
