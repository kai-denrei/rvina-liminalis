# SEED — V1 (cold boot)

A game that ages as you play it. Current build covers era 0 (The Dot), seam 0→1,
era 1 (The Tile World), seam 1→2, and era 2 (The Dungeon), in a CSS CRT cabinet.
Vanilla ES modules, no build step.

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
| `state.js` | the spine: flags/XP/party/verb/save-load + the through-line (played, year, scores, the log) |
| `console.js` | the machine's voice: `boot`, `select`, `line` (era-goal beat), `off` |
| `eras/era0_dot.js` | era 0: `ballistic`, `asteroid`, `tanks` |
| `eras/era1_tiles.js` | era 1: `topdown` (Ultima-IV loop) |
| `eras/era2_map.js` | era 2 layout: pure data (grid, items, enemy, exit), node-importable |
| `eras/era2_dungeon.js` | era 2: `dungeon` (Dungeon-Master grid, scaled-bitmap depth renderer, the beast) |
| `eras/era2_inventory.js` | era 2 pack: weight cap, torch burn, paper-doll panel, tap-to-drop |
| `seams/seam_0_1.js` | `seam`: console → tiles (year tick 1979→1985, grid bleed, figure resolve) |
| `seams/seam_1_2.js` | tiles → dungeon (1985→1987): the camera drops INTO the figure |
| `seams/seam_2_3.js` | dungeon → era 3 stub (1987→1992): teal surface light, back to select |
| `serve.py` | dev server, no-cache headers, port 8420 |
| `scripts/bust.sh` | cache-bust token runner (also rewrites the SW token) |
| `public/` | cb-badge.js + cb-shapes/ (visual build receipt assets) |
| `pwa.js` | SW registration + power-cycle update flow (imported last by `main.js`) |
| `sw.js` | service worker: token-keyed `seed-<token>` cache + persistent `seed-fonts` |
| `manifest.webmanifest` / `icons/` | install metadata + amber-dot icons (era zero) |

## Era 0 — progression (the menu grows)

The select menu starts with **BALLISTIC** alone. Each game carries a one-time
goal; meeting it sets a flag, unlocks the next menu entry (the newest entry
flickers until first selected), grows the verb (`fire` → `+move` →
`+hostile_ai` → `+quest/party/riddle`), and prints a one-line realization in
the machine's voice (the `line` mode). The goals:

- **BALLISTIC** — 3 hits within 7 shots (the HUD counts `HITS h/3  SHOTS s/7`;
  7 shots short of 3 hits resets the counters silently — a fresh attempt).
- **ASTEROID** — clear the first wave.
- **TANKS** — first to 3 hits. If the enemy gets to 3 first, both scores reset
  to 0-0 and play continues — the machine forgets.

`EXIT GAME?` appears once all three goals are met. After its goal, each game
returns to its original endless arcade behavior, and the flags persist across
reloads (autosave on every first-set flag). `?admin=<target>` pre-arms the
flags beneath the jump target (e.g. `?admin=tanks` arms ballistic+asteroid
done; `?admin=ballistic` arms nothing) without ever touching the real save.

## Era 2 — The Dungeon (1987)

Entered through seam 1→2 from era 1's restored portal: the camera drops into
the figure and the god's-eye view is gone — you are inside. First-person on a
16×16 grid, rendered the Dungeon Master way (pre-scaled wall bitmaps at four
depths, not raycasting), amber throughout, with teal only as sparse lichen in
the stone. **Controls:** `↑`/`↓` step forward/back, `←`/`→` turn, `SPACE`
looses an arrow (the persisting verb — needs the bow and arrows from the
treasure room), `i` (the **INV** button on the touch deck) opens the pack,
`ESC` returns to the menu. **Torch & weight:** your torch burns down in real
time — light is something you can lose; spares auto-light, and with none lit
only silhouettes remain. The pack caps at **18 kg** against 14.2 kg of
findable treasure, so you must choose what to keep: tap a row in the pack
panel to drop a thing where you stand (it stays on that floor cell). A beast
squats on the only corridor to the exit; arrows are how you argue with it.
Stepping onto the doorway beyond it runs seam 2→3 (the teal surface light,
1987→1992) and returns to the menu — era 3 isn't built yet.

## Controls

Arrows navigate/steer, `Space`/`Enter` starts from the menu, `SPACE` fires in
every interactive mode (the persisting verb), `ESC` returns to the menu, `i`
toggles the era-2 pack (INV on the touch deck), the red power button runs the
off beat. `prefers-reduced-motion` is respected throughout.

### Pack controls (era 2)
- `i` (or the INV deck button) opens/closes the pack; `Esc` also closes it — Esc never exits the dungeon.
- Drop an item: tap/click its row, or select with `↑↓` and drop with `Enter`/`Space`. Dropped things land at your feet and can be re-taken.
- Pack limit: 18 kg.
