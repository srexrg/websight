# WebSight

Open-source, privacy-first web analytics. Realtime, cookieless, and yours to host.

[![npm version](https://img.shields.io/npm/v/websight.svg)](https://www.npmjs.com/package/websight)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

https://github.com/user-attachments/assets/e35e3077-7d13-4f31-965d-10b0cfc3b54c



## Why WebSight

Google Analytics turns your visitors into someone else's product and hands you a cookie banner for the trouble. WebSight is the opposite: no cookies, no cross-site tracking, no personal data. You get the numbers you actually need, in realtime, and you own every row. Run the hosted app or self-host the whole thing on your own infrastructure.

## Features

**See traffic as it happens**
- Realtime dashboard with live visitor presence, updated the second events land, no five-minute delay.
- A real, spinning 3D globe that lights up wherever your readers are right now.
- Session replay powered by rrweb, privacy-masked, toggled per site from the dashboard.

**Understand behavior**
- Custom events, conversion funnels, goals, and retention cohorts.
- Filters and segments: slice by source, country, device, or campaign in one click.
- Core Web Vitals and JavaScript error capture, loaded on demand.

**Privacy by default**
- Cookieless, stateless tracking. GDPR, CCPA, and PECR friendly with nothing to consent to.
- Under 1KB core script, async and deferred, so your site never slows down.
- Public share links for any site, optionally password-protected.
- MIT licensed and fully self-hostable: Next.js app plus a Supabase database.

## Quick start (hosted)

Use the hosted app at [websight.srexrg.me](https://websight.srexrg.me). Setup takes about 30 seconds.

1. Sign in.
2. Add your site.
3. Drop one script tag into your `<head>`:

```html
<script defer src="https://websight.srexrg.me/t.js" data-site="example.com"></script>
```

Open the dashboard and watch visits stream in. That's it.

The `data-*` attributes map one-to-one to the package options, for example `data-mode="persistent"`, `data-vitals="0.1"`, `data-exclude="/admin/*,/health"`. See the [script tag docs](https://websight.srexrg.me/docs/tracking/script) for the full list.

## npm package

Prefer to wire it into your build? Install the `websight` package:

```bash
npm install websight
```

Initialize once with typed `init`, then send custom events with `track` (and `identify` in persistent mode):

```js
import { init, track } from "websight";

init({ site: "example.com" });

track("signup", { plan: "pro" });
```

`track()` and `identify()` are safe to call before `init()`; they queue and replay once the tracker boots.

### React

Mount `<Analytics />` from `websight/react` in your root layout:

```tsx
// app/layout.tsx
import { Analytics } from "websight/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics site="example.com" />
      </body>
    </html>
  );
}
```

For the full options table (`mode`, `vitals`, `errors`, `replay`, `exclude`, and more), see [packages/tracker/README.md](./packages/tracker/README.md) or the [tracking API docs](https://websight.srexrg.me/docs/tracking/api).

## Self-hosting

WebSight is a single Next.js app backed by a Supabase Postgres database. The tracker is built into the app's `public/` directory, so there is no separate service to run: host one Next.js app, point it at one Supabase project.

<details>
<summary>The short version</summary>

```bash
git clone https://github.com/srexrg/websight.git
cd websight
cp .env.example .env.local   # fill in your Supabase keys and app URL
npm install
npm run build
npm start
```

Create a Supabase project, apply the migrations from `supabase/migrations` with the Supabase CLI, then deploy to Vercel or any Node host.

</details>

Full walkthrough, including the environment variables and the geo/CDN caveat, is in the [self-hosting guide](https://websight.srexrg.me/docs/resources/self-hosting).

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres), Recharts, three-globe for the 3D globe, and rrweb for session replay. Zero-dependency tracker built with tsup.

## Contributing

Issues and pull requests are welcome. Open an [issue](https://github.com/srexrg/websight/issues) to report a bug or suggest a feature, or send a PR. Full docs live at [websight.srexrg.me/docs](https://websight.srexrg.me/docs).

## License

[MIT](./LICENSE). Free to use, free to self-host, forever.

---

If WebSight is useful to you, please consider giving it a star.
