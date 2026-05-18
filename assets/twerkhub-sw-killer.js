/* ═══ TWERKHUB · Service Worker kill-switch ═══
 * v20260425-p2
 *
 * Stops/unregisters any leftover SW from previous deploys (universal-inject.js
 * etc.) that are aggressively caching stale HTML in users' browsers.
 *
 * v2 changes:
 *   - Overrides navigator.serviceWorker.register() to a no-op so any leftover
 *     register() calls in old HTML (53 pages had it) can't resurrect the SW
 *     after the killer wipes it.
 *   - Self-destructs on first run after success — uses localStorage flag so we
 *     only do the heavy unregister/clear once. After that we just no-op except
 *     the register-blocking shim, which is permanent.
 */
(function(){
  'use strict';
  var FLAG = 'twk_sw_killed_v1';
  if (!('serviceWorker' in navigator)) return;

  // ── 1. Permanently shim navigator.serviceWorker.register() so leftover
  //       register() calls in old HTML can't bring the SW back. ──
  try {
    var sw = navigator.serviceWorker;
    if (sw && typeof sw.register === 'function' && !sw.__twkBlocked) {
      sw.register = function(){
        console.info('[twk-sw-killer] blocked attempt to register service worker');
        return Promise.reject(new Error('Service workers disabled by twk-sw-killer'));
      };
      try { Object.defineProperty(sw, '__twkBlocked', { value: true }); } catch(_){ sw.__twkBlocked = true; }
    }
  } catch(_){}

  // ── 2. Heavy work: unregister any existing SW + wipe Cache API. ──
  var alreadyDone = false;
  try { alreadyDone = localStorage.getItem(FLAG) === '1'; } catch(_){}

  navigator.serviceWorker.getRegistrations().then(function(regs){
    var killed = 0;
    regs.forEach(function(r){
      try { r.unregister(); killed++; } catch(_){}
    });

    if (killed > 0 || !alreadyDone) {
      if (window.caches && caches.keys) {
        caches.keys().then(function(keys){
          return Promise.all(keys.map(function(k){
            try { return caches.delete(k); } catch(_){ return null; }
          }));
        }).then(function(){
          try { localStorage.setItem(FLAG, '1'); } catch(_){}
          if (killed > 0) {
            console.info('[twk-sw-killer] unregistered ' + killed + ' SW(s) and cleared all caches. Reloading…');
            setTimeout(function(){ location.reload(); }, 100);
          }
        }).catch(function(){});
      } else {
        try { localStorage.setItem(FLAG, '1'); } catch(_){}
      }
    }
  }).catch(function(){});
})();
