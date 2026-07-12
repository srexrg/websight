# websight

The official JavaScript tracker for [WebSight](https://websight.srexrg.me), the open-source, privacy-first web analytics platform. Under 1KB core, realtime, no cookies. No cross-site tracking, no personal data - just the numbers you actually need. One line and you are counting.

## Install

```bash
npm install websight
```

## Quick start

Vanilla JS, anywhere in your app before the first navigation you want to count:

```js
import { init, track, identify } from "websight";

init({ site: "example.com" });

// Custom events, any time after init:
track("signup", { plan: "pro" });
```

`track()` and `identify()` are safe to call before `init()` - they queue and replay in order once the tracker boots.

### Next.js (App Router)

Create a small client analytics module and call `init` once:

```tsx
// app/analytics.tsx
"use client";

import { useEffect } from "react";
import { init } from "websight";

export function Analytics() {
  useEffect(() => {
    init({ site: "example.com" });
  }, []);
  return null;
}
```

Mount it from the root layout:

```tsx
// app/layout.tsx
import { Analytics } from "./analytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

`init()` is a no-op on the server, so importing and calling it from a component that also renders during SSR is safe.

### Script tag alternative

No build step? Drop this in and you are done:

```html
<script defer src="https://websight.srexrg.me/t.js" data-site="example.com"></script>
```

The `data-*` attributes map one-to-one to the options below (for example `data-mode="persistent"`, `data-vitals="0.1"`, `data-exclude="/admin/*,/health"`).

## Options

Every field of `WebsightOptions`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `site` | `string` | required | Site domain registered in WebSight, e.g. `"example.com"`. |
| `host` | `string` | `"https://websight.srexrg.me"` | Origin of the WebSight deployment events are sent to. |
| `api` | `string` | derived from `host` | Full track endpoint URL. Overrides `host`. |
| `mode` | `"stateless" \| "persistent"` | `"stateless"` | `"persistent"` stores an anonymous visitor id in localStorage and enables `identify()`. `"stateless"` stores nothing, ever. |
| `hashRouting` | `boolean` | `false` | Track hash-based routing (`#/page`) as pageviews. |
| `exclude` | `string[]` | `[]` | Path globs to exclude, e.g. `["/admin/*", "/health"]`. |
| `trackOutbound` | `boolean` | `true` | Auto-track clicks on links to other origins. |
| `trackDownloads` | `boolean` | `true` | Auto-track clicks on file download links. |
| `respectDnt` | `boolean` | `false` | Disable tracking for visitors with Do Not Track enabled. |
| `allowLocalhost` | `boolean` | `false` | Track on localhost (useful in development). |
| `vitals` | `boolean \| number` | `false` | Collect Core Web Vitals. `true` = all page loads, a number `0..1` = sample rate. |
| `errors` | `boolean` | `false` | Capture JS errors and unhandled rejections. |
| `replay` | `boolean` | `false` | Load the session replay recorder (recording itself is toggled from the dashboard). |

Vitals, errors, and replay each load a separate chunk on demand - enable them and only then does the extra code reach the browser. Leave them off and your bundle carries the core only.

## track

Send a custom event with optional properties:

```js
track("purchase", { value: 49, currency: "USD" });
track("newsletter_signup");
```

Downloads, outbound link clicks, and form submissions are captured automatically. You can also mark any element declaratively with `data-ws-event`:

```html
<button data-ws-event="cta_click">Get started</button>
```

## identify

Attach a stable user id (and optional traits) in `persistent` mode:

```js
init({ site: "example.com", mode: "persistent" });

identify("user-42", { plan: "pro" });
identify(null); // clear on logout
```

In the default stateless mode `identify()` is a no-op - nothing is stored and no id is attached.

## Privacy

- Stateless by default: no cookies, no localStorage, no cross-site tracking, no personal data collected.
- Do Not Track: set `respectDnt: true` to skip visitors who have DNT enabled.
- Query stripping happens client-side - only `utm_*`, `ref`, `source`, and known paid click ids ever leave the page; everything else in the query string stays local.

## Links

- GitHub: https://github.com/srexrg/websight
- Hosted app: https://websight.srexrg.me
- Docs: https://websight.srexrg.me/docs

MIT licensed.
