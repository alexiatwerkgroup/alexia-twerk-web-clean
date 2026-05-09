/* TWERKHUB · One-shot cache nuke · 2026-05-09
 *
 * Runs on EVERY page load. If the user hasn't been nuked yet (no flag
 * in localStorage), this:
 *   1. Unregisters every Service Worker on this origin
 *   2. Wipes the Cache API completely
 *   3. Sets a flag so it never runs again
 *   4. Hard-reloads the page so the next request hits fresh network
 *
 * Why: the previous SW used stale-while-revalidate which kept serving
 * old JS files even after cache busters were bumped. Users were stuck
 * on broken UIs and asking them to manually unregister the SW + clear
 * site data was unrealistic. This script does it for them automatically.
 */
(function () {
  'use strict';
  var FLAG = 'twk_nuke_done_20260509_v1';
  try {
    if (localStorage.getItem(FLAG) === '1') return;
  } catch (_) { return; }

  var ranOnce = false;
  function done() {
    if (ranOnce) return;
    ranOnce = true;
    try { localStorage.setItem(FLAG, '1'); } catch (_) {}
    // Hard reload bypassing cache — the new SW (if any) and fresh assets
    // will be fetched from network.
    try {
      // Tiny delay so the unregister + cache delete promises finish
      setTimeout(function () { location.reload(); }, 50);
    } catch (_) {
      location.href = location.href;
    }
  }

  var pending = 0;
  function bumpPending() { pending++; }
  function decPending() { pending--; if (pending <= 0) done(); }

  // ── 1. Unregister all SWs ──
  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
    bumpPending();
    navigator.serviceWorker.getRegistrations()
      .then(function (regs) {
        if (!regs || !regs.length) return;
        return Promise.all(regs.map(function (r) {
          try { return r.unregister(); } catch (_) { return null; }
        }));
      })
      .catch(function () {})
      .then(decPending);
  }

  // ── 2. Wipe the Cache API ──
  if (typeof caches !== 'undefined' && caches.keys) {
    bumpPending();
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          try { return caches.delete(k); } catch (_) { return null; }
        }));
      })
      .catch(function () {})
      .then(decPending);
  }

  // Failsafe: if neither API exists, we still set the flag and don't reload.
  if (pending === 0) {
    try { localStorage.setItem(FLAG, '1'); } catch (_) {}
    return;
  }

  // Failsafe: max 5s — if anything hangs, just set the flag and reload anyway.
  setTimeout(function () { if (!ranOnce) done(); }, 5000);
})();
