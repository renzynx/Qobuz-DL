'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '../ui/button';
import { ArrowRightIcon, Loader2Icon, SearchIcon } from 'lucide-react';
import { Label } from '../ui/label';
import { getApiClient } from '@/lib/api/client';
import { QobuzSearchResults } from '@/lib/qobuz-dl';
import AutocompleteCard from './autocomplete-card';
import { useCountry } from '@/lib/country-provider';
import CountryPicker from '../country-picker';
import { emitSearch, onSearchingEvent } from '@/lib/search/bus';

/**
 * The shell's search pill: self-contained state, publishing through the
 * search bus. It owns the query and the busy flag; the results view listens.
 */
const SearchBar = () => {
    const [searchInput, setSearchInput] = useState('');
    const [results, setResults] = useState<QobuzSearchResults | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showCard, setShowCard] = useState(false);
    const [searching, setSearching] = useState<boolean>(false);
    const [controller, setController] = useState<AbortController>(new AbortController());

    const inputRef = useRef<HTMLInputElement>(null);
    const { country } = useCountry();

    useEffect(() => {
        if (inputRef.current) setSearchInput(inputRef.current.value);

        const handleKeydown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    }, []);

    useEffect(() => {
        if (searching) controller.abort();
    }, [searching]);

    const fetchResults = async () => {
        controller.abort();
        if (searchInput.trim().length === 0) {
            return;
        }

        setLoading(true);

        const newController = new AbortController();
        setController(newController);

        try {
            setTimeout(async () => {
                try {
                    // Params are form-encoded by the client, so a query containing
                    // `&`, `#` or `+` reaches the server intact instead of being
                    // split into extra parameters.
                    const response = await getApiClient().get<QobuzSearchResults>(getApiClient().routes.search, {
                        params: { q: searchInput, offset: 0 },
                        country,
                        signal: newController.signal
                    });
                    if (response.success) setResults(response.data);
                } catch {}
            }, 200);
        } catch {}

        setLoading(false);
    };

    useEffect(() => {
        fetchResults();
    }, [searchInput]);

    // The results view owns the busy truth and broadcasts it; the pill only
    // mirrors, so a search finishing anywhere clears the spinner.
    useEffect(() => onSearchingEvent(setSearching), []);


    const pill = (
        <div className='flex items-center gap-2 relative w-full'>
            <div
                onClick={() => inputRef.current?.focus()}
                className='flex w-full items-center gap-2 rounded-full border border-border bg-secondary/80 py-1 pl-3 pr-1 tracking-wide font-medium transition-colors focus-within:border-primary hover:bg-secondary'
            >
                <Label htmlFor='search' className='flex shrink-0 items-center pl-1 pr-1'>
                    <SearchIcon className='!size-4 text-muted-foreground' />
                </Label>
                <Input
                    id='search'
                    className='focus-visible:outline-none focus-visible:ring-transparent select-none shadow-none outline-none border-none bg-transparent h-8 px-1 text-sm placeholder:text-muted-foreground/70 placeholder:font-light'
                    ref={inputRef}
                    placeholder='Search for anything...'
                    value={searchInput}
                    autoComplete='off'
                    onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                        setShowCard(true);
                        if (event.currentTarget.value.trim().length > 0) fetchResults();
                    }}
                    onBlur={() => setTimeout(() => setShowCard(false), 50)}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                        const target = event.currentTarget as HTMLInputElement;
                        if (event.key === 'Enter') {
                            setShowCard(false);
                            if (target.value.trim().length > 0 && !searching) {
                                setSearching(true);
                                emitSearch(target.value.trim());
                            }
                        }
                    }}
                    onChange={(event) => {
                        setSearchInput(event.currentTarget.value);
                    }}
                />
                <div className='flex'>
                    <CountryPicker className='hidden sm:flex' />
                </div>
            </div>
            <Button
                size='icon'
                className='size-7 shrink-0 rounded-full bg-primary text-primary-foreground hover:text-primary-foreground hover:bg-primary'
                variant='ghost'
                onClick={() => {
                    if (searchInput.trim().length > 0 && !searching) {
                        setSearching(true);
                        emitSearch(searchInput.trim());
                    }
                }}
                disabled={searching || !(searchInput.trim().length > 0)}
            >
                {searching ? <Loader2Icon className='animate-spin' /> : <ArrowRightIcon />}
            </Button>
            <AutocompleteCard
                searchInput={searchInput}
                showCard={showCard}
                searching={searching}
                setSearching={setSearching}
                results={results}
                loading={loading}
                onSearch={(q: string) => {
                    setSearching(true);
                    emitSearch(q);
                }}
            />
        </div>
    );

    return pill;
};

export default SearchBar;
