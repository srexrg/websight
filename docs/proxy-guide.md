# Proxying the WebSight tracker (beat ad blockers)

Client-side analytics can be blocked. A visitor on Brave with Shields up, or
anyone running uBlock Origin whose filter lists include the analytics domain or
the `/api/track` path, is simply never counted. This is true of every
script-based analytics tool, Google Analytics included.

The fix used by every privacy-first analytics tool (Plausible, Fathom, Umami) is
**first-party proxying**: serve the tracker script and receive its events from
*your own domain*, so the browser only ever makes same-origin requests. A network
filter can't tell them apart from your site's own assets, so it can't block them.
This lifts capture to ~all traffic, including most Brave/blocker users.

It cannot defeat a visitor with JavaScript disabled - nothing script-based can.
That residual blind spot is unavoidable and tiny.

---

## How the tracker resolves its URLs

Two facts about `t.js` make proxying a one-rule change:

1. **Ingest endpoint** = the `data-api` attribute if set, otherwise
   `new URL(script.src).origin + "/api/track"` - i.e. it defaults to the origin
   the script was served from.
2. **Lazy chunk** (`t-x.js`, which powers Web Vitals + error tracking) is loaded
   relative to the script: `new URL("t-x.js", script.src)`.

So if you serve `t.js` from your own domain under a path prefix and point
`data-api` at that same prefix, the script, its lazy chunk, and the event stream
are all first-party. One proxy rule covers all three.

---

## The recipe

Proxy a single neutral path prefix on your domain to the WebSight origin. Use a
bland name (`/stats`, `/s`, `/insights`) - avoid `/analytics`, `/track`,
`/tracker`, which some cosmetic filter lists flag by name alone.

Map `yourdomain.com/stats/*` -> `https://websight.srexrg.me/*`. That single rule
routes:

| Request on your domain            | Proxied to                              |
| --------------------------------- | --------------------------------------- |
| `/stats/t.js`                     | `https://websight.srexrg.me/t.js`       |
| `/stats/t-x.js` (vitals/errors)   | `https://websight.srexrg.me/t-x.js`     |
| `/stats/api/track` (events)       | `https://websight.srexrg.me/api/track`  |

### The snippet

```html
<script
  defer
  src="https://yourdomain.com/stats/t.js"
  data-site="yourdomain.com"
  data-api="/stats/api/track"
  data-vitals
  data-errors
></script>
```

- `data-api` is a same-origin relative path, so events post to your own domain.
- `data-vitals` / `data-errors` are optional - include them to load `t-x.js` and
  capture Web Vitals and JS errors. Drop them to stay at the ~1KB core.

---

## Platform rewrite rules

Pick the one matching where your site is hosted. All map `/stats/*` to the
WebSight origin.

### Next.js (`next.config.js` / `next.config.ts`)

```js
async rewrites() {
  return [
    { source: "/stats/:path*", destination: "https://websight.srexrg.me/:path*" },
  ];
}
```

Runs on the Next server/edge. Note: `output: "export"` (static export) has no
server to proxy through - use your CDN's rule instead (below).

### Vercel (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/stats/:path*", "destination": "https://websight.srexrg.me/:path*" }
  ]
}
```

### Netlify (`netlify.toml`)

```toml
[[redirects]]
  from = "/stats/*"
  to = "https://websight.srexrg.me/:splat"
  status = 200
  force = true
```

### Cloudflare (Worker)

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/stats/")) {
      const target =
        "https://websight.srexrg.me/" +
        url.pathname.slice("/stats/".length) +
        url.search;
      return fetch(target, request);
    }
    return fetch(request);
  },
};
```

(Or a Cloudflare Origin Rule / reverse-proxy rule pointing `/stats/*` at the
WebSight host, if you prefer no Worker.)

### Nginx

```nginx
location /stats/ {
  proxy_pass https://websight.srexrg.me/;
  proxy_set_header Host websight.srexrg.me;
  proxy_ssl_server_name on;
}
```

The trailing slash on both `location` and `proxy_pass` strips the `/stats/`
prefix before forwarding, so `/stats/t.js` -> `/t.js` upstream.

### Caddy

```
handle_path /stats/* {
  reverse_proxy https://websight.srexrg.me {
    header_up Host websight.srexrg.me
  }
}
```

---

## Verify it works

After deploying the rule and updating the snippet:

1. Open your site, DevTools -> Network.
2. Confirm `stats/t.js` returns **200 from your own domain** (not
   `websight.srexrg.me`).
3. Navigate a page; confirm a **POST to `/stats/api/track`** returns 200/204.
4. Check the WebSight **Realtime** screen shows the visit.
5. Turn on Brave Shields (or uBlock) and repeat - the requests should still go
   through, because they're same-origin.

---

## Caveats

- **Proxy the whole prefix, not just `t.js`.** If you only proxy the one file,
  `t-x.js` (vitals/errors) and the event POST fall back to third-party and get
  blocked again. The `/stats/*` prefix rule covers all of them.
- **Don't cache the event endpoint.** `t.js` / `t-x.js` are cacheable (WebSight
  sends sane cache headers; a CDN in front is fine). `/api/track` is a POST -
  make sure no rule caches it.
- **Keep the destination current.** If WebSight later moves off
  `websight.srexrg.me`, update the one rewrite rule.
- **Self-hosting.** If you self-host WebSight, replace `websight.srexrg.me` with
  your own instance's origin everywhere above.
