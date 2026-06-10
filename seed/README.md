# SEED — V1 (cold boot)

A game that ages as you play it. V1 covers era 0 (The Dot), seam 0→1, and era 1
(The Tile World), in a CSS CRT cabinet. Vanilla ES modules, no build step.

## Run

```bash
python3 serve.py [port]    # default 8420
```

Binds `0.0.0.0`, so besides `http://localhost:8420` the page is reachable on the
LAN at `http://<host>.local:8420`. The server sends
`Cache-Control: no-cache, no-store, must-revalidate` on every response.

## Bump the version token (cache busting)

```bash
./scripts/bust.sh          # one-shot: new token everywhere
```

Auto-bump on save while developing:

```bash
bash /Users/minikai/.claude-kainode/skills/cache-busting/scripts/watch.sh
```

Each bump rewrites `?v=<token>` on the asset URLs in `index.html`, the
`<meta name="cb">` content, and the shape-favicon href.

### The shape favicon and the 3-tile corner badge

They are a **visual build receipt**. The favicon (a colored shape from
`public/cb-shapes/`) and the three tiles + token in the bottom-right corner
widget are derived from the current token. After a deploy or a bump, reload:
if the shapes changed, the new build reached the browser; if they did not,
something upstream is still serving a stale copy.

### Note on module freshness

Only the URLs written in `index.html` carry the `?v=` fingerprint. ES module
imports (`main.js` → `engine.js` → `crt.js` → …) are **not** fingerprinted —
dev freshness for those comes from `serve.py`'s no-cache headers. For
production hosting, see the cache-busting skill's `references/server-headers.md`.

## Mobile & PWA

- **Touch deck.** On coarse-pointer devices (phones, tablets) a control deck —
  d-pad, fire, menu — appears below the screen as part of the cabinet. Desktop
  pointers never see it.
- **Install (A2HS).** The game is installable. On iOS there is no install
  prompt: Share → Add to Home Screen. Android/desktop Chromium offer their
  native install affordance. Installed, it launches standalone, full black.
- **Updates.** Power-cycle pattern, no mid-session prompts. A new version found
  while playing installs silently and applies on the **next launch** —
  rebooting the machine is the refresh. (If an update was already waiting at
  launch, it is applied during boot with one invisible reload.)
- **Offline.** After the first full online visit the game runs entirely
  offline — shell, modules, and fonts are cached (`seed-<token>` + `seed-fonts`
  caches; a token bump retires the old version cache on activate).
- **NOTE — HTTPS or localhost only.** Service workers require a secure context.
  On `http://localhost:8420` and on the GitHub Pages deploy the SW runs; on
  `http://kainode.local:8420` (LAN) registration silently skips and the game
  still runs, just without offline/install support.

## Module map (bible §7)

| File | Role |
|---|---|
| `index.html` | cabinet/screen DOM + the CRT CSS (scanlines, bloom, vignette, collapse) |
| `main.js` | entry: imports engine, then the self-registering mode modules, then `start()` |
| `engine.js` | rAF loop, mode registry, input bus, reduced-motion, power button, font gate |
| `crt.js` | SHARED: ctx helpers (`txt`/`blk`/`cw`), `drawFigure`/`drawMini` — this file IS the accretion layer; all canvas text goes through `txt()` |
| `palette.js` | colour tokens; amber primary; teal "second colour" (one use in V1, at seam 0→1) |
| `state.js` | the through-line: played flags, year, scores, the command-line log |
| `console.js` | the machine's voice: `boot`, `select`, `off` |
| `eras/era0_dot.js` | era 0: `ballistic`, `asteroid`, `tanks` |
| `eras/era1_tiles.js` | era 1: `topdown` (Ultima-IV loop) |
| `seams/seam_0_1.js` | `seam`: console → tiles (year tick 1979→1985, grid bleed, figure resolve) |
| `serve.py` | dev server, no-cache headers, port 8420 |
| `scripts/bust.sh` | cache-bust token runner (also rewrites the SW token) |
| `public/` | cb-badge.js + cb-shapes/ (visual build receipt assets) |
| `pwa.js` | SW registration + power-cycle update flow (imported last by `main.js`) |
| `sw.js` | service worker: token-keyed `seed-<token>` cache + persistent `seed-fonts` |
| `manifest.webmanifest` / `icons/` | install metadata + amber-dot icons (era zero) |

## Controls

Arrows navigate/steer, `Space`/`Enter` starts from the menu, `SPACE` fires in
every interactive mode (the persisting verb), `ESC` returns to the menu, the
red power button runs the off beat. `prefers-reduced-motion` is respected
throughout.
