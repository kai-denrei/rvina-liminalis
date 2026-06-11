/* sw.js — SEED service worker (classic script, not a module).
 *
 * Token-keyed cache name per the cache-busting skill
 * (references/service-worker.md): bust.sh rewrites CB_TOKEN on every bump,
 * so a deploy means a new cache name; activate purges every other seed-*
 * cache (except the persistent font cache). Updates follow the power-cycle
 * pattern — the waiting worker is promoted via SKIP_WAITING from pwa.js.
 */
const CB_TOKEN = "0b3251d9";   // bust.sh rewrites this on each build
const CACHE_NAME = "seed-" + CB_TOKEN;
const FONT_CACHE = "seed-fonts";
const PRECACHE = ["./"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  // No skipWaiting() here — promotion is message-driven (power-cycle pattern).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("seed-") && k !== CACHE_NAME && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache non-GET

  const url = new URL(req.url);

  // Google Fonts: cache-first into the persistent font cache.
  // Opaque (status 0) responses are allowed — gstatic serves immutable files.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res && (res.status === 200 || res.status === 0 || res.type === "opaque")) {
                cache.put(req, res.clone());
              }
              return res;
            })
        )
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, falling back to the cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("./", copy)));
          }
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Same-origin GET assets: cache-first, then network; 200s land in the
  // versioned cache. After one full online load the game runs offline.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)));
          }
          return res;
        })
    )
  );
});
