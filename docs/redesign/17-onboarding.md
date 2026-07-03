# 17 - Onboarding & Site Setup

> **Context**: Today: Google OAuth -> `/dashboard` -> `DomainManager` (add a raw domain string) -> a tracking-snippet modal (`TrackingScript.tsx`) with a hardcoded URL -> empty dashboard until data arrives. No verification, no guidance, no integration docs beyond two thin pages. Research: Rybbit's verified onboarding is "a single line of code" with 40+ platform integration guides and claims instant realtime data; Sleek offers a one-line script or `npx sleek-analytics init` CLI; Plausible's demo-able dashboard reduces time-to-value perception.

## Overview

A guided first-run flow that takes a new user from sign-in to *seeing their own live data* in under three minutes: create site -> pick installation path -> verify installation with a live listener -> land on a dashboard that already has their first pageview. Time-to-first-data is *the* activation metric for analytics products; every step is designed around it.

## Feature breakdown

- **New-user flow** (auto-triggered when zero sites): welcome step (name optional since Google gives it) -> "Add your first site" (domain + timezone auto-detected + privacy mode choice with plain-language explainer, default stateless) -> installation step -> verification step -> dashboard.
- **Installation step**: tabs per platform - HTML snippet, Next.js, React, Vue, WordPress (plugin instructions), Shopify, Webflow, Framer, Google Tag Manager - each with copy-button code personalized with the real site id (start with these 9; grow toward Rybbit's 40+ as docs pages, one MD file each).
- **Verification** ("waiting for first event"): live status card polling the ingest check endpoint - states: waiting (pulsing) -> "Script detected, waiting for pageview" -> success (confetti-restrained emerald check + "View your dashboard"). Include "Send test traffic" hint (open your site in a new tab) and a troubleshooting accordion (ad-blocker note, proxy recipe link, CSP requirements) - the support-ticket killers.
- **Existing-user add-site**: same flow minus welcome, launched from the sites grid.
- **Empty-dashboard mode**: until a site has ~1 day of data, Overview shows a "getting started" checklist card instead of empty charts: install verified ✓, first pageview ✓, define a goal, invite a teammate, set up custom events - each linking to the feature (drives activation of `08`/`14`/`16`).
- **Demo data option**: "Explore with demo data" on the empty dashboard - loads a public demo site (WebSight's own dashboard via `15`) so users can feel the product before their data accumulates (Plausible's demo-dashboard lesson applied in-product).
- **Small details**: domain input validates + normalizes (strips protocol/www/paths); snippet page reachable forever from site settings (people lose it); resend the snippet by email to a developer ("email this to whoever deploys your site" - a small flow nobody has that fits real teams).

## UI/UX considerations

- One task per screen, generous whitespace, progress dots; the flow uses the landing page's visual language (this is the moment users compare promise to product).
- The snippet block styling should match the landing `Install` section component for continuity.
- Never block: every step skippable ("I'll do this later" -> dashboard in empty mode with the checklist).
- Verification must feel alive: show the actual received event (path, country, device) when it arrives - "we see you, from Berlin, on Chrome" is a magic moment.

## Technical approach

- Flow state: `sites.setup_completed_at` + checklist booleans derived from data (not stored flags - "has a goal" is `exists(goals)`), so the checklist self-completes.
- Verification endpoint: `GET /api/sites/:id/install-status` returns `{scriptSeen, firstEvent}` - `scriptSeen` from a lightweight `HEAD`-style ping the tracker sends on init (or simply first event), `firstEvent` from `events` existence; client polls 3s while the step is open.
- Platform guides: MDX files in `content/integrations/*` rendered under `/docs/integrations/[slug]` (replaces thin `app/(root)/docs` pages; docs get the landing theme).
- The "email snippet" uses `lib/email/` from `16`.

## Frontend implementation

- `app/(app)/onboarding/page.tsx` (multi-step client flow); `components/onboarding/{site-form,install-tabs,verify-card,checklist-card}.tsx`; sites grid gains "Add site" launching the same flow; settings gains "Installation" section reusing `install-tabs`.

## Backend implementation

- `install-status` endpoint; site creation endpoint (already needed by `02`'s `sites`); demo-site share link config (env: `DEMO_SITE_TOKEN`).

## Database changes

- `sites.setup_completed_at timestamptz` (else none - checklist derives from data).

## API requirements

- `POST /api/sites` (create with domain/timezone/privacy_mode), `GET /api/sites/:id/install-status`, `POST /api/sites/:id/email-snippet`.

## Dependencies

- `01` (new snippet), `15` (demo dashboard), `16` (email infra) - email-snippet degrades to copy-only until `16` ships. MDX: `@next/mdx` or `contentlayer`-style (pick `next-mdx-remote` for simplicity).

## Edge cases

- Site never verifies (nudge email after 24h if unverified - via `19` infra; settings shows persistent "not receiving data" banner with troubleshooting); SPA sites where the snippet loads but no pageview logic fires (script-seen vs first-event distinction diagnoses this); localhost testing during onboarding (tracker skips localhost per `01` - the troubleshooting accordion must say so explicitly, top confusion source); domains with existing data re-added (skip verification); ad-blocked verification attempts (detect prolonged script-not-seen + show proxy recipe prominently); users abandoning mid-flow (flow resumes at the incomplete step on next visit).

## Development milestones

1. Site-creation step + normalized domain/timezone/privacy-mode + new snippet display.
2. Verification endpoint + live verify card with received-event echo.
3. Platform guide MDX system + 9 launch integrations + settings installation section.
4. Empty-dashboard checklist + demo-data entry.
5. Email-snippet + 24h nudge (after `16`/`19`).

## Future improvements

- `npx websight init` CLI (Sleek's pattern) that injects the snippet into common frameworks; auto-detect platform from the domain's HTML and preselect the right tab; historical import wizards (Plausible ZIP - Sleek does this; GA4 export) as an onboarding step for switchers; team-onboarding template ("invite your developer" step when the user's role suggests non-technical).
