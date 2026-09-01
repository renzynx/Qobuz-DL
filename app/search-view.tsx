'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReleaseCard from '@/components/release-card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QobuzSearchFilters, QobuzSearchResults } from '@/lib/qobuz-dl';
import { getApiClient } from '@/lib/api/client';
import { filterData, filterExplicit, hasMoreResults, isStaleResponse, mergeResults, placeholderCount } from '@/lib/search/results';
import { getTailwindBreakpoint } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useSettings } from '@/lib/settings-provider';
import { useTheme } from 'next-themes';
import CountryPicker from '@/components/country-picker';
import { useCountry } from '@/lib/country-provider';
import { onSearchEvent, onSearchingEvent } from '@/lib/search/bus';

const rowsMap = {
    sm: 3,
    md: 5,
    lg: 6,
    xl: 7,
    '2xl': 7,
    base: 2
};

const MAX_SKELETONS = 30;

const SearchView = () => {
    const { resolvedTheme } = useTheme();
    const [results, setResults] = useState<QobuzSearchResults | null>(null);
    const [searchField, setSearchField] = useState<QobuzSearchFilters>('albums');
    const [query, setQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [searching, setSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string>('');
    const { settings } = useSettings();
    const { country } = useCountry();

    const [scrollTrigger, isInView] = useInView();
    const inFlight = useRef<AbortController | null>(null);
    const requestId = useRef(0);

    // The shell's pill publishes searches on the bus; this view executes them.
    // The handler rides a ref so the subscription binds once while `onSearch`
    // stays live — a dependency-free effect keeps the compiler's memoization.
    const searchHandler = useRef<(query: string) => void>(() => {});
    searchHandler.current = (query: string) => void onSearch(query);

    useEffect(() => {
        const offQuery = onSearchEvent((query) => searchHandler.current(query));
        const offSearching = onSearchingEvent(setSearching);
        return () => {
            offQuery();
            offSearching();
        };
    }, []);

    const routeFor = useCallback(
        (field: QobuzSearchFilters) => {
            const filter = filterData.find((fd) => fd.value === field) || filterData[0];
            return filter.searchRoute ? `/api/${filter.searchRoute}` : getApiClient().routes.search;
        },
        []
    );

    const onSearch = useCallback(
        async (nextQuery: string, searchFieldInput: string = searchField) => {
            const field = searchFieldInput as QobuzSearchFilters;
            const id = ++requestId.current;
            inFlight.current?.abort();
            const controller = new AbortController();
            inFlight.current = controller;

            setQuery(nextQuery);
            setSearchError('');

            try {
                const response = await getApiClient().get<QobuzSearchResults>(
                    routeFor(field),
                    { params: { q: nextQuery, offset: 0 }, country, signal: controller.signal }
                );

                if (id !== requestId.current || controller.signal.aborted) return;

                if (!response.success) {
                    setSearchError(String(response.error ?? 'An error occurred.'));
                    return;
                }

                if (searchField !== field) setSearchField(field);

                const data = response.data;
                const pages = data as unknown as Record<string, unknown>;
                for (const filter of filterData) {
                    if (!pages[filter.value]) pages[filter.value] = { items: [], limit: 0, offset: 0, total: 0 };
                }
                setResults(data);
            } catch (error: any) {
                if (controller.signal.aborted || error?.code === 'ERR_CANCELED') return;
                setSearchError(error?.detail || error?.message || 'An error occurred.');
            } finally {
                if (id === requestId.current) {
                    setLoading(false);
                    setSearching(false);
                }
            }
        },
        [routeFor, searchField, country]
    );

    const fetchMore = useCallback(async () => {
        if (loading) return;
        if (!results || !hasMoreResults(results, searchField)) return;

        const id = ++requestId.current;
        setLoading(true);

        try {
            const response = await getApiClient().get<QobuzSearchResults>(routeFor(searchField), {
                params: { q: query, offset: results[searchField].items.length },
                country
            });

            if (id !== requestId.current) return;
            if (!response.success) return;
            if (isStaleResponse(query, (response.data as QobuzSearchResults | undefined)?.query)) return;

            setResults((previous) => mergeResults(previous, response.data, searchField));
        } catch {
            // Pagination failures are not fatal: the results already on screen
            // stay, and scrolling re-triggers the fetch.
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [loading, results, searchField, query, country, routeFor]);

    useEffect(() => {
        if (searching) return;
        if (results?.switchTo) setSearchField(results.switchTo);
        if (!isInView || !results) return;
        if (hasMoreResults(results, searchField)) void fetchMore();
    }, [isInView, results, searchField, searching, fetchMore]);

    useEffect(() => {
        return () => inFlight.current?.abort();
    }, []);

    const cardRef = useRef<HTMLDivElement | null>(null);
    const [cardHeight, setCardHeight] = useState<number>(0);

    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === element) setCardHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(element);
        return () => resizeObserver.disconnect();
    }, [results, settings.explicitContent, searchField]);

    const [numRows, setNumRows] = useState(0);

    useLayoutEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') setNumRows(rowsMap[getTailwindBreakpoint(window.innerWidth)]);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (country && query) void onSearch(query);
        // Re-running only when the country changes is deliberate: `onSearch`
        // changes identity whenever results do, which would loop.
    }, [country]);

    const visible = useMemo(() => (results ? filterExplicit(results, settings.explicitContent) : null), [results, settings.explicitContent]);
    const page = results?.[searchField];
    const items = useMemo(() => visible?.[searchField]?.items ?? [], [visible, searchField]);
    const skeletons = hasMoreResults(results, searchField) ? Math.min(placeholderCount(page), MAX_SKELETONS) : 0;

    return (
        <>
            {!results && (
                <section className='relative mb-8 overflow-hidden rounded-lg border border-border bg-card' aria-label='Album of the week'>
                    <div className='flex flex-col gap-6 p-6 md:p-10'>
                        <p className='index-numeral'>Album of the week</p>
                        <h1 className='max-w-xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl'>
                            Dug out of the crate, every Monday
                        </h1>
                        <p className='max-w-lg text-sm leading-relaxed text-muted-foreground'>
                            Hand-picked by the operators of this instance — the record they have had on the turntable, in hi-res.
                        </p>
                        <p className='index-numeral'>
                            Start digging with the search above — every result plays here, and any release can be taken with you.
                        </p>
                    </div>
                </section>
            )}

            <div className='space-y-4'>
                <div className='flex flex-col items-start justify-center'>
                    <div className='w-full flex items-center justify-between'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant='ghost'
                                    className='my-2 flex items-center gap-2.5 focus-visible:outline-none select-none shadow-none outline-none !z-[99] px-2 text-xs font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground hover:bg-transparent'
                                >
                                    <span className='inline-block h-px w-4 bg-border transition-colors group-data-[state=open]:bg-primary' />
                                    {searchField}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='start' className='min-w-[10rem]'>
                                <DropdownMenuRadioGroup value={searchField} onValueChange={setSearchField as React.Dispatch<React.SetStateAction<string>>}>
                                    {filterData.map((type, index) => (
                                        <DropdownMenuRadioItem key={index} value={type.value} className='text-xs font-medium'>
                                            {type.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <CountryPicker className='sm:hidden' />
                    </div>
                    {searchError && (
                        <p className='text-destructive w-full text-center font-medium font-mono text-xs tracking-wide'>
                            {typeof searchError === 'object' ? JSON.stringify(searchError) : searchError}
                        </p>
                    )}
                </div>
            </div>

            <div>
                {results && (
                    <div className='my-6 mx-auto w-full max-w-[1600px] pb-20'>
                        <div
                            className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8 w-full px-6 overflow-visible rail-line pl-4 md:pl-8'
                            style={{
                                maxHeight: `${(Math.ceil(items.length / (numRows || 1)) + 2) * (cardHeight + 16)}px`
                            }}
                        >
                            {items.map((result, index) => (
                                <div
                                    key={`${index}-${result.id}-${searchField}`}
                                    className='plate-hang'
                                    style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
                                >
                                    <ReleaseCard
                                        result={result}
                                        resolvedTheme={String(resolvedTheme)}
                                        ref={index === 0 ? cardRef : null}
                                        index={index}
                                    />
                                </div>
                            ))}
                            {[...Array(skeletons)].map((_, index) => (
                                <div key={`skeleton-${index}`} className='relative w-full'>
                                    <Skeleton
                                        className='relative w-full aspect-square group select-none rounded-none overflow-hidden'
                                        ref={index === 0 ? scrollTrigger : null}
                                    />
                                    <div className='h-[40px]'></div>
                                </div>
                            ))}
                        </div>
                        {!hasMoreResults(results, searchField) && (
                            <div className='w-full h-[40px] index-numeral flex items-center justify-center pt-8'>
                                END OF CATALOGUE — {page?.total ?? items.length} {searchField.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default SearchView;
