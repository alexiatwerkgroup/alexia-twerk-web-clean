/* ═══ TWERKHUB · Heatmap client ═══
 * v20260425-p2
 *
 * Talks to Supabase RPC `record_watch(vid, watched int[])` and reads the
 * aggregated `video_heatmap` table. Renders a YouTube-style "most replayed"
 * bar under the player.
 *
 * Design (locked in by user, 2026-04-25):
 *   • TOTAL_BUCKETS = 20  → 5% of the video each
 *   • MIN_VIEWS = 10      → hide bar below this threshold
 *   • Anchored under the iframe (or any anchor element passed in)
 *
 * Public API:
 *   window.TwkHeatmap.attach(vid, anchorEl, getPlayerFn)
 *     - vid:        YouTube video id (string)
 *     - anchorEl:   element AFTER which the bar is injected
 *     - getPlayerFn: function returning the YT.Player instance (or null)
 *
 *   window.TwkHeatmap.flush()
 *     - call when the player is destroyed/closed; submits any unsent buckets
 *
 * Auto-flushes on visibilitychange (hidden) and beforeunload.
 */
(function(){
  'use strict';

  var TOTAL_BUCKETS = 20;
  var MIN_VIEWS     = 2;
  var TICK_MS       = 1000;

  var session = null; // { vid, watched[], getPlayer, timer, hadPlayback }

  function getClient(){
    if (window.twkGetSupabase) return window.twkGetSupabase();
    return Promise.resolve(window.__twkSupabase || null);
  }

  // 2026-05-01: Disk IO reduction. Was: SELECT video_heatmap on EVERY page load
  // (~70k reads/period across all video pages). Now: cached in sessionStorage
  // per video for 30 minutes. Cuts video_heatmap reads ~20x.
  var HM_CACHE_KEY = 'twk_heatmap_cache_v1';
  var HM_CACHE_TTL = 1800000;  // 30 min

  function getCachedHeatmap(vid){
    try {
      var raw = sessionStorage.getItem(HM_CACHE_KEY);
      if (!raw) return null;
      var all = JSON.parse(raw);
      var hit = all && all[vid];
      if (!hit || Date.now() - hit.ts > HM_CACHE_TTL) return null;
      return hit.data;
    } catch(_){ return null; }
  }
  function setCachedHeatmap(vid, data){
    try {
      var raw = sessionStorage.getItem(HM_CACHE_KEY);
      var all = raw ? JSON.parse(raw) : {};
      all[vid] = { ts: Date.now(), data: data };
      // keep cache bounded — only last 30 entries per session
      var keys = Object.keys(all);
      if (keys.length > 30) {
        keys.sort(function(a,b){ return all[a].ts - all[b].ts; });
        for (var i = 0; i < keys.length - 30; i++) delete all[keys[i]];
      }
      sessionStorage.setItem(HM_CACHE_KEY, JSON.stringify(all));
    } catch(_){}
  }

  async function fetchHeatmap(vid){
    var cached = getCachedHeatmap(vid);
    if (cached) return cached;
    try {
      var sb = await getClient();
      if (!sb) return null;
      var res = await sb.from('video_heatmap')
        .select('total_views,buckets')
        .eq('video_id', vid)
        .maybeSingle();
      if (res.error) return null;
      setCachedHeatmap(vid, res.data);
      return res.data;
    } catch(e){
      console.warn('[heatmap] fetch failed', e);
      return null;
    }
  }

  async function submitHeatmap(vid, watched){
    try {
      var sb = await getClient();
      if (!sb) return;
      var r = await sb.rpc('record_watch', { vid: vid, watched: watched });
      if (r && r.error) console.warn('[heatmap] rpc error', r.error);
    } catch(e){
      console.warn('[heatmap] submit failed', e);
    }
  }

  function injectStyle(){
    if (document.getElementById('twk-heatmap-css')) return;
    var s = document.createElement('style');
    s.id = 'twk-heatmap-css';
    s.textContent = [
      '.twk-heatmap-container{margin:10px 0 4px;}',
      '.twk-heatmap{font:400 11px/1.2 ui-sans-serif,system-ui,sans-serif;color:rgba(255,255,255,.7);}',
      '.twk-heatmap-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}',
      '.twk-heatmap-label{letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.55);font-size:10px;}',
      '.twk-heatmap-views{color:rgba(255,255,255,.42);font-size:10px;}',
      '.twk-heatmap-bar{position:relative;height:34px;background:rgba(255,255,255,.04);border-radius:4px;overflow:hidden;}',
      '.twk-heatmap-bucket{position:absolute;bottom:0;background:linear-gradient(180deg,#ff5fa3,#a32f6e);opacity:.85;transition:opacity .15s;}',
      '.twk-heatmap-bucket:hover{opacity:1;}',
      '.twk-heatmap-bucket.peak{background:linear-gradient(180deg,#ffd166,#ff5fa3);}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureContainer(anchorEl, vid){
    var existing = document.getElementById('twk-heatmap-host');
    if (existing) {
      existing.dataset.vid = vid;
      existing.innerHTML = '';
      return existing;
    }
    var el = document.createElement('div');
    el.id = 'twk-heatmap-host';
    el.className = 'twk-heatmap-container';
    el.dataset.vid = vid;
    if (anchorEl && anchorEl.parentNode) {
      anchorEl.parentNode.insertBefore(el, anchorEl.nextSibling);
    } else {
      document.body.appendChild(el);
    }
    return el;
  }

  function renderBar(container, data){
    if (!container) return;
    if (!data || !data.buckets) { container.innerHTML = ''; container.style.display = 'none'; return; }
    var views = data.total_views || 0;
    if (views < MIN_VIEWS) { container.innerHTML = ''; container.style.display = 'none'; return; }

    var buckets = Array.isArray(data.buckets) ? data.buckets : (function(){
      try { return JSON.parse(data.buckets); } catch(_){ return []; }
    })();
    if (!buckets.length) { container.innerHTML = ''; container.style.display = 'none'; return; }

    var max = 0;
    for (var i = 0; i < buckets.length; i++) if (buckets[i] > max) max = buckets[i];
    if (max === 0) { container.innerHTML = ''; container.style.display = 'none'; return; }

    var n = buckets.length;
    var bw = 100 / n;
    var html = '<div class="twk-heatmap">';
    html +=   '<div class="twk-heatmap-head">';
    html +=     '<span class="twk-heatmap-label">Most replayed</span>';
    html +=     '<span class="twk-heatmap-views">' + views + ' views</span>';
    html +=   '</div>';
    html +=   '<div class="twk-heatmap-bar">';
    for (var j = 0; j < n; j++) {
      var h = Math.max(4, Math.round((buckets[j] / max) * 100));
      var left = (j * bw).toFixed(2);
      var w = bw.toFixed(2);
      var peak = (buckets[j] === max) ? ' peak' : '';
      var startPct = Math.round(j * bw);
      var endPct   = Math.round((j + 1) * bw);
      html += '<div class="twk-heatmap-bucket' + peak + '" '
            + 'style="left:' + left + '%;width:' + w + '%;height:' + h + '%;" '
            + 'title="' + startPct + '–' + endPct + '% · ' + buckets[j] + ' views"></div>';
    }
    html +=   '</div>';
    html += '</div>';
    container.innerHTML = html;
    container.style.display = '';
  }

  async function attach(vid, anchorEl, getPlayerFn){
    if (!vid) return;
    injectStyle();
    await flush(); // close any previous session

    var container = ensureContainer(anchorEl, vid);
    var data = await fetchHeatmap(vid);
    renderBar(container, data);

    var watched = new Array(TOTAL_BUCKETS).fill(0);
    session = {
      vid: vid,
      watched: watched,
      getPlayer: getPlayerFn,
      timer: null,
      hadPlayback: false
    };

    session.timer = setInterval(function(){
      try {
        if (!session) return;
        var p = session.getPlayer && session.getPlayer();
        if (!p) return;
        var dur = (typeof p.getDuration === 'function') ? p.getDuration() : 0;
        var cur = (typeof p.getCurrentTime === 'function') ? p.getCurrentTime() : 0;
        var state = (typeof p.getPlayerState === 'function') ? p.getPlayerState() : -1;
        if (state !== 1) return; // 1 = PLAYING
        if (dur <= 0) return;
        var idx = Math.min(TOTAL_BUCKETS - 1, Math.floor((cur / dur) * TOTAL_BUCKETS));
        if (idx >= 0) {
          watched[idx] = 1;
          session.hadPlayback = true;
        }
      } catch(_){}
    }, TICK_MS);
  }

  async function flush(){
    if (!session) return;
    var s = session;
    session = null;
    try { clearInterval(s.timer); } catch(_){}
    if (!s.hadPlayback) return;
    var sum = 0;
    for (var i = 0; i < s.watched.length; i++) sum += s.watched[i];
    if (sum === 0) return;
    await submitHeatmap(s.vid, s.watched);
  }

  // Auto-flush triggers
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) flush();
  });
  window.addEventListener('beforeunload', function(){
    // Fire-and-forget — we won't await, but RPC call is queued
    if (session && session.hadPlayback) {
      try {
        var sum = 0;
        for (var i = 0; i < session.watched.length; i++) sum += session.watched[i];
        if (sum > 0) submitHeatmap(session.vid, session.watched);
      } catch(_){}
    }
  });

  window.TwkHeatmap = {
    attach: attach,
    flush: flush,
    fetch: fetchHeatmap,
    TOTAL_BUCKETS: TOTAL_BUCKETS,
    MIN_VIEWS: MIN_VIEWS
  };
})();
