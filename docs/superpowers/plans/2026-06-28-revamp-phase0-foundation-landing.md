# WebSight Revamp - Foundation + Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the stack to latest stable, establish the emerald design-system foundation (tokens, fonts, icons, restyled primitives), and rewrite the marketing landing page to match the approved Claude Design output.

**Architecture:** Rewrite in place - keep the existing Next.js app, Supabase, auth, API routes, and `tracker.js` untouched; replace the frontend design layer. Phase 0 bumps dependencies in isolation and verifies the baseline still works. Phase 1 replaces the global theme tokens, fonts, and icon library and restyles shared primitives. Phase 2 ports the landing page section-by-section from `design/WebSight-Landing.dc.html` onto the new system.

**Tech Stack:** Next.js 16, React 19.2, TypeScript 6, Tailwind CSS v4.3, shadcn/ui (Radix), Phosphor icons, Hanken Grotesk + JetBrains Mono (`next/font/google`).

## Global Constraints

- **Versions (floors):** `next@16.2.9`, `react@19.2.x`, `react-dom@19.2.x`, `typescript@6.0.x`, `tailwindcss@4.3.x`, `@tailwindcss/postcss@4.3.x`, `eslint@9`.
- **Brand accent:** emerald `#0E9C6E` (dark `#0B7E58`, light fills `#E3F5EC`/`#E7F6EF`, secondary `#5FC2A0`, grad-end `#5FD3A6`). Single source token; never hardcode the hex in components.
- **Neutrals:** text `#1A1B25` / `#6B6E7B` / `#9A9DA8` / `#B3B5BE`; surface `#FFFFFF`; surface-hover `#FBFBFE`; page bg `#F6F7F9`; border `#ECEDF1`; divider `#F1F2F5`/`#F4F4F7`.
- **Status:** success `#1F9D6B`, danger `#D2554F`. Lower-is-better metrics invert the delta color.
- **Dark sections (landing):** `#0E1310` with text `#EAF6EF`/`#8FA89B`.
- **Fonts:** Hanken Grotesk for UI; JetBrains Mono for every number, metric, timestamp, and code snippet (tabular feel is core to the look).
- **Icons:** Phosphor (`@phosphor-icons/react`). No Lucide in new/rewritten UI.
- **Theme:** light is primary. Tokens must be structured dark-ready, but ship light only - do not build a dark theme in this plan.
- **Copy:** never use an em-dash; use a plain hyphen. Preserve the design file's wording.
- **Do NOT touch:** the data model, `public/tracker.js`, `app/api/**`, Supabase clients, or auth. This plan is frontend-only.
- **Design source of truth:** `design/WebSight-Landing.dc.html` (landing target) and `design/design-system.md` (tokens + patterns). The `.dc.html` is a visual reference, not runnable code.

## Verification approach (read before starting)

This is a frontend design-translation slice. The repo has **no test framework**, and unit-testing presentational markup adds little value. So each task's "test cycle" is:

1. `npx tsc --noEmit` - types pass.
2. `npm run lint` - lint passes.
3. `npm run build` - production build succeeds.
4. **Visual check** - run `npm run dev` and view the page; compare against the matching section of `design/WebSight-Landing.dc.html`. Capture a screenshot (Claude Preview MCP, the `run` skill, or a browser) and confirm layout, color, type, and spacing match.

Automated component/E2E tests are deliberately deferred to the data-bearing sub-projects (dashboard, realtime) where logic makes them worthwhile. The one stateful landing piece (pricing toggle) is verified interactively in its task.

## File structure

**Phase 0 (modify):** `package.json`, lockfile, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs` (codemod may touch these).

**Phase 1:**
- Modify: `app/layout.tsx` (fonts, body classes), `app/globals.css` (tokens + keyframes), `components.json` (iconLibrary), `components/ui/{button,badge,card}.tsx` (token-driven restyle).
- Create: `components/brand/Logo.tsx`, `components/brand/LiveBadge.tsx`, `lib/design/tokens.ts` (TS mirror of brand constants for SVG/canvas use).

**Phase 2:**
- Create: `lib/landing/content.ts` (all landing copy/data + types), `components/landing/Globe.tsx` (decorative SVG sphere), `components/landing/AnnouncementBar.tsx`.
- Rewrite: `components/landing/{Navbar,hero,Features,Footer}.tsx` and add `components/landing/{TrustBar,GlobeHighlight,RealtimeHighlight,Install,StatsBand,Pricing,Testimonial,FinalCta}.tsx`.
- Modify: `app/page.tsx` (new section order), `data/site.config.tsx` (metadata copy).
- Retire: `components/landing/{HowItWorks,ComparisonSection,Cta,FAQSection,DashboardPreview,Testimonials,PricingSection}.tsx` if unused after the rewrite (delete in the final task).

---

## PHASE 0 - Dependency upgrade + baseline

> Goal: be on latest stable with the existing app still building, running, and behaving. No UI changes in this phase.

### Task 0.1: Branch + baseline snapshot

**Files:** none (git + verification only)

- [ ] **Step 1: Branch from main**

```bash
git fetch origin
git checkout main
git checkout -b revamp/phase0-upgrade
```

- [ ] **Step 2: Record baseline build works**

```bash
npm install
npm run build
```
Expected: build succeeds. If it already fails, stop and report - do not start upgrades on a broken baseline.

- [ ] **Step 3: Record baseline runtime**

```bash
npm run dev
```
Open `/`, `/dashboard` (redirects to `/auth` when logged out), `/settings`, `/docs`. Confirm they load. Stop the dev server.

- [ ] **Step 4: Commit a checkpoint marker**

```bash
git commit --allow-empty -m "chore: phase0 baseline checkpoint (pre-upgrade)"
```

### Task 0.2: Upgrade React + Tailwind + TypeScript (minors/majors that rarely break)

**Files:** Modify `package.json`, lockfile

- [ ] **Step 1: Upgrade React + types**

```bash
npm install react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest
```

- [ ] **Step 2: Upgrade Tailwind**

```bash
npm install -D tailwindcss@latest @tailwindcss/postcss@latest
```

- [ ] **Step 3: Upgrade TypeScript**

```bash
npm install -D typescript@latest
```

- [ ] **Step 4: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```
Expected: PASS. If TS 6 surfaces new strictness errors, fix them minimally (do not refactor logic) and note each in the commit body.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade react 19.2, tailwind 4.3, typescript 6"
```

### Task 0.3: Upgrade Next.js 15 -> 16 via codemod

**Files:** Modify `package.json`, `next.config.ts`, possibly `app/**` (codemod), `eslint.config.mjs`

- [ ] **Step 1: Run the official upgrade codemod**

```bash
npx @next/codemod@latest upgrade latest
```
This bumps `next` + `eslint-config-next` and applies migrations. Review the diff it produces.

- [ ] **Step 2: Verify version**

```bash
node -e "console.log(require('next/package.json').version)"
```
Expected: `16.2.9` or newer.

- [ ] **Step 3: Address known Next 16 breaking points**

Check and fix if present:
- Async request APIs: any `cookies()`, `headers()`, `params`, `searchParams` usage must be awaited. Grep: `grep -rn "cookies()\|headers()" app utils lib`. The Supabase server client in `utils/supabase/server.ts` and `middleware.ts` are the likely spots - ensure they `await` per the codemod.
- `next.config.ts`: confirm it still validates against the Next 16 `NextConfig` type.

- [ ] **Step 4: Typecheck + build + run**

```bash
npx tsc --noEmit && npm run build && npm run dev
```
Expected: build PASS; dev server boots. Click `/`, `/auth`, `/dashboard`, `/settings`, `/docs` - all load without console errors. Stop dev.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: upgrade to next 16 via codemod, fix async request APIs"
```

### Task 0.4: Re-sync shadcn + final baseline verification

**Files:** Modify `package.json` (Radix patch bumps) if needed

- [ ] **Step 1: Bump Radix primitives to latest patch**

```bash
npm update @radix-ui/react-accordion @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-tooltip
```

- [ ] **Step 2: Full verification pass**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: all PASS.

- [ ] **Step 3: Runtime smoke test**

Run `npm run dev`; confirm landing, auth, dashboard redirect, settings, and docs all render. Confirm the analytics tracker script still loads (network tab shows `tracker.js`). Stop dev.

- [ ] **Step 4: Commit + open PR**

```bash
git add -A
git commit -m "chore: resync radix, finalize phase 0 upgrade baseline"
```
Open a PR titled "Phase 0: upgrade to latest stable" so the upgrade lands independently before the redesign.

---

## PHASE 1 - Design-system foundation

> Goal: the app renders on the emerald light theme with the new fonts, icons, and token-driven primitives. After this phase the landing/app will look "unstyled-but-correct"; the authenticated dashboard pages will look inconsistent until their own later plan - that is expected.

### Task 1.1: Swap fonts to Hanken Grotesk + JetBrains Mono

**Files:** Modify `app/layout.tsx`

**Interfaces:**
- Produces: CSS variables `--font-hanken` (UI sans) and `--font-jetbrains` (mono) on `<body>`, consumed by `globals.css` in Task 1.2.

- [ ] **Step 1: Replace the font imports + setup**

In `app/layout.tsx`, replace the Geist/Geist_Mono/Plus_Jakarta_Sans/Oswald block with:

```tsx
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
});
```

- [ ] **Step 2: Update `<body>` classes**

Replace the body className with (remove `bg-black`; the page bg now comes from tokens):

```tsx
<body className={`${hanken.variable} ${jetbrains.variable} font-sans antialiased`}>
```

- [ ] **Step 3: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```
Expected: PASS (fonts resolve; old font vars no longer referenced).

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(design): swap to Hanken Grotesk + JetBrains Mono"
```

### Task 1.2: Retoken `globals.css` to emerald light theme + add keyframes

**Files:** Modify `app/globals.css`

**Interfaces:**
- Produces: shadcn token vars (`--primary`, `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--accent`, `--destructive`, etc.) mapped to the brand palette; brand utility vars (`--brand`, `--brand-fg`, `--success`, `--danger`, `--surface`, `--surface-2`, `--page`); fonts `--font-sans`/`--font-mono`; keyframes `wsPulse`, `wsBlink`, `wsRise`, `wsFloat`.

- [ ] **Step 1: Replace the `@theme inline` font + add brand color mappings**

Update the `@theme inline` block so fonts point to the new vars and add brand tokens:

```css
@theme inline {
  --font-sans: var(--font-hanken);
  --font-mono: var(--font-jetbrains);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-fg);
  --color-success: var(--success);
  --color-danger: var(--danger);
  --color-surface: var(--surface);
  --color-page: var(--page);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

- [ ] **Step 2: Replace `:root` with the emerald light palette**

Use hex from the Global Constraints (kept as hex to match the design exactly; oklch conversion is unnecessary and error-prone here):

```css
:root {
  --radius: 0.75rem;

  --page: #F6F7F9;
  --surface: #FFFFFF;
  --surface-2: #FBFBFE;

  --background: #F6F7F9;
  --foreground: #1A1B25;

  --card: #FFFFFF;
  --card-foreground: #1A1B25;
  --popover: #FFFFFF;
  --popover-foreground: #1A1B25;

  --brand: #0E9C6E;
  --brand-fg: #FFFFFF;
  --primary: #0E9C6E;
  --primary-foreground: #FFFFFF;

  --secondary: #F1F2F5;
  --secondary-foreground: #1A1B25;
  --muted: #F6F7F9;
  --muted-foreground: #6B6E7B;
  --accent: #E3F5EC;
  --accent-foreground: #0B7E58;

  --success: #1F9D6B;
  --danger: #D2554F;
  --destructive: #D2554F;

  --border: #ECEDF1;
  --input: #ECEDF1;
  --ring: #0E9C6E;
}
```

- [ ] **Step 3: Keep the `.dark` block but mark it not-yet-supported**

Leave the existing `:root.dark { ... }` block in place but add a comment `/* dark theme not shipped yet - revamp sub-project, do not rely on this */`. Do not spend time tuning it.

- [ ] **Step 4: Add the shared keyframes (used by LiveBadge + later realtime/landing)**

Append to `globals.css`:

```css
@keyframes wsPulse { 0% { transform: scale(.7); opacity: .55 } 70% { transform: scale(2.6); opacity: 0 } 100% { transform: scale(2.6); opacity: 0 } }
@keyframes wsBlink { 0%, 100% { opacity: 1 } 50% { opacity: .3 } }
@keyframes wsRise { 0% { opacity: 0; transform: translateY(-6px) } 100% { opacity: 1; transform: translateY(0) } }
@keyframes wsFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
```

- [ ] **Step 5: Update the base layer**

Ensure the base layer sets the page background and default text:

```css
@layer base {
  * { @apply border-border; }
  body { @apply bg-page text-foreground; }
}
```

- [ ] **Step 6: Build + visual check**

```bash
npm run build && npm run dev
```
Open `/`. The page will look rough (old components, new tokens) but must render on a light `#F6F7F9` background with dark `#1A1B25` text - confirm the theme flipped from dark to light. Stop dev.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): retoken to emerald light theme, add shared keyframes"
```

### Task 1.3: Install Phosphor icons + set convention

**Files:** Modify `package.json`, `components.json`

- [ ] **Step 1: Install**

```bash
npm install @phosphor-icons/react
```

- [ ] **Step 2: Update shadcn icon library**

In `components.json`, set `"iconLibrary": "phosphor"`.

- [ ] **Step 3: Verify an icon renders**

Temporarily add to `app/page.tsx` (top of the returned tree): `import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";` and `<ChartLineUp size={20} weight="bold" />`. Run `npm run dev`, confirm it renders, then revert the temporary edit.

> Convention: import from `@phosphor-icons/react/dist/ssr` in server components, `@phosphor-icons/react` in client components. Map Phosphor names from the design file (`ph-chart-line-up` -> `ChartLineUp`, `ph-broadcast` -> `Broadcast`, etc.).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components.json
git commit -m "feat(design): adopt Phosphor icon library"
```

### Task 1.4: Restyle base primitives (button, badge, card) to tokens

**Files:** Modify `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`

**Interfaces:**
- Produces: `Button` with `variant="default"` = emerald solid (`bg-primary text-primary-foreground`), `variant="outline"` = white + `border-border`; `Card` = `bg-card border border-border rounded-xl shadow-[0_1px_2px_rgba(16,24,40,.04)]`; `Badge` token-driven. These are consumed across Phase 2.

- [ ] **Step 1: Confirm primitives already read tokens**

Open each file. They use CVA with token classes (`bg-primary`, `bg-card`, etc.). Since Task 1.2 remapped the tokens, they should already render emerald. Adjust only:
- `card.tsx`: ensure radius is `rounded-xl` (12px) and shadow is the soft `0 1px 2px rgba(16,24,40,.04)` (add via `shadow-sm` override or arbitrary value).
- `button.tsx`: ensure default radius `rounded-[10px]`, height/padding match the design's compact buttons.

- [ ] **Step 2: Build + visual check**

```bash
npm run build && npm run dev
```
Render a temporary throwaway page or reuse `/` - confirm a default Button is emerald and a Card is white with a hairline border and soft shadow. Stop dev.

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx components/ui/badge.tsx components/ui/card.tsx
git commit -m "feat(design): align button/badge/card primitives to emerald tokens"
```

### Task 1.5: Shared brand atoms (Logo, LiveBadge)

**Files:** Create `components/brand/Logo.tsx`, `components/brand/LiveBadge.tsx`

**Interfaces:**
- Produces: `<Logo size?: number />` (emerald rounded square + `ChartLineUp` mark + "WebSight" wordmark) and `<LiveBadge label?: string />` (pulsing dot + uppercase label, `wsBlink`). Consumed by Navbar, Footer, hero, highlights in Phase 2.

- [ ] **Step 1: Implement `Logo.tsx`**

```tsx
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex items-center justify-center rounded-[9px] bg-brand text-white"
        style={{ width: size, height: size, boxShadow: "0 2px 8px rgba(14,156,110,.34)" }}
      >
        <ChartLineUp size={size * 0.56} weight="bold" />
      </span>
      <span className="text-[18px] font-bold tracking-[-0.3px] text-foreground">WebSight</span>
    </span>
  );
}
```

- [ ] **Step 2: Implement `LiveBadge.tsx`**

```tsx
export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" style={{ animation: "wsBlink 1.4s ease-in-out infinite" }} />
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/brand/Logo.tsx components/brand/LiveBadge.tsx
git commit -m "feat(design): add Logo and LiveBadge brand atoms"
```

---

## PHASE 2 - Landing page rewrite

> Goal: `/` matches `design/WebSight-Landing.dc.html` on the new system. Build each section as its own component, wire them in `app/page.tsx`, then retire the old components. For each section: open the matching block in the design file, port the markup to JSX with token classes, and source copy/data from `lib/landing/content.ts`.

### Task 2.1: Landing content + types

**Files:** Create `lib/landing/content.ts`; modify `data/site.config.tsx`

**Interfaces:**
- Produces: typed exports consumed by every Phase 2 section: `navLinks`, `features`, `logos`, `globePoints`, `liveFeed`, `installSteps`, `stats`, `plans`, `footerCols`, plus the `Plan`, `Feature`, `LiveFeedItem` types. Mirror the data from the `Component` class at the bottom of `design/WebSight-Landing.dc.html` verbatim (feature titles/descriptions, the 3 pricing plans Hobby/$0, Pro/$9 (annual $7), Business/$29 (annual $24), the stats `12.4k+ / 3.2B / <1KB / 99.9%`, footer columns Product/Resources/Company, etc.).

- [ ] **Step 1: Create the content module**

Define and export the typed data. Example shape (fill all entries from the design file):

```ts
export type Feature = { icon: string; title: string; desc: string; tint: string; fg: string };
export type Plan = {
  name: string; tagline: string; monthly: number; annual: number;
  popular: boolean; cta: string; features: string[];
};
export type LiveFeedItem = { page: string; meta: string; ago: string; icon: string; tint: string; fg: string };

export const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Globe", href: "#globe" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
];
// ...features, logos, globePoints, liveFeed, installSteps, stats, plans, footerCols
```

- [ ] **Step 2: Update site metadata copy**

In `data/site.config.tsx`, update `description` to the new positioning ("Privacy-first web analytics for people who build on the internet."). Keep `name`, `url`, `prevImage`.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/landing/content.ts data/site.config.tsx
git commit -m "feat(landing): add typed landing content + update metadata"
```

### Task 2.2: Decorative Globe SVG component

**Files:** Create `components/landing/Globe.tsx`

**Interfaces:**
- Produces: `<Globe size?: number; dots?: {top:string;left:string;delay:string}[] />` - the static emerald wireframe sphere with pulsing markers (NOT the d3 globe; that is the dashboard plan). Consumed by hero and GlobeHighlight.

- [ ] **Step 1: Implement** by porting the `<svg viewBox="0 0 100 100">` sphere + graticule ellipses + the `wsPulse` marker dots from the hero/globe-highlight blocks of `design/WebSight-Landing.dc.html`. Use brand hex via inline style (SVG strokes) - acceptable here since SVG geometry needs literal values.

- [ ] **Step 2: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Globe.tsx
git commit -m "feat(landing): add decorative globe SVG component"
```

### Task 2.3: Navbar + announcement bar

**Files:** Create `components/landing/AnnouncementBar.tsx`; rewrite `components/landing/Navbar.tsx`

- [ ] **Step 1: Port AnnouncementBar** (dark `#0E1310` bar, "NEW" pill, message, arrow) from the design file's announcement block.
- [ ] **Step 2: Rewrite Navbar** - sticky, `bg-white/86 backdrop-blur`, `border-b border-border`, max-width 1180px, `<Logo />`, `navLinks`, "Sign in" + emerald "Start free" CTA (`Button`). Use Phosphor `ArrowRight`.
- [ ] **Step 3: Typecheck + lint + build.**
- [ ] **Step 4: Visual check** `/` top - matches design nav. Stop dev.
- [ ] **Step 5: Commit** `feat(landing): rewrite navbar + announcement bar`.

### Task 2.4: Hero

**Files:** Rewrite `components/landing/hero.tsx`

- [ ] **Step 1: Port the hero** - radial emerald glow bg, OPEN SOURCE pill, 66px/800 headline with emerald "visitors", subhead, two CTAs (emerald solid + white outline with play icon), trust ticks (check-circle), and the product-visual card (browser chrome + mini sidebar + 4 mini metric cards + mini visitors area-chart SVG + `<Globe size={120} />` live panel). Copy/data from `lib/landing/content.ts`.
- [ ] **Step 2: Numbers in JetBrains Mono** (`font-mono`).
- [ ] **Step 3: Typecheck + lint + build.**
- [ ] **Step 4: Visual check** against the hero block. Stop dev.
- [ ] **Step 5: Commit** `feat(landing): rewrite hero`.

### Task 2.5: Trust bar + Features grid

**Files:** Create `components/landing/TrustBar.tsx`; rewrite `components/landing/Features.tsx`

- [ ] **Step 1: TrustBar** - "TRUSTED BY 12,000+..." + the `logos` row (Phosphor icon + name, dimmed).
- [ ] **Step 2: Features** - eyebrow + 44px heading + 3-col grid of 6 feature cards (tinted icon chip, title, desc) from `features`. Hover lift per design.
- [ ] **Step 3: Typecheck + lint + build.**
- [ ] **Step 4: Visual check.** Stop dev.
- [ ] **Step 5: Commit** `feat(landing): add trust bar + features grid`.

### Task 2.6: Globe highlight + Realtime highlight

**Files:** Create `components/landing/GlobeHighlight.tsx`, `components/landing/RealtimeHighlight.tsx`

- [ ] **Step 1: GlobeHighlight** - 2-col: copy (LIVE GLOBE pill, heading, `globePoints` check list) + a large `<Globe size={320} />` with `wsFloat` and a radial glow. `id="globe"`.
- [ ] **Step 2: RealtimeHighlight** - 2-col: a "Live activity" card (`<LiveBadge />` + `liveFeed` rows with colored icon chips, page, meta, ago) + copy (REALTIME pill, heading, dark CTA).
- [ ] **Step 3: Typecheck + lint + build.**
- [ ] **Step 4: Visual check.** Stop dev.
- [ ] **Step 5: Commit** `feat(landing): add globe + realtime highlight sections`.

### Task 2.7: Install + Stats band

**Files:** Create `components/landing/Install.tsx`, `components/landing/StatsBand.tsx`

- [ ] **Step 1: Install** - eyebrow + heading + dark `#0E1310` code block with syntax-colored one-line snippet + a Copy control (client component; `navigator.clipboard.writeText`, swap label to "Copied" for ~1.5s) + 3 numbered steps from `installSteps`.
- [ ] **Step 2: StatsBand** - dark band, 4 mono stats from `stats`.
- [ ] **Step 3: Typecheck + lint + build.**
- [ ] **Step 4: Visual check; click Copy and confirm it copies.** Stop dev.
- [ ] **Step 5: Commit** `feat(landing): add install section + stats band`.

### Task 2.8: Pricing (stateful)

**Files:** Create `components/landing/Pricing.tsx`

**Interfaces:**
- Consumes: `plans` from `lib/landing/content.ts`.

- [ ] **Step 1: Implement** as a client component (`"use client"`) with a monthly/annual toggle (`useState`), `id="pricing"`. Render 3 plan cards; the popular plan (Pro) uses the dark `#0E1310` treatment + "MOST POPULAR" pill; price switches between `plan.monthly`/`plan.annual` with the toggle; annual shows "-20%". Prices in `font-mono`. Feature lists with emerald check marks.
- [ ] **Step 2: Typecheck + lint + build.**
- [ ] **Step 3: Visual check; toggle monthly/annual and confirm Pro price flips $9 <-> $7 and Business $29 <-> $24.** Stop dev.
- [ ] **Step 4: Commit** `feat(landing): add pricing section with billing toggle`.

### Task 2.9: Testimonial + Final CTA + Footer

**Files:** Create `components/landing/Testimonial.tsx`, `components/landing/FinalCta.tsx`; rewrite `components/landing/Footer.tsx`

- [ ] **Step 1: Testimonial** - centered 5 stars (Phosphor `Star` weight fill, `#F5A623`), 26px quote, avatar + name/role.
- [ ] **Step 2: FinalCta** - dark `#0E1310` rounded panel, radial emerald glow, heading, subhead, emerald CTA + GitHub outline button.
- [ ] **Step 3: Footer** - 4-col (brand blurb + `footerCols`), bottom bar with copyright + social icons.
- [ ] **Step 4: Typecheck + lint + build; visual check.** Stop dev.
- [ ] **Step 5: Commit** `feat(landing): add testimonial, final CTA, footer`.

### Task 2.10: Assemble page + retire old components + full verification

**Files:** Modify `app/page.tsx`; delete unused old landing components

- [ ] **Step 1: Rewrite `app/page.tsx`** to compose the new sections in design order:

```tsx
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/hero";
import { TrustBar } from "@/components/landing/TrustBar";
import Features from "@/components/landing/Features";
import { GlobeHighlight } from "@/components/landing/GlobeHighlight";
import { RealtimeHighlight } from "@/components/landing/RealtimeHighlight";
import { Install } from "@/components/landing/Install";
import { StatsBand } from "@/components/landing/StatsBand";
import Pricing from "@/components/landing/Pricing";
import { Testimonial } from "@/components/landing/Testimonial";
import { FinalCta } from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-page text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <GlobeHighlight />
        <RealtimeHighlight />
        <Install />
        <StatsBand />
        <Pricing />
        <Testimonial />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Delete now-unused old components**

```bash
git rm components/landing/HowItWorks.tsx components/landing/ComparisonSection.tsx components/landing/Cta.tsx components/landing/FAQSection.tsx components/landing/DashboardPreview.tsx components/landing/Testimonials.tsx components/landing/PricingSection.tsx
```
First grep to confirm none are imported elsewhere: `grep -rn "HowItWorks\|ComparisonSection\|FAQSection\|DashboardPreview\|PricingSection" app components` (the `Cta`/`Testimonials` names too). Keep any that are still referenced by non-landing pages.

- [ ] **Step 3: Full verification**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: all PASS, no unused-import errors.

- [ ] **Step 4: Visual diff - desktop + mobile**

Run `npm run dev`. Compare the full page top-to-bottom against `design/WebSight-Landing.dc.html`. Check responsive behavior at 1280px and 390px widths (grids should stack; nav links may collapse - if the design has no mobile nav, add a simple stacked fallback). Capture a screenshot for the PR. Stop dev.

- [ ] **Step 5: Commit + PR**

```bash
git add -A
git commit -m "feat(landing): assemble new landing page, retire old sections"
```
Open a PR "Phase 1+2: design system + landing redesign" with before/after screenshots.

---

## Self-review notes

- **Spec coverage:** Phase 0 covers the version upgrade decision (all-to-latest). Phase 1 covers tokens (emerald), fonts (Hanken + JetBrains), icons (Phosphor), and primitive restyle from `design-system.md` sections 2-6. Phase 2 covers every landing section enumerated in `design-system.md` section 8 and the `design/WebSight-Landing.dc.html` source.
- **Out of scope (by design):** dark theme, app shell, dashboard, realtime, the d3 globe - each is a later sub-project plan. The authenticated app pages will look inconsistent between Phase 1 and their own plan; this is expected and called out.
- **Assumptions to verify during execution:** (1) Next 16 codemod handles the Supabase `cookies()` async migration cleanly; (2) the existing `(root)/layout.tsx` does not hard-depend on the old purple tokens in a way that breaks the build (it will look wrong but should compile). If either fails, fix minimally and note it - do not expand scope.
