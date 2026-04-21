// Bump these versions whenever assets that MUST invalidate are updated.
// The SW's activate handler below purges any cache name not listed here.
const CACHE_NAME = 'alexia-pwa-v1.0.1';
const RUNTIME_CACHE = 'alexia-runtime-v1.0.1';
const OFFLINE_URL = '/';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      '/',
      '/index.html',
      '/manifest.json',
      '/icon-192.png',
      '/icon-512.png',
      '/apple-touch-icon.png'
    ])).then(() => self.skipWaiting())
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

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (isPage) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html') || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
