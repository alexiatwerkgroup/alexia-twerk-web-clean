
(function(){
  'use strict';
  if (window.__alexiaOnlineNowLiveV2) return;
  window.__alexiaOnlineNowLiveV2 = true;

  var SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  var KEY = 'alexia_online_now_live_value_v2';
  var TS_KEY = 'alexia_online_now_live_ts_v2';
  var VISITOR_KEY = 'alexia_online_visitor_v1';
  var LAST_BEAT_KEY = 'alexia_online_last_beat_v1';
  // 2026-05-02: EMERGENCY EGRESS REDUCTION — was hitting 232% bandwidth quota
  // (12.79GB / 5.5GB free tier). Heartbeat raised 5min → 30min. queryLiveCount
  // no longer fetches at all (returns cached/fake — see queryLiveCount below).
  // INTERVAL is now meaningless since refresh() is a no-op for fetch.
  var INTERVAL = 1800000;           // 30min refresh (was 5min) — barely used now
  var HEARTBEAT_INTERVAL = 1800000; // 30min heartbeat (was 5min)
  var WINDOW_MINUTES = 60;          // wider window to need less precision
  var MAX_ROWS = 0;                 // unused — fetch killed
  var FALLBACK_MIN = 1;

  function getVisitorId(){
    try{
      var v = localStorage.getItem(VISITOR_KEY);
      if (v) return v;
      v = 'v_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, v);
      return v;
    } catch(e){ return 'v_' + Math.random().toString(36).slice(2,10); }
  }

  // 2026-05-02: bot detection added — bots no longer trigger writes either.
  function isBotUA(){
    var ua = (navigator.userAgent || '').toLowerCase();
    return /bot|crawler|spider|headlesschrome|yandex|googlebot|bingbot|duckduck|baidu|lighthouse/i.test(ua);
  }
  async function heartbeat(force){
    try{
      if (isBotUA()) return;  // bots don't need to be tracked
      var nowTs = Date.now();
      var last = parseInt(localStorage.getItem(LAST_BEAT_KEY) || '0', 10);
      if (!force && last && (nowTs - last) < HEARTBEAT_INTERVAL) return;
      localStorage.setItem(LAST_BEAT_KEY, String(nowTs));
      await fetch(SUPABASE_URL + '/rest/v1/page_visits', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ page: 'online', visitor_id: getVisitorId() }),
        keepalive: true
      });
    } catch(e){}
  }

  function now(){ return Date.now(); }
  function readNum(key){
    try {
      var v = parseInt(localStorage.getItem(key), 10);
      return Number.isFinite(v) ? v : null;
    } catch(e){ return null; }
  }
  function writeState(value, ts){
    try {
      localStorage.setItem(KEY, String(value));
      localStorage.setItem(TS_KEY, String(ts));
    } catch(e){}
  }
  function getCached(){
    var value = readNum(KEY);
    var ts = readNum(TS_KEY);
    return { value: value, ts: ts };
  }
  function applyCount(count){
    count = Math.max(FALLBACK_MIN, Number(count) || FALLBACK_MIN);
    var sels = [
      '.online-count', '.online-now-count', '[data-online-now-count]', '[data-alexia-online-count]',
      '#global-online-count', '#onlineCount', '#online-count', '.site-nav-final__online span:last-child'
    ];
    var seen = [];
    sels.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if (seen.indexOf(el) !== -1) return;
        seen.push(el);
        el.textContent = String(count);
      });
    });
  }
  function prepaint(){
    var cached = getCached();
    if (cached.value !== null) applyCount(cached.value);
  }
  function isoMinutesAgo(mins){
    return new Date(Date.now() - (mins * 60 * 1000)).toISOString();
  }
  // 2026-05-02: EMERGENCY EGRESS REDUCTION.
  // Supabase free-tier hit 232% of bandwidth quota (12.79GB / 5.5GB).
  // Was: every visitor + every bot fetched up to 1500 page_visits rows
  // (~150KB each) every 5 min. With Yandex bot crawl enabled today this
  // exploded.
  // Now: NO MORE READS from page_visits. The "LIVE 412" topbar number is
  // already animated client-side via the inline tick() in twk-nav-v1-css.
  // We keep the heartbeat WRITES (small payloads, throttled to 5min) so
  // admin can still query the data manually from the Supabase dashboard
  // when needed.
  async function queryLiveCount(){
    // Bots get nothing — they don't need a live count
    var ua = (navigator.userAgent || '').toLowerCase();
    if (/bot|crawler|spider|headlesschrome|yandex|googlebot|bingbot|duckduck|baidu|lighthouse/i.test(ua)) {
      return FALLBACK_MIN;
    }
    // Humans: serve the cached value if any, otherwise a deterministic fake
    // based on visitor_id so the number stays stable per session.
    var cached = getCached();
    if (cached.value !== null) return Math.max(FALLBACK_MIN, cached.value);
    // Fallback: pseudo-random in 380..460 range, stable per session
    var vid = getVisitorId();
    var seed = 0;
    for (var i = 0; i < vid.length; i++) seed = (seed * 31 + vid.charCodeAt(i)) | 0;
    var fakeCount = 380 + Math.abs(seed % 80);
    return fakeCount;
  }
  async function refresh(force){
    var cached = getCached();
    if (!force && cached.value !== null && cached.ts !== null && (now() - cached.ts) < INTERVAL) {
      applyCount(cached.value);
      return;
    }
    var count = await queryLiveCount();
    writeState(count, now());
    applyCount(count);
  }
  function start(){
    prepaint();
    // Fire heartbeat + read count on load; refresh count every minute;
    // re-heartbeat every 30s so visitor stays counted in the 5-min window.
    heartbeat(true).then(function(){ refresh(true); });
    setInterval(function(){ refresh(true); }, INTERVAL);
    setInterval(function(){ if (document.visibilityState === 'visible') heartbeat(false); }, HEARTBEAT_INTERVAL);
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'visible') { heartbeat(true); refresh(true); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
