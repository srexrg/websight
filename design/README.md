# design/

Snapshot of the WebSight UI revamp designed in **Claude Design**.

Canonical source (editable): **"Websight UI revamp project"**
https://claude.ai/design/p/616cac0d-676d-4be1-b659-02be28628e15

These files are a versioned, read-only snapshot imported on 2026-06-28. They are
the visual target for the revamp - not runnable app code.

## Contents

| File | Purpose |
|------|---------|
| [`design-system.md`](./design-system.md) | **Start here.** Distilled tokens, typography, icons, screen inventory, component patterns, globe notes, and current-stack migration notes. |
| `WebSight.dc.html` | The **final chosen app** - sidebar + emerald, 8 screens, real d3 `geoOrthographic` globe. Canonical dashboard design. |
| `WebSight-Landing.dc.html` | The marketing/landing page. |
| `WebSight-Dashboard.dc.html` | Earlier exploration - two dashboard directions (A: indigo/cards, B: emerald/globe-first) side by side. Kept for provenance. |

## Notes

- `.dc.html` files are Claude Design canvas exports. They use `<sc-for>` /
  `<sc-if>` / `{{ }}` template bindings and reference a `./support.js` runtime
  (the Claude Design canvas framework, **not** included here), so they will not
  render standalone. Treat them as reference, not source.
- Brand: emerald `#0E9C6E`, light theme, left-sidebar shell, live-first.
- Fonts: Hanken Grotesk (UI) + JetBrains Mono (numbers). Icons: Phosphor.
- To refresh this snapshot, re-import from the Claude Design project above.
