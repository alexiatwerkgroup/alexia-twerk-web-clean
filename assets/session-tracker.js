/*!
 * session-tracker.js v1 (2026-04-30)
 * --------------------------------------------------------------
 * Heartbeats time-on-site + video clicks to Supabase via the
 * bump_session(seconds, cuts) RPC. Only fires while the tab is
 * visible AND the user is logged in. Silent no-op for guests.
 *
 *   · Heartbeat every 30s of visible time → bump_session(30, 0)
 *   · pagehide / beforeunload sends a final partial bump if any
 *     visible-time has accumulated since the last heartbeat.
 *   · Listens to the existing 'alexia-cut-watched' event from
 *     profile-stats-live.js and posts +1 to cuts_watched.
 *
 * Idempotent — safe to load on every page. Wraps every Supabase
 * call in try/catch so a missing column / failed RPC never breaks
 * the page (graceful degradation).
 */
(function(){
  "use strict";
  if (window.__twkSessionTracker) return;
  window.__twkSessionTracker = true;

  var HEARTBEAT_MS    = 30000;   // 30s
  var MIN_BUMP_MS     = 5000;    // don't bump for less than 5s of visible time
  var MAX_BUMP_SECS   = 60;      // server caps at 60 anyway

  var visibleSinceMs = null;     // ms timestamp when tab became visible
  var pendingSecs    = 0;        // accumulated visible seconds not yet sent
  var pendingCuts    = 0;        // accumulated cut clicks not yet sent
  var sending        = false;    // in-flight flag to avoid overlapping
  var heartbeatTimer = null;

  function nowMs(){ return Date.now(); }

  function isLoggedIn(){
    try {
      var ls = localStorage.getItem('alexia_current_user');
      if (ls && ls !== 'null') return true;
      var ss = sessionStorage.getItem('alexia_current_user');
      if (ss && ss !== 'null') return true;
    } catch(_){}
    return false;
  }

  // Drain any visible-time that's elapsed since visibleSinceMs into pendingSecs.
  function drainVisibleTime(){
    if (visibleSinceMs == null) return;
    var nowM = nowMs();
    var deltaSecs = Math.floor((nowM - visibleSinceMs) / 1000);
    if (deltaSecs > 0) {
      pendingSecs += deltaSecs;
      visibleSinceMs = nowM - ((nowM - visibleSinceMs) % 1000); // keep sub-sec remainder
    }
  }

  async function flush(){
    if (sending) return;
    if (!isLoggedIn()) return;
    drainVisibleTime();
    if (pendingSecs < (MIN_BUMP_MS/1000) && pendingCuts === 0) return;
    var secs = Math.min(MAX_BUMP_SECS, pendingSecs);
    var cuts = Math.min(5, pendingCuts);
    sending = true;
    try {
      var sb = (typeof window.twkGetSupabase === 'function') ? await window.twkGetSupabase() : null;
      if (sb) {
        var resp = await sb.rpc('bump_session', { seconds_delta: secs, cuts_delta: cuts });
        if (!resp.error) {
          pendingSecs = Math.max(0, pendingSecs - secs);
          pendingCuts = Math.max(0, pendingCuts - cuts);
        } else {
          // server rejected — don't keep retrying with the same payload, drop it
          pendingSecs = 0;
          pendingCuts = 0;
        }
      }
    } catch(_){
      // network/SDK error — keep pending, will retry on next heartbeat
    } finally {
      sending = false;
    }
  }

  function startVisible(){
    if (visibleSinceMs == null) visibleSinceMs = nowMs();
  }
  function stopVisible(){
    drainVisibleTime();
    visibleSinceMs = null;
  }

  function onVisibilityChange(){
    if (document.visibilityState === 'visible') startVisible();
    else { stopVisible(); flush(); }
  }

  function onPageHide(){
    drainVisibleTime();
    visibleSinceMs = null;
    // best-effort final bump — fire-and-forget, browser may kill it but tries
    flush();
  }

  function onCutWatched(){
    pendingCuts += 1;
  }

  // Boot
  function boot(){
    if (document.visibilityState === 'visible') startVisible();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    document.addEventListener('alexia-cut-watched', onCutWatched);
    heartbeatTimer = setInterval(flush, HEARTBEAT_MS);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging
  window.__twkSessionTracker = { flush: flush, getPending: function(){ drainVisibleTime(); return { secs: pendingSecs, cuts: pendingCuts }; } };
})();
