// pwa.js — service-worker registration + the power-cycle update flow.
// No mid-session toast, ever: an update found while playing simply installs
// and waits — rebooting the machine IS the refresh, it applies next launch.
// Only at load time, while the session is still on the boot screen, do we
// promote a waiting worker and reload once (invisibly).
const RELOAD_FLAG = 'seed-sw-reloaded';   // once per session, max
const BOOT_WINDOW_MS = 4000;              // only while still booting
const t0 = performance.now();

if ('serviceWorker' in navigator) {
  // First install has no previous controller; claiming it needs no reload.
  let hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (sessionStorage.getItem(RELOAD_FLAG)) return;            // already cycled
    if (performance.now() - t0 > BOOT_WINDOW_MS) return;        // mid-session: next launch
    sessionStorage.setItem(RELOAD_FLAG, '1');
    location.reload();
  });

  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      // A new build was already waiting from last session: power-cycle now,
      // while the screen is still warming up.
      if (reg.waiting) reg.waiting.postMessage({type: 'SKIP_WAITING'});
      // Mid-session updatefound: intentionally ignored (applies next launch).
    })
    .catch(() => {
      // Plain http over LAN (e.g. http://kainode.local:8420): SW is not
      // available off localhost/HTTPS. Silently skip — the game runs without it.
    });
}
