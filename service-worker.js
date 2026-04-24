// TWERKHUB · Service Worker v1.0.3
// ─────────────────────────────────────────────────────────────────────────
// 2026-04-24: fixed "FOUC on first paint" bug. The previous v1.0.1 used a
// pure cache-first strategy for every non-HTML asset, so updated CSS/JS
// files kept returning the stale cached copy on every visit until the user
// did a hard reload. Pages rendered with the new HTML referencing new class
// names but the cached CSS had no rules for them → visible "deformed" paint
// until Ctrl+Shift+R. Fix: use stale-while-revalidate for our own assets so
// the user sees something fast AND the cache is silently refreshed for next
// visit. Bumped CACHE_NAME/RUNTIME_CACHE so old v1.0.1 caches are purged on
// activate.
// ─────────────────────────────────────────────────────────────────────────
const CACHE_NAME = 'alexia-pwa-v1.0.3';
const RUNTIME_CACHE = 'alexia-runtime-v1.0.3';
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
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
          .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
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

  // ── HTML pages: network-first with cache fallback (unchanged).
  if (isPage) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
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
