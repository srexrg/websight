# 15 - Public Dashboards & Sharing

> **Context**: Everything in WebSight is behind Google OAuth today. Sleek verifies "public read-only dashboards viewable without login" as a headline feature; Plausible popularized the pattern (its own live demo dashboard is its best marketing asset); Rybbit's marketing mentions shareable dashboards (the specific RBAC/password claims did not verify, so treat those as our design space, not copied fact). Prerequisites: `03` (shell/screens), `04` (overview), `06` (realtime endpoints).

## Overview

Let a site owner publish a read-only version of their dashboard at a shareable URL - fully public, unlisted (secret link), or password-protected - plus embeddable stat widgets. Beyond user value, a public dashboard for WebSight's own site is the strongest possible landing-page proof (link the landing hero's fake product shot to the real thing).

## Feature breakdown

- **Share settings** (per site, in Settings): visibility = private (default) / secret link / public; optional password (secret+public); toggles for which screens are exposed (Overview always; Realtime, Globe, Pages, Sources, Audience optional); "hide custom events/goals" toggle (business-sensitive data stays private by default).
- **Public view**: `/{share}/[token]` renders the dashboard shell minus auth chrome: site name + favicon, date-range picker (presets only), the exposed screens as tabs, full breakdown cards with click-to-filter working read-only (filters are the delight of Plausible's demo - keep them), live pill if Realtime exposed, "Powered by WebSight" footer badge (subtle growth loop; removable on paid plans per `18`).
- **Revocation & rotation**: regenerate token invalidates old links instantly; password changes likewise.
- **Embeds**: `<iframe>` (or script) stat widgets - "live visitors" badge and a mini stats card (visitors/pageviews for a period) - themable light/dark, for READMEs and footers.
- **Small details**: public pages get proper OG images (auto-generated stats snapshot via `@vercel/og`) so shared links unfurl beautifully in Slack/X - none of the inspirations do this well; noindex header on secret links; public mode optionally indexable.

## UI/UX considerations

- The public view is the product demo: it must load fast (static-ish shell, cached queries), look perfect on mobile, and show the theme toggle.
- Password gate is a minimal centered card matching brand; wrong-password state friendly.
- Sharing settings need explicit copy about what becomes visible ("Anyone with this link can see traffic data, top pages, sources...") with a preview button.
- Filter/UI state in public URLs must be shareable too (nuqs params work unchanged).

## Technical approach

- `share_tokens` row per site with `visibility`, `password_hash` (bcrypt - `bcryptjs` already in deps), `exposed_screens jsonb`, `token` (24-char random, URL-safe). Public routes run the same `lib/analytics/queries.ts` fetchers with a share-token auth context instead of user session - one `resolveSiteAccess(request)` helper returns `{siteId, scope: 'member'|'share'}` and every route handler uses it (prevents the classic bug of forking public query paths).
- Password success sets a scoped httpOnly cookie (`ws_share_<token>`), TTL 7 days.
- Caching: public fetchers get `s-maxage=60, stale-while-revalidate=300` (data freshness is not sensitive here); realtime endpoints keep 10s cadence but rate-limit per IP.
- Routes: `app/(public)/share/[token]/{page,realtime,...}.tsx` reusing dashboard components with a `readOnly` context flag (hides CRUD affordances).

## Frontend implementation

- `components/share/{share-settings-card,password-gate,powered-badge,embed-generator}.tsx`; dashboard components gain a `ShareContext` (readOnly, exposedScreens); OG image route `app/(public)/share/[token]/opengraph-image.tsx`.

## Backend implementation

- Token CRUD + rotation endpoints; `resolveSiteAccess` middleware-style helper; embed endpoints returning minimal JSON (`/api/share/:token/badge`) with permissive CORS (these are intentionally public).

## Database changes

```sql
share_tokens(id uuid pk, site_id uuid unique, token text unique, visibility text
             check (visibility in ('secret','public')), password_hash text,
             exposed_screens jsonb default '["overview"]', hide_events bool default true,
             created_by uuid, created_at, rotated_at)
```

## API requirements

- `GET/POST/PATCH/DELETE /api/sites/:id/share`; `POST /api/share/:token/unlock` (password); public read endpoints = existing fetchers via `resolveSiteAccess`; `GET /api/share/:token/badge`.

## Dependencies

- `bcryptjs` (present), `@vercel/og` (new, for OG images). Requires `03`/`04`; `06` optional.

## Edge cases

- Token brute force (rate-limit unlock + token entropy is sufficient); site deleted while shared (404 gracefully); screens exposed that later gain sensitive features (new screens default to NOT exposed); embeds in sandboxed iframes (no cookies - badge endpoints must be tokenized, not cookie-authed); crawlers hammering public realtime endpoints (cache + robots rules); date ranges capped on public views (e.g. max 12 months) to bound query cost; a user pasting the secret URL into public chat (rotation exists; show last-accessed stats on the settings card so owners notice unexpected traffic).

## Development milestones

1. Schema + share settings UI + `resolveSiteAccess` + public Overview route (secret links).
2. Password protection + screen exposure toggles + rotation.
3. Realtime/Globe public screens + caching/rate limits.
4. OG images + embed widgets + powered-by badge.
5. WebSight's own public dashboard linked from the landing page.

## Future improvements

- Team-scoped share links with expiry dates; per-link analytics (view counts); white-label public dashboards (custom domain + logo, agency feature pairing with `16`/`18`); scheduled public "weekly snapshot" pages (pairs with `19` digests).
