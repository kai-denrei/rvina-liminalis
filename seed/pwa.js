// pwa.js — service-worker registration + the power-cycle update flow.
// No mid-session toast, ever: an update found while playing simply installs
// and waits — rebooting the machine IS the refresh, it applies next launch.
// Two windows where a waiting build may be promoted automatically (one reload,
// invisible): at load while still booting, and when the installed app is
// re-opened from the home screen (visibility resume) while sitting on the
// boot/select screens. Mid-game, auto-updates only ever install-and-wait.
// The corner build badge (#cb-badge, from cb-badge.js) is the manual path:
// tapping it checks for a new build right now and, if one exists, restarts
// into it — explicit consent, so it applies even mid-game.
const RELOAD_FLAG = 'seed-sw-reloaded';   // loop guard: one AUTO cycle per session

const TOKEN = (document.querySelector('meta[name="cb"]') || {getAttribute: () => ''}).getAttribute('content') || '';

/* ---------- badge status line (works with or without a SW) ---------- */
function badgeEl() { return document.getElementById('cb-badge'); }
function badgeSay(msg, color) {
  const b = badgeEl(); if (!b) return;
  const span = b.querySelector('span'); if (!span) return;
  if (!span.dataset.cbHome) span.dataset.cbHome = span.textContent;
  span.textContent = msg === null ? span.dataset.cbHome : msg;
  span.style.color = color || '#bbb';
}

/* ---------- no-SW fallback probe (plain http over LAN: serve.py is no-cache) ----------
   Fetch the live page fresh and compare its <meta name="cb"> token with ours;
   a different token means a new build is already being served — reload gets it. */
function probeByToken() {
  badgeSay('checking…');
  return fetch('./', {cache: 'no-store'})
    .then((r) => r.text())
    .then((html) => {
      const m = html.match(/name="cb" content="([0-9a-f]{8})/);
      if (m && m[1] && m[1] !== TOKEN) {
        badgeSay('new build — restarting', '#ffb24a');
        setTimeout(() => location.reload(), 450);
      } else {
        badgeSay('up to date · ' + TOKEN, '#5dcaa5');
        setTimeout(() => badgeSay(null), 1800);
      }
    })
    .catch(() => { badgeSay('check failed — offline?', '#a86a22'); setTimeout(() => badgeSay(null), 1800); });
}

/* ---------- the badge is the manual "look for a new version" switch ---------- */
function wireBadge(check) {
  const wire = () => {
    const b = badgeEl(); if (!b) return false;
    b.title = 'tap to check for a new build';
    b.addEventListener('click', check);
    return true;
  };
  // cb-badge.js mounts on defer/DOMContentLoaded — poll briefly until it exists
  if (!wire()) {
    let tries = 0;
    const iv = setInterval(() => { if (wire() || ++tries > 40) clearInterval(iv); }, 250);
  }
}

if ('serviceWorker' in navigator) {
  // First install has no previous controller; claiming it needs no reload.
  let hadController = !!navigator.serviceWorker.controller;
  let wantReload = false; // set only by our own deliberate promotions

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (!wantReload) return;            // mid-session silent install: next launch
    wantReload = false;
    location.reload();
  });

  const atMenu = () => {
    const m = window.__seed && window.__seed.getMode && window.__seed.getMode();
    return m === 'boot' || m === 'select';
  };
  // Promote a waiting worker into control (the power-cycle). auto promotions
  // are loop-guarded to one per session; explicit (badge) promotions are not.
  const promote = (reg, explicit) => {
    if (!reg || !reg.waiting) return false;
    if (!explicit && sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
    wantReload = true;
    reg.waiting.postMessage({type: 'SKIP_WAITING'});
    return true;
  };
  // reg.update() resolves before the fetched worker finishes installing —
  // settle to 'found' / 'none' by watching the installing worker's lifecycle.
  const checkOnce = (reg) => reg.update().then(() => {
    if (reg.waiting) return 'found';
    const w = reg.installing;
    if (!w) return 'none';
    return new Promise((res) => w.addEventListener('statechange', () => {
      if (w.state === 'installed') res('found');
      else if (w.state === 'redundant') res('none');
    }));
  });

  navigator.serviceWorker
    .register('./sw.js', {updateViaCache: 'none'})
    .then((reg) => {
      // A new build was already waiting from last session: power-cycle now,
      // while the screen is still warming up.
      promote(reg, false);

      // The installed app re-opened from the home screen: look for a new
      // build; apply it only if we're still at the boot/select screens.
      const onResume = () => {
        if (document.visibilityState !== 'visible') {
          // going to the background re-arms the auto cycle: coming back is a
          // fresh opening (still loop-safe — only a hide can re-arm it)
          sessionStorage.removeItem(RELOAD_FLAG);
          return;
        }
        checkOnce(reg).then((r) => { if (r === 'found' && atMenu()) promote(reg, false); }).catch(() => {});
      };
      document.addEventListener('visibilitychange', onResume);
      addEventListener('pageshow', (e) => { if (e.persisted) onResume(); }); // bfcache resume

      // Badge tap: check right now, restart into the new build if found.
      wireBadge(() => {
        badgeSay('checking…');
        checkOnce(reg).then((r) => {
          if (r === 'found') { badgeSay('new build — restarting', '#ffb24a'); setTimeout(() => promote(reg, true), 450); }
          else { badgeSay('up to date · ' + TOKEN, '#5dcaa5'); setTimeout(() => badgeSay(null), 1800); }
        }).catch(() => probeByToken());
      });
    })
    .catch(() => {
      // Plain http over LAN (e.g. http://kainode.local:8420): SW is not
      // available off localhost/HTTPS. The game runs without it — and the
      // badge still answers a tap via the token probe.
      wireBadge(probeByToken);
    });
} else {
  wireBadge(probeByToken);
}
