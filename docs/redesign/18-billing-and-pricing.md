# 18 - Billing & Pricing

> **Context**: No billing exists - pricing is static marketing copy in `lib/landing/content.ts` (Hobby $0 / Pro $9 / Business $29, annual -20%) rendered by `components/landing/Pricing.tsx`. Research benchmarks: Rybbit cloud - free tier (~3k pageviews/mo), Standard $13/mo (100k pageviews, 5 sites, 3 members), Pro $26/mo (unlimited sites/members, replays, 5-year retention), 7-day trial; Sleek - event-based ($9/50k, $19/500k, $49/2M events), 3-day trial, no card; Plausible starts ~$9/10k pageviews, no free tier. Orgs (`16`) are the billing container; `02`'s rollups provide usage counts.

## Overview

Stripe-based subscription billing at the org level with usage metering on monthly events (pageviews + custom events, matching Sleek's honest accounting: heartbeats and blocked traffic don't count). Free tier for hobbyists (Rybbit proves it drives adoption vs Plausible's trial-only), simple three-tier ladder, soft limits with grace - never silently drop a paying-intent user's data.

## Feature breakdown

- **Plans** (align landing copy once shipped):
  - *Hobby $0*: 10k events/mo, 2 sites, 1 member, 6-month data retention, community support.
  - *Pro $9/mo* ($7 annual): 100k events/mo, 10 sites, 5 members, 3-year retention, email reports, remove powered-by badge (`15`).
  - *Business $29/mo* ($24 annual): 1M events/mo, unlimited sites/members, 5-year retention, priority support. Overage: metered per-10k-events add-on rather than hard cutoff.
- **Usage metering**: org-level monthly event count from `02` rollups (summed across sites); live usage bar in billing settings + sidebar nudge at 80%/100%.
- **Limit behavior** (the trust-critical design): at 100% - banner + email; ingestion continues for a 20% grace buffer; beyond grace on Hobby, events are dropped *with a visible "data gap" annotation on charts* (never silent - the anti-pattern users hate); paid plans never drop (metered overage).
- **Billing screens** (`/org/billing`, owner-only): current plan card, usage meter with per-site breakdown, upgrade/downgrade with proration handled by Stripe, invoices list (Stripe-hosted), payment method via Stripe Customer Portal (build minimal UI, delegate hard parts to the portal).
- **Trials**: Pro features free for 14 days at signup (no card - Sleek-style), auto-downgrade to Hobby at expiry with feature-loss preview email 3 days prior.
- **Enforcement points**: site count at creation, member count at invite (`16`), retention at query/purge (`02` partition drops), badge removal (`15`), email reports (`19`).

## UI/UX considerations

- The usage meter must be glanceable and honest (events counted, what doesn't count, reset date).
- Upgrade prompts appear at the moment of hitting a limit (creating site #3 on Hobby) with the specific limit named - never generic "upgrade" nags.
- Downgrade flow states consequences explicitly (sites over limit become read-only, not deleted; data past new retention scheduled for deletion in 30 days with export prompt).
- Landing `Pricing.tsx` and billing plans must render from one shared `lib/billing/plans.ts` config - today's copy drift risk eliminated.

## Technical approach

- Stripe Products/Prices mirror `lib/billing/plans.ts`; org -> `stripe_customer_id`, subscription state cached in `org_subscriptions` updated exclusively by webhook (`checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid/payment_failed`) - webhook is the single source of truth, UI reads the cache.
- Metering: nightly `pg_cron` sums org events into `org_usage(org_id, month, events)`; ingest-path check reads a cached (5-min) usage snapshot - the hot path must never query Stripe or heavy aggregates.
- Grace/drop logic in `ingest_event` guard (cheap: compare cached usage vs plan limit); dropped counts recorded per site/day for the data-gap annotation.
- Checkout via Stripe Checkout Session; portal via Stripe Billing Portal (payment methods, invoices).

## Frontend implementation

- `app/(app)/org/billing/page.tsx`; `components/billing/{plan-card,usage-meter,upgrade-dialog,limit-banner}.tsx`; chart data-gap annotation in `TimeseriesChart` (`03`); nudges in sidebar (`03`).

## Backend implementation

- `app/api/billing/{checkout,portal,webhook}/route.ts` (webhook signature-verified, idempotent by event id); `lib/billing/{plans.ts,stripe.ts,usage.ts,limits.ts}`; enforcement helpers (`assertCanCreateSite(org)` etc.) called by `02`/`16`/`15`/`19` endpoints; retention purger (`pg_cron` drops partitions per plan retention).

## Database changes

```sql
org_subscriptions(org_id uuid pk, stripe_customer_id text, stripe_subscription_id text,
                  plan text, status text, current_period_end timestamptz, cancel_at timestamptz, updated_at)
org_usage(org_id uuid, month date, events bigint, updated_at, pk (org_id, month))
ingest_drops(site_id uuid, day date, dropped bigint, pk (site_id, day))
```

## API requirements

- `POST /api/billing/checkout` (plan+interval -> session URL), `POST /api/billing/portal`, `POST /api/billing/webhook`, `GET /api/orgs/:id/usage`.

## Dependencies

- `stripe` (new); `16` (orgs, owner role), `02` (rollups, partitions), email infra (`16`/`19`) for limit/trial emails.

## Edge cases

- Webhook delivery lag vs user staring at "processing" (poll subscription cache with optimistic UI + Stripe session status fallback); failed payments (Stripe smart retries; `past_due` = banner + 14-day feature hold, not instant downgrade); annual->monthly switches and proration (delegate to Stripe, display its preview); org deletion with active subscription (cancel first, enforced); usage spanning plan changes mid-month (limits apply pro-rata: use the higher limit for the month - generous and simple); clock month boundaries in org timezone vs UTC (bill in UTC, display both); self-hosters (all billing code behind `BILLING_ENABLED` env so OSS deployments run clean - Rybbit's OSS/cloud split done cheaply).

## Development milestones

1. `lib/billing/plans.ts` + landing pricing unification (ship independently, kills copy drift).
2. Stripe customer/checkout/webhook + subscription cache + billing screen (no enforcement).
3. Usage metering + meter UI + nudges.
4. Enforcement (sites/members/limits/grace/drops with annotations) + trial lifecycle.
5. Retention purging + downgrade flows + `BILLING_ENABLED` gating.

## Future improvements

- Usage-based auto-scaling tier (pay-per-event beyond Business); team-seat add-ons; agency plan (white-label + client billing); nonprofit/OSS discounts (Plausible-style goodwill lever); revenue-share affiliate for the powered-by badge network.
