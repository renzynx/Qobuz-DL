/**
 * The bridge between the shell's search pill and whichever view shows results.
 *
 * The pill is a shell fixture and the results grid is page content, two
 * different trees; a custom event is the smallest honest channel between them
 * (React context would lift every search concern into the shell for one
 * consumer). `crate:search` carries the query, `crate:searching` mirrors the
 * pill's busy state so the view can show skeletons in step.
 */
export const SEARCH_EVENT = 'crate:search';
export const SEARCHING_EVENT = 'crate:searching';

export type SearchBusDetail = { query: string };

export function emitSearch(query: string): void {
    window.dispatchEvent(new CustomEvent<SearchBusDetail>(SEARCH_EVENT, { detail: { query } }));
}

export function emitSearching(searching: boolean): void {
    window.dispatchEvent(new CustomEvent<boolean>(SEARCHING_EVENT, { detail: searching }));
}

export function onSearchEvent(handler: (query: string) => void): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<SearchBusDetail>).detail.query);
    window.addEventListener(SEARCH_EVENT, listener);
    return () => window.removeEventListener(SEARCH_EVENT, listener);
}

export function onSearchingEvent(handler: (searching: boolean) => void): () => void {
    const listener = (event: Event) => handler((event as CustomEvent<boolean>).detail);
    window.addEventListener(SEARCHING_EVENT, listener);
    return () => window.removeEventListener(SEARCHING_EVENT, listener);
}
