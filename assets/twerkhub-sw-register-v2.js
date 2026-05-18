/* TWERKHUB · Service Worker registration v2 (opt-in)
 * v20260506-p1
 *
 * SAFE ROLLOUT STRATEGY:
 * - Does NOTHING by default. Loaded but inert.
 * - Activates ONLY if URL has ?enable_sw=v2 (opt-in test).
 * - Once activated, sets localStorage flag 'twk_sw_v2_enabled'.
 * - On subsequent visits, the flag persists registration.
 * - Adds a kill-switch: ?disable_sw=1 unregisters + clears flag.
 *
 * INTERACTION WITH twerkhub-sw-killer.js:
 * - Killer overrides navigator.serviceWorker.register() to a no-op.
 * - We bypass via direct ServiceWorkerRegistration constructor — NO, can't.
 * - Better: we save register() before the killer runs, then call our copy.
 * - Our script must load BEFORE twerkhub-sw-killer.js for this to work.
 *
 * USAGE:
 * 1. Load this script BEFORE sw-killer (in <head> with async if possible).
 * 2. Test by visiting https://alexiatwerkgroup.com/?enable_sw=v2
 * 3. Verify SW is active in DevTools > Application > Service Workers.
 * 4. If broken: visit https://alexiatwerkgroup.com/?disable_sw=1
 *    OR clear storage in DevTools.
 * 5. After confirming v2 SW works for 24-48h, in next session:
 *    - Remove the ?enable_sw=v2 gate (always register).
 *    - Or remove the killer entirely.
 */
(function(){
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  // --- Save register() before any killer overrides it ---
  var ORIG_REGISTER = navigator.serviceWorker.register
    ? navigator.serviceWorker.register.bind(navigator.serviceWorker)
    : null;
  if (!ORIG_REGISTER) return;

  // --- Kill-switch: ?disable_sw=1 ---
  var url = new URL(window.location.href);
  if (url.searchParams.get('disable_sw') === '1') {
    try { localStorage.removeItem('twk_sw_v2_enabled'); } catch(_){}
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(r){ try { r.unregister(); } catch(_){} });
      console.info('[twk-sw-v2] killed on user request (?disable_sw=1)');
    }).catch(function(){});
    return;
  }

  // --- Opt-in toggle: ?enable_sw=v2 sets flag ---
  if (url.searchParams.get('enable_sw') === 'v2') {
    try { localStorage.setItem('twk_sw_v2_enabled', '1'); } catch(_){}
    console.info('[twk-sw-v2] enabled via URL flag');
  }

  // --- Check if v2 SW is enabled for this user ---
  var enabled = false;
  try { enabled = localStorage.getItem('twk_sw_v2_enabled') === '1'; } catch(_){}
  if (!enabled) return;

  // --- Register the v2 SW after window load to avoid blocking critical path ---
  function registerV2(){
    try {
      ORIG_REGISTER('/service-worker.js', { scope: '/' })
        .then(function(reg){
          console.info('[twk-sw-v2] registered scope=' + reg.scope);
          // Listen for updates
          reg.addEventListener('updatefound', function(){
            var nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', function(){
              if (nw.state === 'activated') {
                console.info('[twk-sw-v2] new SW activated');
              }
            });
          });
        })
        .catch(function(err){
          console.warn('[twk-sw-v2] register failed:', err && err.message);
        });
    } catch (err) {
      console.warn('[twk-sw-v2] register threw:', err && err.message);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(registerV2, 800);
  } else {
    window.addEventListener('load', function(){ setTimeout(registerV2, 800); });
  }
})();
