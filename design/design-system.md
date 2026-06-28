# WebSight - Design System (revamp)

Source of truth: **Claude Design project "Websight UI revamp project"**
https://claude.ai/design/p/616cac0d-676d-4be1-b659-02be28628e15

This document distills the approved Claude Design output into a reference for
implementation in the real Next.js 15 + Tailwind v4 + shadcn codebase. The raw
design files live alongside this doc in `design/`:

| File | What it is |
|------|------------|
| `WebSight.dc.html` | **The final, chosen app** - sidebar + emerald, 8 screens, real d3 globe. The canonical dashboard design. |
| `WebSight-Landing.dc.html` | The marketing/landing page. |
| `WebSight-Dashboard.dc.html` | Earlier exploration: two dashboard directions (A: indigo/cards, B: emerald/globe-first) shown side by side. Kept for provenance. |

> The `.dc.html` files are Claude Design canvas exports. They reference a
> `./support.js` runtime and use `<sc-for>` / `<sc-if>` / `{{ }}` template
> bindings, so they are a **design reference, not runnable app code**.

---

## 1. Direction

Light theme, **emerald** brand, **left-sidebar** app shell, **live-first**
(realtime count + globe are first-class). Indie-maker, privacy-first
positioning. This supersedes the earlier "neutral, match-Sleek-closely" idea -
the emerald identity is the decided direction.

Open follow-ups (not yet designed): dark theme, mobile/responsive layouts, and
formally retiring the A/B exploration (B's globe-first hero may still inform the
landing and the Globe screen).

---

## 2. Color tokens

### Brand (emerald)
| Token | Hex | Use |
|-------|-----|-----|
| `accent` | `#0E9C6E` | primary actions, active states, progress fills, globe markers |
| `accent-dark` | `#0B7E58` | accent text on light, hover |
| `accent-light` | `#5FC2A0` | secondary bars |
| `accent-200` | `#84D2B7` | tints |
| `accent-50` | `#E3F5EC` / `#E7F6EF` | active sidebar bg, pale fills |
| `accent-grad-end` | `#5FD3A6` | logo/badge gradient end |

### Neutrals
| Token | Hex | Use |
|-------|-----|-----|
| `text-primary` | `#1A1B25` | headings, values |
| `text-secondary` | `#6B6E7B` | labels, body |
| `text-tertiary` | `#9A9DA8` | hints, captions |
| `text-muted` | `#B3B5BE` | timestamps |
| `surface` | `#FFFFFF` | cards |
| `surface-hover` | `#FBFBFE` | table row hover |
| `bg` | `#F6F7F9` | page background |
| `border` | `#ECEDF1` | hairline borders |
| `border-subtle` | `#F1F2F5` / `#F4F4F7` | dividers |

### Status
| Token | Hex | Use |
|-------|-----|-----|
| `success` | `#1F9D6B` | positive deltas, live pulse |
| `danger` | `#D2554F` | negative deltas |

> Delta semantics: lower-is-better metrics (bounce rate) invert the color - a
> downward bounce delta is `success` green, not danger.

### Dark surfaces (landing accents)
`#0E1310` (near-black sections: stats band, final CTA, code block), text
`#EAF6EF` / `#8FA89B` on dark.

### Source/brand badge colors
Google `#4285F4`, Direct `#9AA0AB`, X/Twitter `#111111`, GitHub `#24292F`,
Hacker News `#FF6A1A`, Product Hunt `#FF6154`.

### Globe (d3)
Ocean `#E8F3FB`, land `#CBE9D7`, borders `#9FD3B7`, graticule
`rgba(120,170,200,.22)`, sphere stroke `#CBD9E4`, marker core `#0E9C6E`.

---

## 3. Typography

- **UI font:** `Hanken Grotesk` (400/500/600/700/800) - *replaces current Oswald + Plus Jakarta Sans.*
- **Numeric/mono font:** `JetBrains Mono` (400/500/600/700) - **all numbers, metrics, timestamps, code.** This tabular treatment is core to the look.

Scale (approx): page title 21px/700 (-.4px), section header 14.5px/600, label
12.5px/500-600, nav 13.5px, body 13-14.5px. Big metric value 27px/600 mono
(-1px); hero realtime number up to 64-76px/600 mono. All-caps eyebrows
~11-13px/700 with +.5-1px letter-spacing.

## 4. Icons

**Phosphor** (`@phosphor-icons/web`, regular + bold + fill) - *replaces current
Lucide.* Examples: `ph-chart-line`, `ph-broadcast`, `ph-globe-hemisphere-west`,
`ph-file-text`, `ph-arrow-bend-down-right`, `ph-users-three`, `ph-target`,
`ph-gear-six`.

---

## 5. App shell + screens (from `WebSight.dc.html`)

Left sidebar (248px, white, sticky, full height) + main content on `#F6F7F9`.
Sidebar: logo, site switcher, nav, upgrade prompt, user profile footer.
Active nav item: bg `#E3F5EC`, text `#0B7E58`, weight 600.

Top bar: screen title, live "N visitors online now" (pulsing dot), search,
time-range tabs (24h / 7d / 30d / 90d), Export button.

**8 screens, all built out:**
1. **Overview** - 4 metric cards (Unique Visitors, Page Views, Bounce Rate, Avg. Duration) each with sparkline + delta; visitors area chart + realtime mini-globe panel; Top Pages / Top Sources; Countries / Devices / Browsers.
2. **Realtime** - large active-now number, big globe, live activity feed (animated), active pages / countries / referrers.
3. **Globe** - full interactive d3 globe, range pills (Live/24h/7d/30d/90d/1y/All), "live by location" sidebar with country counts + city/country totals.
4. **Pages** - filter tabs (all/entry/exit), search, table: Page / Visitors / Views / Bounce% / Avg. time.
5. **Sources** - channels (Search/Direct/Social/Referral/Email) bars; Referrers + UTM campaigns.
6. **Audience** - countries list; devices donut (conic-gradient); browsers / OS / screen size bars.
7. **Events** - conversion funnel (4 stages, gradient bars) + custom events table (Event / Count / Unique / Conv. rate), "New event".
8. **Settings** - site details, timezone, tracking snippet, team.

New vs current product: **Globe screen, Audience screen, Events + funnels,
bounce rate, avg. duration, channel grouping, UTM campaigns, live activity feed.**

---

## 6. Component patterns

- **Card:** white, `1px solid #ECEDF1`, radius 14-16px, padding 15-22px, shadow `0 1px 2px rgba(16,24,40,.04)`.
- **Metric card:** label (12.5px) + delta pill + big mono value + sparkline svg.
- **Progress bar:** height 6-8px, radius 4px, track `#F1F2F5`, fill accent.
- **Pill/badge:** mono 11px/600; live badge = 6px dot + `wsBlink` + label.
- **Tabs:** mono 11-12.5px/600, +.4px tracking; active = white bg + subtle shadow (A) or emerald bottom-border (B).
- **List row:** label + thin bar + right-aligned mono value, bottom hairline.
- **Source badge:** 20-22px rounded square, brand color, white initial.
- **Buttons:** primary = emerald bg + white; secondary = white + `#E2E4EA` border.
- **Radii:** sm 6-7px, md 9-11px, lg 14-16px, full = circle.
- **Shadows:** sm `0 1px 2px rgba(16,24,40,.04)`; selected chip `…/.08`; lifted `0 4px 14px …`.

### Animations (keyframes)
- `wsPulse` - expanding fading ring (marker halos, live dots), 1.8-2.6s.
- `wsBlink` - opacity blink for LIVE indicators, 1.4s.
- `wsRise` - new feed item enters (opacity + translateY), .4s.
- `wsFloat` - gentle globe bob on landing, 6s.

---

## 7. Live globe (the signature element)

`WebSight.dc.html` implements a real rotating globe:
- **d3** `geoOrthographic` projection + **topojson** world map (d3 v7.8.5, topojson-client v3).
- Canvas with devicePixelRatio scaling; `requestAnimationFrame` loop.
- Auto-spin ~0.16°/frame; drag-to-rotate (pointer events, ~0.42x); click to pause/resume.
- Initial rotation `[-20, -14, 0]`, clip angle 90°.
- ~12 city markers with sine-based pulsing halos; hidden beyond the horizon.

> This **replaces** the current `react-simple-maps` flat choropleth. It's the
> biggest "wow" of the redesign and the hardest single component to port.

---

## 8. Landing page (from `WebSight-Landing.dc.html`)

Sections in order: announcement bar -> sticky blurred nav -> hero (headline,
dual CTA, trust ticks, product-shot with mini globe) -> trust bar (logos) ->
features grid (6) -> live-globe highlight -> realtime-feed highlight -> one-line
install (copy block, 3 steps) -> dark stats band -> pricing (Hobby $0 / Pro $9 /
Business $29, monthly-annual toggle, -20% annual) -> testimonial -> dark final
CTA -> footer. Emerald accent throughout; dark `#0E1310` for bands/CTA.

---

## 9. Migration notes (current stack -> this design)

| Area | Current | Target | Effort |
|------|---------|--------|--------|
| UI font | Oswald + Plus Jakarta | Hanken Grotesk | low (swap `next/font`) |
| Numbers font | - | JetBrains Mono (tabular) | low |
| Icons | Lucide | Phosphor | low-med (icon-by-icon) |
| Accent | dark theme, no fixed accent | emerald `#0E9C6E`, light theme | med (re-tokenize Tailwind + shadcn vars) |
| Map | `react-simple-maps` flat | d3 `geoOrthographic` globe | high (new component) |
| Realtime | none (refresh only) | live count + feed + globe | high (Supabase Realtime) |
| Metrics | visits/uniques/views | + bounce rate, avg. duration | med (new aggregations) |
| Screens | Overview/Pages/Events | + Realtime, Globe, Audience, Sources, funnels | high (maps to roadmap #3-#7) |

This design becomes the visual target for revamp sub-project #1 (design system +
app shell) and supplies concrete UI for #3 (dashboard), #4 (realtime + globe),
and the Events/Audience work.
