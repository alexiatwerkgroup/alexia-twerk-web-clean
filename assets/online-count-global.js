
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
  // 2026-05-01: drastic IO reduction — Supabase free tier was hitting Disk IO budget.
  // Was: heartbeat 30s, refresh 60s. Now: heartbeat 5min, refresh 5min.
  // Impact: ~10x fewer writes to page_visits + ~5x fewer reads.
  var INTERVAL = 300000;            // 5min refresh (was 60s)
  var HEARTBEAT_INTERVAL = 300000;  // 5min heartbeat (was 30s)
  var WINDOW_MINUTES = 10;          // count visitors active in last 10min (was 5)
  var MAX_ROWS = 1500;              // smaller fetch (was 4000)
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

  // Heartbeat: every page that loads this script posts a visitor_id row
  // into page_visits with page='online'. This is what feeds the live count.
  // (Before this fix, NO page wrote heartbeats, so the count was always 0.)
  async function heartbeat(force){
    try{
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
  async function queryLiveCount(){
    var since = isoMinutesAgo(WINDOW_MINUTES);
    // BUG FIX: was `&page=0` which PostgREST rejected with 400 PGRST100
    // Correct syntax is `&page=eq.online` to filter where page = 'online'
    var url = SUPABASE_URL + '/rest/v1/page_visits?select=visitor_id,created_at&page=eq.online&limit=' + MAX_ROWS +
      '&created_at=gte.' + encodeURIComponent(since);
    try {
      var res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('http ' + res.status);
      var rows = await res.json();
      var ids = Object.create(null);
      (rows || []).forEach(function(row){
        var id = String((row && row.visitor_id) || '').trim();
        if (id) ids[id] = 1;
      });
      var count = Object.keys(ids).length;
      return Math.max(FALLBACK_MIN, count);
    } catch (e) {
      var cached = getCached();
      return Math.max(FALLBACK_MIN, cached.value || FALLBACK_MIN);
    }
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
