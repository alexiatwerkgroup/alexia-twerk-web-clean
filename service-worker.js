// TWERKHUB · Service Worker v1.0.4
// ─────────────────────────────────────────────────────────────────────────
// 2026-04-24: universal topbar injection. Every HTML response (whether it
// was auto-generated a year ago or edited yesterday) is rewritten on the
// fly so the last thing before </body> is a script tag loading the
// universal topbar injector. That script then:
//   1. Rips out any legacy nav (site-nav-final, snf, alexia-nav, etc.)
//   2. Injects the unified .twerkhub-topbar if missing (including Hot Packs)
//   3. Lazy-loads all dependent CSS/JS (tokens HUD, locale switcher, mobile
//      nav, premium polish, etc.)
// Zero HTML editing required — the fix is applied across all 640+ playlist
// pages + every other page the platform serves.
//
// 2026-04-24 (earlier): fixed "FOUC on first paint" bug. The previous v1.0.1
// used a pure cache-first strategy for every non-HTML asset, so updated
// CSS/JS files kept returning the stale cached copy on every visit until
// the user did a hard reload. Now we use stale-while-revalidate for our own
// assets so the user sees something fast AND the cache is silently refreshed
// for next visit.
// ─────────────────────────────────────────────────────────────────────────
const CACHE_NAME = 'alexia-pwa-v1.1.5';
const RUNTIME_CACHE = 'alexia-runtime-v1.1.5';
const UNIVERSAL_INJECT_URL = '/assets/twerkhub-universal-inject.js?v=20260424-p10';
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

  // ── HTML pages: network-first with cache fallback + universal inject.
  // Every HTML response has the universal topbar injector appended before
  // </body> so any page — no matter how old — renders with the unified nav,
  // live pill, locale switcher and token HUD. The injector is idempotent.
  if (isPage) {
    event.respondWith(
      fetch(request)
        .then(async response => {
          // Only rewrite successful HTML bodies. Leave redirects, errors,
          // opaque responses etc. untouched.
          if (!response || !response.ok) return response;
          const ct = response.headers.get('content-type') || '';
          if (!ct.toLowerCase().includes('text/html')) return response;
          let body = await response.text();
          // Inject if not already present (idempotent — page may have been
          // served from a cache that was already rewritten).
          if (body.indexOf('twerkhub-universal-inject.js') === -1) {
            const injection = '\n<script defer src="' + UNIVERSAL_INJECT_URL + '"></script>\n';
            if (body.indexOf('</body>') !== -1) {
              body = body.replace('</body>', injection + '</body>');
            } else {
              body += injection;
            }
          }
          const rewritten = new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
          // Cache the rewritten copy so offline visits also get the injector.
          const copy = rewritten.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return rewritten;
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
