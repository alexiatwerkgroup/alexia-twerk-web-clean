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

  // 2026-05-01: drastic IO reduction. Was 30s heartbeat. Now 5min.
  // Aggregating up to 60s of visible time per bump (server cap) but only
  // sending once every 5 minutes. Cuts profiles UPDATEs by 10x.
  // 2026-05-03: lowered MIN_BUMP_MS 60s → 15s and force-flush on pagehide.
  // Was missing all bouncer sessions (<60s). Now any visitor who stays >=15s
  // gets tracked. Heartbeat still 5min so egress stays low for long sessions.
  var HEARTBEAT_MS    = 300000;  // 5min (was 30s)
  var MIN_BUMP_MS     = 15000;   // 15s minimum to avoid empty hits but catch quick visits
  var MAX_BUMP_SECS   = 60;      // server still caps at 60 per call

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

  async function flush(force){
    if (sending) return;
    if (!isLoggedIn()) return;
    drainVisibleTime();
    // Heartbeat path respects MIN_BUMP_MS to avoid noise. Force path (called
    // on pagehide/beforeunload) bypasses the threshold so we capture ANY
    // accumulated visible-time before the user leaves — even if it's <15s.
    if (!force && pendingSecs < (MIN_BUMP_MS/1000) && pendingCuts === 0) return;
    if (pendingSecs <= 0 && pendingCuts === 0) return; // truly nothing to send
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
    // best-effort final bump — fire-and-forget, browser may kill it but tries.
    // force=true → bypass MIN_BUMP_MS threshold so even short visits get tracked.
    flush(true);
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
