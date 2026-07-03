# 20 - AI Insights & Chat

> **Context**: Sleek's headline differentiator is "AI chat that answers plain-English questions about analytics data" (site-claimed; its HN feedback also asked for drill-down depth the AI lacks). Rybbit has no AI surface - this is white space among privacy-first tools. Prerequisites: the typed query layer (`lib/analytics/queries.ts` from `02`), filters (`05`), goals (`08`). This plan uses the Claude API (model `claude-sonnet-5` for chat, `claude-haiku-4-5-20251001` for cheap summarization jobs).

## Overview

Two AI surfaces, built on one principle - **the model composes calls to the existing typed query functions; it never writes SQL and never sees raw events**:
1. **Ask WebSight**: a chat panel that answers questions ("why did traffic spike Tuesday?", "top converting sources this month vs last?") by calling analytics tools and responding with numbers + inline mini-charts + applied-filter links.
2. **Insight digests**: proactive natural-language findings ("Signups from Organic dropped 31% WoW, driven by /blog/launch losing its Google position") surfaced as a card on Overview and woven into email digests (`19`).

## Feature breakdown

- **Chat panel**: slide-over sheet available on every dashboard screen (`cmd+j`); context-aware (current site, date range, active filters are the default scope); streaming responses; every numeric claim is accompanied by the tool call it came from, rendered as an expandable "how I got this" trace - trust through provenance, the thing AI analytics features usually lack.
- **Tool set exposed to the model** (mirrors the query layer): `get_metrics`, `get_timeseries`, `get_breakdown`, `get_goal_stats`, `compute_funnel`, `get_retention`, `compare_ranges`, `list_goals/segments` - each with zod-validated params identical to the internal fetchers.
- **Actionable answers**: responses can emit UI actions - "Apply these filters" chip (deep-links via the `05` URL codec), "Save as segment", "Create this goal" (prefilled dialog) - the answer becomes a starting point, not a dead end.
- **Insight engine (proactive)**: nightly job per active site computes deterministic candidate findings (significant WoW/DoD deltas on metrics, dimensions, and goals via simple z-scores on the rollups - no LLM), then `claude-haiku` ranks/phrases the top 3 into one readable card. Deterministic detection + LLM phrasing keeps cost near zero and hallucination surface minimal.
- **Rate/cost containment**: chat capped per plan (`18`: Hobby 10 msgs/day, Pro 100, Business 1000); insights only for sites above a minimal traffic floor (deltas on 12 visits are noise).
- **Privacy stance** (marketing-critical for this audience): only aggregates leave the database; no visitor-level data, paths only as aggregated rows; a settings toggle disables AI entirely per org; document the data flow in `/docs/ai-privacy`.

## UI/UX considerations

- Chat renders metric answers as MetricCard-mini + sparkline components (structured tool results -> components, not markdown tables of numbers).
- Suggested questions on open, seeded from site state ("What changed this week?", "Where do converters come from?") - empty chat boxes stall users.
- The insight card on Overview is one finding + "2 more" expander, dismissible, never blocking layout; wrong/unhelpful insights get a thumbs-down that tunes the traffic floor and delta thresholds per site.
- Honest failure: when a question needs data WebSight doesn't have (e.g. "revenue by cohort" before `21`), the model says so and links the relevant enable/setup - wire this into the system prompt with a capability manifest.

## Technical approach

- Route: `POST /api/ai/chat` (streaming) using `@anthropic-ai/sdk` tool-use loop server-side; tools dispatch to `lib/analytics/queries.ts` with the caller's site access enforced *outside* the model (site id is bound server-side from the session, never model-chosen).
- System prompt: capability manifest (available tools, site metadata, active goals/segments, current range/filters), answer-style rules (numbers verbatim from tools, state ranges/filters used, no extrapolation).
- Conversation state: last ~10 turns kept server-side per session (`ai_conversations` row), tool results summarized/truncated to control tokens.
- Insight job: `app/api/cron/insights` -> deterministic detectors in `lib/ai/detectors.ts` (pure, unit-tested) -> haiku phrasing -> `insights` rows consumed by Overview card and digests.

## Frontend implementation

- `components/ai/{chat-sheet,message,tool-trace,insight-card,suggestion-chips}.tsx`; `cmd+j` in the shell (`03`); streaming via fetch + ReadableStream into the sheet.

## Backend implementation

- `app/api/ai/chat/route.ts` (auth, plan-limit check, tool loop, stream); `lib/ai/{tools.ts,prompt.ts,detectors.ts}`; insights cron; org AI toggle honored at both endpoints.

## Database changes

```sql
ai_conversations(id uuid pk, site_id uuid, user_id uuid, messages jsonb, updated_at, created_at)
insights(id uuid pk, site_id uuid, period date, kind text, payload jsonb, phrased text,
         score real, dismissed_by uuid[], created_at)
ai_usage(org_id uuid, day date, messages int, tokens bigint, pk (org_id, day))
```

## API requirements

- `POST /api/ai/chat` (stream), `GET/POST /api/sites/:id/insights` (list/dismiss/feedback), org settings AI toggle.

## Dependencies

- `@anthropic-ai/sdk` (new); env `ANTHROPIC_API_KEY`; plans gating from `18`; everything analytical from `02`-`11`.

## Edge cases

- Questions about other sites/orgs (site bound server-side; the model literally cannot query elsewhere); prompt injection via site content (tool results are aggregate numbers/paths - render paths as text, never execute; still sanitize breakdown values in the UI); tool errors mid-answer (model instructed to report partial results); long-range questions exploding query cost (tools enforce the same 13-month/1000-row caps as the public API from `19`); multilingual questions (models handle natively; keep UI copy English v1); Anthropic outage (chat degrades with a friendly notice; insights job skips the phrasing step and shows the deterministic finding raw).

## Development milestones

1. Tool layer + chat endpoint + minimal sheet UI (text answers, no components).
2. Structured answers (mini-charts, filter-apply chips, provenance traces).
3. Plan limits + org toggle + privacy docs.
4. Deterministic detectors + insight card + digest integration.
5. Feedback loop + suggested-questions seeding.

## Future improvements

- Weekly "analyst memo" long-form narrative (opt-in email); anomaly push alerts phrased by AI; natural-language segment/funnel builders ("make a funnel from pricing to signup"); MCP server exposing the same tool set so users can query WebSight from Claude/other agents - cheap to add once tools exist, and a genuinely novel differentiator in this category.
