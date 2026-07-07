/**
 * WebSight live-visitors embed badge (docs/redesign/15). Drop-in, no build:
 *   <script src="https://.../embed.js" data-share="TOKEN"></script>
 * Renders a small "N online" pill linking to the public dashboard. Tokenized and
 * cookie-free, so it works inside sandboxed iframes and READMEs.
 */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var token = s.getAttribute("data-share");
  if (!token) return;
  var origin = new URL(s.src).origin;

  var a = document.createElement("a");
  a.href = origin + "/share/" + token;
  a.target = "_blank";
  a.rel = "noopener";
  a.style.cssText =
    "display:inline-flex;align-items:center;gap:6px;font:600 12px system-ui,-apple-system,sans-serif;" +
    "color:#0E9C6E;text-decoration:none;border:1px solid rgba(0,0,0,.1);border-radius:9999px;" +
    "padding:4px 10px;background:#fff";
  var dot = document.createElement("span");
  dot.style.cssText = "width:7px;height:7px;border-radius:50%;background:#0E9C6E;display:inline-block";
  var label = document.createElement("span");
  label.textContent = "live";
  a.appendChild(dot);
  a.appendChild(label);
  s.parentNode.insertBefore(a, s);

  function refresh() {
    fetch(origin + "/api/share/" + token + "/badge")
      .then(function (r) { return r.json(); })
      .then(function (d) { label.textContent = (d.live || 0) + " online"; })
      .catch(function () { label.textContent = "visitors"; });
  }
  refresh();
  setInterval(refresh, 15000);
})();
