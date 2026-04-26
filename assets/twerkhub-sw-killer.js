/* ═══ TWERKHUB · Service Worker kill-switch ═══
 * v20260425-p1
 *
 * Stops/unregisters any leftover SW from previous deploys (universal-inject.js
 * etc.) that are aggressively caching stale HTML in users' browsers.
 *
 * Self-destructs on first run after success — uses a localStorage flag so we
 * only do the heavy unregister/clear once. After that we just no-op.
 *
 * Safe to load on every page — single async block, swallows all errors.
 */
(function(){
  'use strict';
  var FLAG = 'twk_sw_killed_v1';
  if (!('serviceWorker' in navigator)) return;

  // Always run — but if the flag exists, skip the cache clear (already cleared once).
  var alreadyDone = false;
  try { alreadyDone = localStorage.getItem(FLAG) === '1'; } catch(_){}

  navigator.serviceWorker.getRegistrations().then(function(regs){
    var killed = 0;
    regs.forEach(function(r){
      try { r.unregister(); killed++; } catch(_){}
    });

    if (killed > 0 || !alreadyDone) {
      // Wipe ALL caches API entries (the SW used Cache API to store HTML/JS).
      if (window.caches && caches.keys) {
        caches.keys().then(function(keys){
          return Promise.all(keys.map(function(k){
            try { return caches.delete(k); } catch(_){ return null; }
          }));
        }).then(function(){
          try { localStorage.setItem(FLAG, '1'); } catch(_){}
          if (killed > 0) {
            console.info('[twk-sw-killer] unregistered ' + killed + ' SW(s) and cleared all caches. Reloading…');
            // Force reload so the user sees the live (uncached) version of the page.
            // Use setTimeout so the localStorage flag gets persisted before reload.
            setTimeout(function(){ location.reload(); }, 100);
          }
        }).catch(function(){});
      } else {
        try { localStorage.setItem(FLAG, '1'); } catch(_){}
      }
    }
  }).catch(function(){});
})();
