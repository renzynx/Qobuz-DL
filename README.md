# Qobuz-DL

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frenzynx%2FQobuz-DL&env=QOBUZ_API_BASE,QOBUZ_APP_ID,QOBUZ_SECRET,QOBUZ_AUTH_TOKENS&envDescription=Qobuz%20API%20credentials%20%E2%80%94%20see%20below&envLink=https%3A%2F%2Fgithub.com%2FQobuzDL%2FQobuz-AppID-Secret-Tool)

---

> [!IMPORTANT]
> This repository does not contain any copyrighted material, or code to illegally download music. Downloads are provided by the Qobuz API and should only be initiated by the API token owner. The author is **not responsible for the usage of this repository nor endorses it**, nor is the author responsible for any copies, forks, re-uploads made by other users, or anything else related to Qobuz-DL. Any live demo found online of this project is not associated with the authors of this repo. This is the author's only account and repository.

Qobuz-DL provides a fast and easy way to download music using Qobuz in a variety of codecs and formats entirely from the browser.

## Features

- Download any song or album from Qobuz.
- Re-encode audio provided by Qobuz to a variety of different lossless and lossy codecs using FFmpeg.
- Apply metadata to downloaded songs.
- Optionally embed lyrics fetched from [LRCLIB](https://lrclib.net), including time-synced LRC.
- Search the catalogue by album, track, or artist, with country-aware availability.
- Listen before or instead of downloading, at the highest quality Qobuz offers, with synced lyrics.
- Bulk-download an artist's discography, with ZIP or individual-file output.

## Deploy to Vercel

Click the button above. Vercel detects Next.js automatically — no configuration file is required.

You will be asked for these environment variables during import. All four are required; the app builds and runs without them but every search and download will fail.

| Variable | Example | Notes |
| --- | --- | --- |
| `QOBUZ_API_BASE` | `https://www.qobuz.com/api.json/0.2/` | Rarely needs changing. |
| `QOBUZ_APP_ID` | `123456789` | Obtain with the [App ID/Secret tool](https://github.com/QobuzDL/Qobuz-AppID-Secret-Tool). |
| `QOBUZ_SECRET` | *(hex string)* | Paired with the app ID by the same tool. |
| `QOBUZ_AUTH_TOKENS` | `["your-token"]` | A JSON array. One or more user auth tokens — the array is chosen from at random per request. |

Optional:

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APPLICATION_NAME` | `Qobuz-DL` | Renames the wordmark and metadata. |
| `NEXT_PUBLIC_GITHUB` | *(unset)* | Header link. |
| `NEXT_PUBLIC_DISCORD` | *(unset)* | Header link. |
| `CORS_PROXY` | *(unset)* | Leave empty unless you know what you're doing. |
| `SOCKS5_PROXY` | *(unset)* | Leave empty unless you know what you're doing. |

> [!NOTE]
> To download tracks longer than 30 seconds you need a **valid Qobuz user auth token** from a paying membership. Find it under the `localuser.token` key in localStorage on [play.qobuz.com](https://play.qobuz.com/) while signed in, and put it in `QOBUZ_AUTH_TOKENS`.

See [`.env.example`](.env.example) for a copy-pasteable set.

## Table of Contents

- [Deploy to Vercel](#deploy-to-vercel)
- [Installation](#installation)
- [Getting your Qobuz credentials](#getting-your-qobuz-credentials)
- [Docker](#docker)
- [Development](#development)
  - [Country tokens](#country-tokens)
  - [Lyrics](#lyrics)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Installation

Before you begin, ensure you have **Node.js** LTS installed ([download](https://nodejs.org/)). Check with:

```bash
node -v
```

### 1. Clone the repo

```bash
git clone https://github.com/renzynx/Qobuz-DL.git
```

### 2. Navigate to the project directory

```bash
cd Qobuz-DL
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` and fill in your credentials — see [Getting your Qobuz credentials](#getting-your-qobuz-credentials). The default configuration will NOT work.

### 5. Run the development server

```bash
npm run dev
```

## Getting your Qobuz credentials

1. **App ID and secret** — use the [Qobuz AppID/Secret tool](https://github.com/QobuzDL/Qobuz-AppID-Secret-Tool). These identify the client and are required for any API call.
2. **User auth token** — sign in at [play.qobuz.com](https://play.qobuz.com/), open your browser's developer tools, and read the `localuser.token` value from localStorage. A paying membership is required for full-length downloads.

`QOBUZ_AUTH_TOKENS` accepts a JSON array, so you can supply several and the app will pick one per request:

```env
QOBUZ_AUTH_TOKENS = ["token-one","token-two"]
```

## Docker

### 1. Build the image

```bash
docker build -t qobuz-dl .
```

### 2. Run with compose

```bash
docker-compose up -d
```

Pass credentials with an env file:

```bash
docker run --env-file .env -p 3000:3000 qobuz-dl
```

## Development

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (run once)
npm run test:watch # Vitest (watch)
```

The app requires no environment variables to build — a missing `NEXT_PUBLIC_APPLICATION_NAME` falls back to `Qobuz-DL` rather than failing the build.

### Country tokens

Availability and pricing vary by country. To pin tokens per country instead of choosing at random, populate `config/token-countries.ts`:

```ts
export const tokenCountriesMap: TokenCountry[] = [
    { code: 'US', token: 'TOKEN HERE' }
];
```

When this list is non-empty it takes precedence over `QOBUZ_AUTH_TOKENS`, and the UI exposes a country picker.

### Lyrics

Lyrics are fetched from [LRCLIB](https://lrclib.net), a free and open lyrics
database. Enable **Fetch lyrics** in Settings → Output Settings.

- **Off by default.** Each track costs one request to a third-party service, so
  it is opt-in rather than something every download pays for.
- **A miss never fails a download.** Most tracks have no entry; the file is
  written without lyrics and the download completes.
- **Synced lyrics** — when LRCLIB has timed LRC text and *Prefer synced lyrics*
  is on, it is written to `synced-lyrics` alongside the plain text in `lyrics`.
  Players that support it (Apple Music, Poweramp, foobar2000) highlight the line
  as it is sung.
- **Requires metadata to be enabled, and is unavailable for WAV**, which carries
  no tags at all. The setting is disabled in that case.

Lyrics are written as standard tags, so no additional tooling is needed to read
them.

## Architecture

The codebase is organised so each module is **deep**: a small interface with a
lot of behaviour behind it, placed at a seam where something genuinely varies.

| Module | Responsibility | Adapters behind the seam |
| --- | --- | --- |
| `lib/persisted-config.tsx` | localStorage read/validate/write rhythm | `localStorage` in the browser, in-memory fake in tests |
| `lib/settings-schema.ts` | What a valid `Settings` is | `zod`; `SettingsProps` is inferred from the schema |
| `lib/api/` | `/api/*` envelope, country header, error mapping | Client transport is injected |
| `lib/status-bar/queue.ts` | Serial job execution | Driven by promise completion, no polling |
| `lib/transcode.ts` | Encoding decisions, argv, metadata | ffmpeg.wasm and the FLAC worker |
| `lib/search/results.ts` | Pagination merge, skeleton count, explicit filter | Pure functions over `(previous, page)` |

Conventions worth knowing before changing anything:

- **`lib/` must not import from `components/`.** Types and logic that a view
  displays live in `lib/`; the view imports them. This keeps `lib/` testable
  without mounting React.
- **Prefer a seam with two adapters.** One adapter means the seam is
  hypothetical; two means it is real. If you add an interface, name the second
  implementation, including the test fake.
- **Validate at the boundary.** Settings come from localStorage and catalogue
  data comes from Qobuz; both are untrusted and are parsed by a schema, never
  cast with `as`.

## Testing

```bash
npm test           # Vitest, run once
npm run test:watch # Vitest, watch
npm run typecheck  # tsc --noEmit
```

Tests live in `tests/`. Most run in a plain Node environment because the
modules they cover do not need a DOM; name a file `*.dom.test.tsx` when it
does.

## Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Make your changes.
4. Add tests for behaviour changes — `npm test` must pass, along with `npm run typecheck`, `npm run lint`, and `npm run build`.
5. Push your branch: `git push origin feature-name`.
6. Create a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
