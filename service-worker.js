// TWERKHUB · Service Worker v2.0.0
// ─────────────────────────────────────────────────────────────────────────
// 2026-04-25: REMOVED universal topbar injection. The old SW intercepted
// every HTML response and appended <script src=".../twerkhub-universal-inject.js">
// which rendered a SECOND legacy navbar at runtime — duplicating the new
// canonical TWK_NAV_V1 already in the HTML. Result: every page had two
// navbars stacked.
//
// This SW now does NOT touch HTML at all. The HTML files contain the single
// source of truth navbar (TWK_NAV_V1, baked into every page by
// standardize_navbars.py). No runtime injection. No rewrites. No cache of
// rewritten HTML.
//
// On activation: nukes ALL prior caches (alexia-pwa-v1.*, alexia-runtime-v1.*)
// to guarantee no stale rewritten HTML survives.
// ─────────────────────────────────────────────────────────────────────────
const CACHE_NAME = 'alexia-pwa-v2.0.0';
const RUNTIME_CACHE = 'alexia-runtime-v2.0.0';
const OFFLINE_URL = '/';

// Files that are part of the app shell and should be pre-cached on install.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // NUKE ALL prior caches — guarantees no rewritten HTML survives the
  // universal-inject removal. After SW activates, the runtime cache is
  // empty and all subsequent HTML fetches hit the network fresh.
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Is this request for a same-origin asset we care about (CSS/JS/images/fonts)?
function isStaticAsset(url) {
  const path = url.pathname;
  return /\.(css|js|mjs|png|jpe?g|gif|webp|svg|woff2?|ttf|ico|json)$/i.test(path);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Skip cross-origin (YouTube embeds, Google fonts, analytics, etc).
  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate' ||
                 (request.headers.get('accept') || '').includes('text/html');

  // ── HTML pages: network-first, cache fallback only on offline. NO body
  //    rewriting. The HTML already contains the canonical TWK_NAV_V1 navbar
  //    baked in at build time — no runtime injection needed.
  if (isPage) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful HTML responses for offline fallback only.
          if (response && response.ok) {
            const ct = response.headers.get('content-type') || '';
            if (ct.toLowerCase().includes('text/html')) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
            }
          }
          return response;
        })
        .catch(() => caches.match(request)
          .then(r => r || caches.match('/index.html') || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // ── Static same-origin assets: stale-while-revalidate.
  //    Serve from cache immediately (fast paint) AND fetch in the background
  //    to refresh the cache for the next visit. This prevents the "stale CSS
  //    after HTML update" FOUC the previous version had.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkPromise = fetch(request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached); // offline + nothing cached → fallthrough
        return cached || networkPromise;
      })
    );
    return;
  }

  // ── Anything else: network, cache the result on the way back.
  event.respondWith(
    fetch(request).then(response => {
      if (response && response.status === 200 && response.type !== 'opaque') {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});

// Allow pages to request an immediate SW update without a hard reload.
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting' || (event.data && event.data.type === 'skip-waiting')) {
    self.skipWaiting();
  }
});
