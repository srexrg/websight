# 01 - Tracking Script & SDK

> **Context**: WebSight is a Next.js 16 + Supabase analytics product. Current tracker: `public/tracker.js` (plain JS, UTF-16 encoded file, hardcoded `https://websight.srexrg.me` endpoint, localStorage visitor id, sessionStorage session id with 30-min expiry, sendBeacon POST to `/api/track`). It auto-fires `pageview`, `session_start`, `session_end`, `outbound_click`, `download`, `form_submit` - but the API rejects everything except `session_start`/`pageview`. Embed: `<script defer data-site="<domain>" src=".../tracker.js">`.

## Overview

Rewrite the tracker as a TypeScript-built, sub-3KB gzipped script plus an npm package, with a selectable privacy mode, batched transport, SPA support, and capture hooks for Web Vitals and errors. Research benchmark: Plausible ships 1.9KB transfer, Fathom 3.0KB, Umami 3.2KB, while Rybbit ships 9.3KB transfer / 26KB decoded - being feature-rich *and* under 3KB is a genuine differentiator. Rybbit also launched without a server-side API or `identify()`; we ship both from day one.

## Feature breakdown

- **Core auto-capture**: `pageview` (initial + SPA navigations via History API patch, not click heuristics), `session` handled server-side (see `02`), outbound clicks, file downloads, `form_submit` - all actually accepted by the ingestion API this time.
- **Custom events**: `window.websight.track(name, props?)` where `props` is a flat JSON object (Rybbit-style "custom events with JSON properties"). Also `data-ws-event="signup"` HTML attribute capture for no-code events (Plausible/Fathom pattern).
- **identify()**: `websight.identify(userId, traits?)` - opt-in, only active in persistent mode; fills the gap Rybbit launched with.
- **Web Vitals capture**: LCP, CLS, INP, FCP, TTFB via a lazy-loaded extension chunk (keeps core small). See `12-web-vitals.md`.
- **Error capture**: `window.onerror` / `unhandledrejection` via the same lazy extension. See `13-error-tracking.md`.
- **Privacy modes** (per-site setting, sent as `data-mode` or configured server-side):
  - `stateless` (default): no client storage at all; visitor identity computed server-side via daily-rotating salted hash of IP + UA (Plausible's model - strongest "no consent banner" claim).
  - `persistent`: localStorage visitor id (Rybbit's model - enables cross-day retention and user profiles). The dashboard shows which analyses require persistent mode.
- **Transport**: `sendBeacon` with `fetch(keepalive)` fallback; events batched (queue flushed at 3 events or 2s or `visibilitychange`); honors `navigator.doNotTrack` only if site opts in.
- **Config via data attributes**: `data-site` (required), `data-mode`, `data-api` (self-host endpoint override), `data-exclude` (path globs), `data-track-outbound`/`data-track-downloads` toggles, `data-hash` (hash-based routing).
- **Localhost/ignore guard**: skip `localhost` and a `websight_ignore` localStorage flag (lets site owners exclude themselves - a small detail every competitor has and WebSight lacks).
- **npm package** `@websight/js`: typed `init/track/identify`, framework wrappers later (`@websight/next` first since our own docs target Next.js).

## UI/UX considerations

- The snippet shown in `components/analytics/TrackingScript.tsx` and docs must be one line, copyable, with the site's real domain injected.
- Docs pages get per-framework tabs (Next.js, React, Vue, WordPress, Shopify, plain HTML) - Rybbit's 40+ integration guides are a real onboarding asset; start with 6.
- A "waiting for first event" live status in onboarding (see `17-onboarding.md`) depends on the script POSTing quickly - flush the first pageview immediately, batch only subsequent events.

## Technical approach

- New source at `packages/tracker/src/index.ts` (repo stays a single app; `packages/` holds build-only workspaces). Build with `tsup`/esbuild, IIFE + minify + gzip-size CI check (< 3072 bytes hard budget for core).
- Output written to `public/t.js` (short name; also serve legacy `public/tracker.js` as an alias during migration). Endpoint resolved as `data-api` -> `new URL(script.src).origin + '/api/track'` - removes hardcoded production URLs.
- Extensions (`vitals`, `errors`) are separate chunks (`public/t-x.js`) dynamically imported only when the site has those features enabled (flag embedded in a lightweight `/api/config?site=` response cached 1h, or simpler: `data-vitals`/`data-errors` attributes).
- Payload schema (single shape for all events):
  ```json
  { "site": "example.com", "name": "pageview", "url": "/pricing?x=1", "ref": "https://google.com",
    "title": "Pricing", "w": 1440, "h": 900, "lang": "en-US", "vid": "<only in persistent mode>",
    "uid": "<only after identify()>", "props": {"plan": "pro"}, "ts": 1730000000000, "sdk": "js@2.0.0" }
  ```
  Query string stripped client-side except `utm_*`, `ref`, `source` (Plausible pattern).

## Frontend implementation

- `packages/tracker/src/index.ts`: bootstrap (read data attrs), queue + transport, history patch (`pushState`/`replaceState` wrap + `popstate`), click delegate for outbound/download/`data-ws-event`, public API object on `window.websight` with a pre-init command queue (`window.websight = window.websight || function(){(websight.q=websight.q||[]).push(arguments)}` snippet compatibility).
- Update `TrackingScript.tsx` modal and `app/(root)/docs/*` to the new snippet; keep showing the legacy snippet as deprecated.
- Self-tracking: `app/layout.tsx` currently injects the old tracker with a hardcoded URL - switch to the new script served from own origin, env-driven site name.

## Backend implementation

Ingestion-side changes live in `02-ingestion-and-data-model.md`. This plan requires: `/api/track` accepts the new payload schema and batched arrays, plus all auto-capture event names.

## Database changes

None directly (see `02`). Site-level settings (`privacy_mode`, `vitals_enabled`, `errors_enabled`, `excluded_paths`) belong on the `sites` table defined there.

## API requirements

- `POST /api/track` - accepts single object or array (batch), returns `202` empty body, CORS restricted per `02`.
- Optional `GET /api/config?site=` - public, cacheable, returns enabled extensions.

## Dependencies

- Build: `tsup` (or esbuild directly), `size-limit` for the CI budget. Runtime: zero dependencies (hand-roll; `web-vitals` library only inside the lazy vitals chunk, ~1.5KB).

## Edge cases

- SPA route changes that only change hash (`data-hash` mode); `replaceState` loops (dedupe identical consecutive URLs).
- Ad blockers: serve from the customer's own domain via a documented proxy/rewrite recipe (Next.js `rewrites`, nginx, Cloudflare) - mitigates Rybbit's blocklist problem; keep script path generic (`/t.js`, first-party fetch to `/api/track` when proxied).
- `sendBeacon` 64KB limit (batch cap), Safari private mode localStorage throws (try/catch, degrade to stateless), bots executing JS (server-side UA filtering per `02`), prerender/bfcache (`document.prerendering`, `pageshow` with `persisted`).
- Duplicate script tags on page (guard via `window.__ws_loaded`).

## Development milestones

1. Core script (pageview + custom events + transport + config), size CI gate, served at `/t.js`.
2. Auto-capture (outbound/download/form/`data-ws-event`) + ingestion acceptance end-to-end.
3. Privacy modes + `identify()` + localhost/self-exclusion.
4. Lazy extension chunks (vitals, errors) behind site flags.
5. `@websight/js` npm package + proxy recipe docs + snippet UI updates.

## Future improvements

- `@websight/next`, `@websight/react` wrappers; server-side SDKs (Node) once `/api/track` accepts server tokens; scroll-depth and engaged-time (Plausible's "views per visit"/engagement metrics); consent-aware mode switcher API (`websight.setMode()`); tag-manager template.
