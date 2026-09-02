# Crate — Design System

Ground truth recorded from the built app (branch `feat/player`), not from
intentions. The direction contract lives in `app/layout.tsx`.

## Identity

**Crate** — a station concourse for music. Listening and file-taking are one
gesture, and the split-flap departure board is the one artifact built for
exactly that job. The visual world is the **Split-Flap Concourse**: matte
black flap faces on brushed steel, Oswald caps in fixed cells, amber lamps.
It replaces both prior worlds — the near-black neon exhibition and the
template-gray Canon shell — wholesale.

## Color — warm drenched dark

Art is the only saturated color. Chrome stays warm and near-neutral.

| Token | Value | Use |
|---|---|---|
| background | `oklch(0.1855 0.0038 84.5)` ≈ #121212 | page ground |
| card | `oklch(0.2386 0.0038 84.5)` ≈ #181818 | raised surfaces, spotlight, transfer rows |
| secondary / accent | `oklch(0.2690 0.0040 84.5)` ≈ #1F1F1F | hover, search pill fill |
| sidebar | `oklch(0.1480 0.0036 84.5)` ≈ #0A0A0A | nav column, mobile legend |
| border | `oklch(0.2980 0.0040 84.5)` | hairlines, one step above ground |
| primary (amber) | `oklch(0.7617 0.1546 70)` ≈ #FFB000 | live state only: active nav dot, running transfer row (lamp-amber), Hi-Res badge, spinner |

Light theme mirrors the mapping with a deeper lime (`oklch(0.7686 0.1647 127.9)`) for contrast.

Lime is **earned, never decorative**: it marks the thing happening right now. No glows (`.lime-lamp*` deleted), no gradients, no film grain on chrome (grain-field survives only as the optional background setting).

## Type

- Geist — all UI text, 13–14px, `tracking-tight`.
- JetBrains Mono (`.index-numeral`) — timings, counts, transfer percentages, section eyebrows ("Your Crate", "IDLE", "1 JOB"). Tabular numerals.
- Instrument Serif — retired from UI (font still loads; only legacy uses remain).

## Shell

Three columns, `min-h-dvh`:

1. **Nav (224px, `bg-sidebar`)** — wordmark + lime square, Home / Search / Transfers (weight-shift + lime dot marks active; fixed legend, never edits terrain), then the crate rail. Below `lg` it collapses to a bottom legend.
2. **Content column** — sticky translucent topbar (`bg-background/80 backdrop-blur`, h-14) carrying the search pill (a shell fixture, self-contained) and portalled actions (settings, changelog, GitHub). Main scrolls under it.
3. **Floor dock** — one sticky unit at `bottom-0 z-[30] max-h-dvh`: download strip row above, player plate row below (hairline between), never two floating bands. The player plate is `shrink-0`; the now-playing sheet grows into the dock budget and scrolls internally.

Searches flow over a window event bus (`lib/search/bus.ts`): the pill publishes `crate:search`; the results view executes and owns the busy truth, broadcasting `crate:searching` back so the pill's spinner clears. Two different trees, one honest loop.

## Surfaces

- **Release cards** — square art, clean: a single lime **Hi-Res** badge when `bitDepth ≥ 24`, hover-revealed controls (`pointer-hover` variant gates them to real pointers), no metadata stamps on art.
- **Transfers** — the live download queue as a page: active job (spinner, lime percentage, cancel) composed from status fields, pending jobs (clock icon) behind it, honest empty state. The sidebar item goes here.
- **Crate rail / Recently dug** — real pinned searches from `localStorage` (`lib/crate.ts`, deduped, cap 12), re-runnable in one click. Empty install shows an honest hint.
- **Player** — bar: art + title + transport; playing state = lime text on the pause glyph, no glow. Sheet: `Now playing` eyebrow, large art, seek constrained to content column, centered karaoke lyrics scrolling the active line to center.

## Motion

Staggered card entrance (`plate-hang`) and wordmark entrance survive from the old world, reduced-motion respected. Nothing else animates except live state: spinner, equaliser marker, progress fill.

## Radius & spacing

`--radius: 0.25rem` (4px) on rows and plates; 8px (`rounded-lg`) on controls, the pill, the spotlight. `--spacing: 0.27rem` base rhythm. One spacing scale, more space above headings than below.

## What this world refuses

Neon-on-black glow, mono stamps over artwork, fake demo content (every surface reads real data or shows an honest empty state), floating corner stacks over the wordmark, two bands fighting over the viewport floor.
