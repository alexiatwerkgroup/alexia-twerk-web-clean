// Service Worker TOMBSTONE
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  e.waitUntil((async function() {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k) { return caches.delete(k); }));
      await self.registration.unregister();
      var cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach(function(c) { c.navigate(c.url); });
    } catch(err) { console.error(err); }
  })());
});
self.addEventListener('fetch', function(e) {
  e.respondWith(fetch(e.request, { cache: 'no-store' }));
});
