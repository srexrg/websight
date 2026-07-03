# 21 - Revenue Attribution

> **Context**: Sleek's most distinctive idea (site-claimed): revenue attribution via direct payment-provider integrations - Stripe (restricted API key), Polar (org access token), plus Dodo/Paddle/Lemon Squeezy - positioning "which channel makes money" as the report Plausible-class tools can't answer. Rybbit has nothing here. Prerequisites: `02` (sessions/visitors, UTM/channel enrichment), `08` (goals with values), `14` (server events with `user_id`), `16` (org settings), `19` (API keys/webhook infra). Requires persistent privacy mode or `identify()` for cross-session attribution; stateless sites get same-day attribution only (stated honestly in UI).

## Overview

Connect payment providers, match payments to analytics visitors, and report revenue by channel, source, campaign, page, and goal - "Organic search drove $4,200 this month" - closing the loop from traffic to money. This is the feature that moves WebSight from "nice dashboards" to "business tool", and among privacy-first analytics it is near-white space.

## Feature breakdown

- **Integrations** (v1: Stripe + Polar - Sleek's two documented ones; Paddle/Lemon Squeezy later): connect in site settings with a restricted/scoped key; webhook subscription auto-created where the provider supports it, else manual webhook URL with signing secret shown.
- **Identity matching** (ordered, transparent):
  1. `user_id`: site calls `websight.identify(userId)` and passes the same id to the provider (`client_reference_id` in Stripe Checkout / metadata) - exact match.
  2. Email hash: provider customer email vs `identify()` trait email (SHA-256 both sides, raw email never stored) - strong match.
  3. Session handoff: `websight.track('checkout_started', {checkout_session_id})` matched to the provider session id - exact match for checkout flows.
  Each payment records its match method + confidence; unmatched revenue is shown as "unattributed", never silently dropped or guessed.
- **Attribution models**: last non-direct touch (default) and first touch, computed from the matched visitor's session history (channel/utm at each session); window 90 days (configurable). Multi-touch is explicitly out of scope v1.
- **Revenue screen**: metric cards (Revenue, Transactions, Revenue per visitor, Avg order value + comparison); revenue timeseries; BreakdownCards by channel / source / campaign / landing page / country - each row: revenue, transactions, revenue-per-visitor; toggle first/last-touch; unattributed bucket always visible with its %.
- **Integration elsewhere**: revenue columns opt-in on Sources breakdowns (`04`); goal values superseded by real revenue when linked (`08`); funnels can end in a "payment" step (`09`); AI tools gain `get_revenue` (`20`); digests gain a revenue line (`19`).
- **Refund handling**: refund webhooks post negative adjustments dated to the refund day (revenue is net by default, gross toggleable).

## UI/UX considerations

- Money formatting per provider currency with explicit multi-currency handling: report in each payment's currency, sum only within currency, show tabs per currency if >1 (converting silently lies; offer a fixed-rate display conversion as an opt-in later).
- The match-rate is the health metric of this feature: settings shows "82% of revenue matched to visitors" with a breakdown by method and concrete improvement tips (add `client_reference_id`, call identify earlier) - this transparency is what will make people trust it over Sleek.
- Empty state teaches the identify/checkout wiring with copy-paste code per provider.
- Amounts in JetBrains Mono everywhere, consistent with the metric language.

## Technical approach

- Payments land via provider webhooks (`/api/integrations/:provider/webhook`, signature-verified) into a normalized `payments` table; matching runs at insert (lookup by `user_id`/email-hash/checkout-session against `profiles` and recent events) with a retry pass at +1h and +24h for out-of-order arrivals.
- Attribution computed at match time and stored on the payment row (visitor's ordered sessions from `02`/`07`; last non-direct = walk back from payment time within window skipping `channel='Direct'` unless it is the only touch). Stored, not query-time - payments are low-volume and auditability matters ("why was this attributed to X" panel reads straight off the row).
- Historical backfill on connect: pull last 90 days of payments via provider API, match best-effort (email-hash mostly).
- Keys stored encrypted (Supabase Vault or app-layer AES with `INTEGRATIONS_SECRET`); restricted-scope guidance per provider in the connect UI.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/revenue/page.tsx`; `components/revenue/{connect-cards,match-rate-card,breakdowns,attribution-toggle}.tsx`; settings integrations section; snippet helpers in docs for Stripe Checkout `client_reference_id` wiring.

## Backend implementation

- `lib/integrations/{stripe.ts,polar.ts,types.ts}` (normalize to one `Payment` shape); webhook routes; matcher `lib/revenue/match.ts` (unit-tested against fixture payloads); attribution `lib/revenue/attribute.ts`; queries `lib/analytics/revenue.ts`.

## Database changes

```sql
payment_integrations(id uuid pk, site_id uuid, provider text, credentials_enc bytea,
                     webhook_secret text, status text, connected_by uuid, created_at, last_event_at)
payments(id uuid pk, site_id uuid, provider text, provider_payment_id text,
         amount_cents bigint, currency char(3), kind text check (kind in ('payment','refund')),
         customer_email_hash text, provider_customer_id text, occurred_at timestamptz,
         visitor_id text, user_id text, match_method text, matched_at timestamptz,
         channel text, source text, campaign text, landing_path text, attribution_model text,
         raw jsonb, unique (site_id, provider, provider_payment_id))
```

## API requirements

- `GET/POST/DELETE /api/sites/:id/integrations`; `POST /api/integrations/:provider/webhook`; `GET /api/sites/:id/revenue/{summary,timeseries,breakdown,match-rate}`; backfill trigger endpoint.

## Dependencies

- `stripe` (shared with `18`), Polar SDK or raw fetch; encryption secret env. Hard dependency on `01` identify + persistent mode or checkout-session events for good match rates.

## Edge cases

- Duplicate webhooks (unique constraint + idempotent upsert); test-mode payments (filter by livemode, toggleable for staging); subscriptions (each invoice payment = a payment row; MRR analytics is future scope - avoid rebuilding Baremetrics); zero-amount trials (excluded from revenue, counted as conversions); refunds exceeding original (clamp, flag); visitor with sessions in multiple currencies/sites (site-scoped, safe); GDPR deletes (`07`) cascade to payment visitor links (keep amount, null the visitor); provider disconnect (stop ingest, keep history, banner).

## Development milestones

1. Stripe webhook -> normalized `payments` + test fixtures (no matching yet, "unattributed" only).
2. Matching (user_id, email-hash, checkout-session) + match-rate card + retry passes.
3. Attribution models + Revenue screen with breakdowns.
4. Polar integration + backfill + settings/connect UX + docs.
5. Cross-feature integration (sources columns, goals, digests, AI tool).

## Future improvements

- Paddle/Lemon Squeezy/Dodo; MRR/subscription analytics (churn, LTV by channel - separate plan); multi-touch attribution models; cost-side integrations (ad spend import -> ROAS); currency-normalized reporting with daily FX rates.
