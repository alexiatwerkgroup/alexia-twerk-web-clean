
(function(){
  'use strict';
  if (window.__alexiaHeatmapGlobalRealtimeInitV2) return;
  window.__alexiaHeatmapGlobalRealtimeInitV2 = true;

  const SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  const BUCKETS = 120;
  const TRACK_MS = 1000;
  const SAVE_MS = 12000;
  const REFRESH_MS = 30000;
  const START_GUARD_SECONDS = 2;
  const REWIND_THRESHOLD = -2;
  const FORWARD_SEEK_THRESHOLD = 3;
  const END_GUARD_SECONDS = 2;
  const FETCH_PAGE_SIZE = 1000;
  const MAX_FETCH_ROWS = 12000;
  const PEAK_MIN_SECOND = 8;
  const PEAK_NEIGHBOR_RADIUS = 3;

  const iframe = document.getElementById('main-video-player') || document.querySelector('.embed iframe');
  const nativeVideo = document.querySelector('.embed video, .player video, video');
  const canvas = document.getElementById('alexia-heatmap-canvas');
  const statusEl = document.getElementById('alexia-hm-status');
  const jumpBtn = document.getElementById('alexia-jump-most');
  if (!canvas || (!iframe && !nativeVideo)) return;

  let client = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) {}

  const ctx = canvas.getContext('2d');
  const videoId = (location.pathname || '').replace(/\.html$/i, '') || 'unknown-video';

  let player = null;
  let tickTimer = null;
  let saveTimer = null;
  let refreshTimer = null;
  let lastSecond = null;
  let warmup = 0;
  let timelineDuration = 0;
  let peakSecond = null;
  let flushing = false;
  let loading = false;
  let activated = false;
  let startedLoops = false;
  let visibleReady = false;

  const localBuffer = Object.create(null);

  function hasActivated(){
    try { return typeof window.__alexiaHasUserActivated === 'function' ? !!window.__alexiaHasUserActivated() : activated; }
    catch(e){ return activated; }
  }
  function setStatus(msg){
    if (statusEl) statusEl.textContent = msg || '';
  }
  function formatTime(sec){
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function sizeCanvas(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(240, Math.floor(canvas.clientWidth || canvas.parentElement.clientWidth || 640));
    const h = Math.max(52, Math.floor(canvas.clientHeight || 58));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }
  function clearCanvas(){
    const s = sizeCanvas();
    ctx.clearRect(0, 0, s.w, s.h);
    if (jumpBtn) jumpBtn.style.display = 'none';
  }
  function drawEmpty(text){
    const s = sizeCanvas();
    ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text || 'No heatmap data yet', s.w / 2, Math.max(24, s.h / 2 + 5));
    if (jumpBtn) jumpBtn.style.display = 'none';
  }
  function render(seconds){
    const s = sizeCanvas();
    ctx.clearRect(0, 0, s.w, s.h);

    const duration = Math.max(1, timelineDuration || (seconds && seconds.length ? Math.max.apply(null, seconds) : 1));
    const safeMax = Math.max(1, duration);
    const exactCounts = new Array(safeMax + 1).fill(0);
    const buckets = Array.from({ length: BUCKETS }, () => ({ count:0, sum:0 }));

    (seconds || []).forEach(sec => {
      sec = Number(sec) || 0;
      if (sec < 0 || sec > safeMax + 10) return;
      if (sec <= safeMax) exactCounts[sec] = (exactCounts[sec] || 0) + 1;
      const idx = Math.max(0, Math.min(BUCKETS - 1, Math.floor((sec / safeMax) * BUCKETS)));
      buckets[idx].count += 1;
      buckets[idx].sum += sec;
    });

    const counts = buckets.map(b => b.count);
    const maxCount = Math.max(1, ...counts);
    const step = s.w / Math.max(1, BUCKETS - 1);
    const baseY = s.h - 10;

    const g = ctx.createLinearGradient(0, 0, 0, s.h);
    g.addColorStop(0, 'rgba(255,176,110,.28)');
    g.addColorStop(1, 'rgba(255,176,110,0)');
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let i = 0; i < BUCKETS; i++) {
      const x = i * step;
      const y = baseY - ((counts[i] / maxCount) * (s.h - 16));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(s.w, baseY);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < BUCKETS; i++) {
      const x = i * step;
      const y = baseY - ((counts[i] / maxCount) * (s.h - 16));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,176,110,.96)';
    ctx.lineWidth = 2;
    ctx.stroke();

    let bestSecond = null;
    let bestProminence = 0;
    let bestCount = 0;
    const minSec = Math.min(safeMax, Math.max(PEAK_MIN_SECOND, START_GUARD_SECONDS + 1));
    const maxSec = Math.max(minSec, safeMax - END_GUARD_SECONDS);

    for (let sec = minSec; sec <= maxSec; sec++) {
      const center = exactCounts[sec] || 0;
      if (!center) continue;
      let neighborSum = 0;
      let neighborCount = 0;
      for (let off = -PEAK_NEIGHBOR_RADIUS; off <= PEAK_NEIGHBOR_RADIUS; off++) {
        if (!off) continue;
        const idx = sec + off;
        if (idx < 0 || idx > safeMax) continue;
        neighborSum += exactCounts[idx] || 0;
        neighborCount += 1;
      }
      const neighborAvg = neighborCount ? (neighborSum / neighborCount) : 0;
      const prominence = center - neighborAvg;
      if (prominence <= 0) continue;
      if (prominence > bestProminence || (prominence === bestProminence && center > bestCount) || (prominence === bestProminence && center === bestCount && (bestSecond === null || sec < bestSecond))) {
        bestProminence = prominence;
        bestCount = center;
        bestSecond = sec;
      }
    }
    if (bestSecond === null) {
      for (let sec = minSec; sec <= maxSec; sec++) {
        const center = exactCounts[sec] || 0;
        if (center > bestCount || (center === bestCount && center > 0 && (bestSecond === null || sec < bestSecond))) {
          bestCount = center;
          bestSecond = sec;
        }
      }
    }
    if (bestSecond === null || bestCount <= 0) {
      peakSecond = null;
      if (jumpBtn) jumpBtn.style.display = 'none';
      return;
    }
    peakSecond = Math.max(1, Math.min(safeMax, Math.round(bestSecond)));
    const peakX = (peakSecond / Math.max(safeMax, 1)) * s.w;
    const peakBucketIdx = Math.max(0, Math.min(BUCKETS - 1, Math.floor((peakSecond / safeMax) * BUCKETS)));
    const peakVal = counts[peakBucketIdx] || bestCount;
    const peakY = baseY - ((peakVal / maxCount) * (s.h - 16));
    ctx.fillStyle = 'rgba(255,228,208,.98)';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    if (jumpBtn) {
      jumpBtn.style.display = 'inline-flex';
      jumpBtn.textContent = '🔥 Jump to most replayed moment ' + formatTime(peakSecond);
    }
  }
  function isVisible(){ return document.visibilityState === 'visible'; }
  function getDuration(){
    try {
      if (nativeVideo && isFinite(nativeVideo.duration) && nativeVideo.duration > 0) return Math.floor(nativeVideo.duration);
      if (player && typeof player.getDuration === 'function') return Math.floor(player.getDuration() || 0);
    } catch (e) {}
    return 0;
  }
  function getCurrentSecond(){
    try {
      if (nativeVideo) return Math.max(0, Math.floor(nativeVideo.currentTime || 0));
      if (player && typeof player.getCurrentTime === 'function') return Math.max(0, Math.floor(player.getCurrentTime() || 0));
    } catch (e) {}
    return 0;
  }
  function isPlaying(){
    try {
      if (nativeVideo) return !nativeVideo.paused && !nativeVideo.ended && nativeVideo.readyState >= 2;
      if (player && typeof player.getPlayerState === 'function') return Number(player.getPlayerState()) === 1;
    } catch (e) {}
    return false;
  }
  function noteSecond(sec, weight){
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    weight = Math.max(1, Math.floor(Number(weight) || 1));
    localBuffer[sec] = (localBuffer[sec] || 0) + weight;
  }
  async function flushBuffer(){
    if (!activated || !client || flushing) return;
    const payload = [];
    Object.entries(localBuffer).forEach(([sec, hits]) => {
      const n = Number(sec);
      const h = Number(hits);
      if (n >= 0 && h > 0) for (let i = 0; i < h; i++) payload.push({ video_id: videoId, second: n });
    });
    if (!payload.length) return;
    flushing = true;
    try {
      const { error } = await client.from('video_heatmap').insert(payload);
      if (error) throw error;
      Object.keys(localBuffer).forEach(k => delete localBuffer[k]);
      setStatus('Live updates on');
      setTimeout(loadHeatmap, 300);
    } catch (e) {
      setStatus('Sync delay');
    } finally {
      flushing = false;
    }
  }
  async function loadHeatmap(){
    if (!activated) return;
    if (!client) {
      drawEmpty('Heatmap unavailable');
      setStatus('Unavailable');
      return;
    }
    if (loading) return;
    loading = true;
    try {
      let allRows = [];
      let from = 0;
      while (from < MAX_FETCH_ROWS) {
        const to = Math.min(from + FETCH_PAGE_SIZE - 1, MAX_FETCH_ROWS - 1);
        const { data, error } = await client.from('video_heatmap').select('id,second').eq('video_id', videoId).order('id', { ascending: false }).range(from, to);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) break;
        allRows = allRows.concat(rows);
        if (rows.length < FETCH_PAGE_SIZE) break;
        from += FETCH_PAGE_SIZE;
      }
      allRows.reverse();
      const secs = allRows.map(r => Number(r.second) || 0).filter(sec => sec >= 0);
      timelineDuration = Math.max(timelineDuration, getDuration(), secs.length ? Math.max.apply(null, secs) : 0);
      if (!secs.length) {
        render([]);
        setStatus('No data yet');
      } else {
        render(secs);
        setStatus('Live from all viewers');
      }
    } catch (e) {
      drawEmpty('Heatmap unavailable');
      setStatus('Load error');
    } finally {
      loading = false;
    }
  }
  function handlePlaybackTick(){
    if (!activated || !isVisible() || !isPlaying()) return;
    const sec = getCurrentSecond();
    const duration = getDuration();
    if (duration > 0) timelineDuration = Math.max(timelineDuration, duration);
    if (sec <= 0) return;
    if (lastSecond === null) { lastSecond = sec; return; }
    const delta = sec - lastSecond;
    if (delta <= REWIND_THRESHOLD) {
      noteSecond(sec, 5);
      warmup = START_GUARD_SECONDS;
      lastSecond = sec;
      return;
    }
    if (delta > FORWARD_SEEK_THRESHOLD) { lastSecond = sec; return; }
    if (delta === 0) return;
    warmup += delta;
    if (warmup < START_GUARD_SECONDS) { lastSecond = sec; return; }
    if (!(duration > 0 && sec >= Math.max(1, duration - END_GUARD_SECONDS))) noteSecond(sec, 1);
    lastSecond = sec;
  }
  function seekToPeak(){
    if (peakSecond == null) return;
    try {
      if (nativeVideo) { nativeVideo.currentTime = peakSecond; return; }
      if (player && typeof player.seekTo === 'function') player.seekTo(peakSecond, true);
    } catch (e) {}
  }
  function ensureYTPlayer(onReady){
    if (!iframe) return false;
    window.__alexiaEnsureMainPlayer = window.__alexiaEnsureMainPlayer || function(iframeEl, cb){
      const iframeNode = iframeEl || document.getElementById('main-video-player') || document.querySelector('.embed iframe');
      if (!iframeNode) return false;
      const deliver = function(p){ if (p && typeof cb === 'function') cb(p); };
      if (window.__alexiaMainPlayer) { deliver(window.__alexiaMainPlayer); return true; }
      window.__alexiaMainPlayerCallbacks = window.__alexiaMainPlayerCallbacks || [];
      if (typeof cb === 'function') window.__alexiaMainPlayerCallbacks.push(cb);
      const flush = function(p){
        if (!p) return;
        window.__alexiaMainPlayer = p;
        const list = (window.__alexiaMainPlayerCallbacks || []).slice();
        window.__alexiaMainPlayerCallbacks = [];
        list.forEach(fn => { try { fn(p); } catch (e) {} });
      };
      const ensure = function(){
        try {
          if (window.__alexiaMainPlayer) { flush(window.__alexiaMainPlayer); return true; }
          if (window.__alexiaMainPlayerBooting) return false;
          if (!window.YT || !window.YT.Player) return false;
          window.__alexiaMainPlayerBooting = true;
          const targetId = iframeNode.id || 'main-video-player';
          if (!iframeNode.id) iframeNode.id = targetId;
          new window.YT.Player(targetId, {
            events: {
              onReady: function(ev){ window.__alexiaMainPlayerBooting = false; flush(ev.target); },
              onError: function(){ window.__alexiaMainPlayerBooting = false; }
            }
          });
          return true;
        } catch (e) { window.__alexiaMainPlayerBooting = false; return false; }
      };
      if (ensure()) return true;
      if (!document.getElementById('alexia-yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'alexia-yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){ try { if (typeof prev === 'function') prev(); } catch (e) {} ensure(); };
      let tries = 0;
      const watcher = setInterval(function(){ tries++; if (ensure() || tries > 8) clearInterval(watcher); }, 1600);
      return false;
    };
    if (!/enablejsapi=1/i.test(iframe.src || '')) iframe.src = (iframe.src || '') + ((iframe.src || '').includes('?') ? '&' : '?') + 'enablejsapi=1';
    return window.__alexiaEnsureMainPlayer(iframe, function(sharedPlayer){ player = sharedPlayer; if (typeof onReady === 'function') onReady(); });
  }
  function bindNative(){
    if (!nativeVideo || nativeVideo.__alexiaHeatmapBound) return;
    nativeVideo.__alexiaHeatmapBound = true;
    nativeVideo.addEventListener('play', function(){ activate(); warmup = 0; startLoops(); setTimeout(loadHeatmap, 120); });
    nativeVideo.addEventListener('seeking', function(){ lastSecond = Math.floor(nativeVideo.currentTime || 0); });
    nativeVideo.addEventListener('pause', function(){ flushBuffer(); });
    nativeVideo.addEventListener('ended', function(){ flushBuffer(); setTimeout(loadHeatmap, 300); });
  }
  function startLoops(){
    if (startedLoops) return;
    startedLoops = true;
    if (!tickTimer) tickTimer = setInterval(handlePlaybackTick, TRACK_MS);
    if (!saveTimer) saveTimer = setInterval(flushBuffer, SAVE_MS);
    if (!refreshTimer) refreshTimer = setInterval(function(){ if (activated && !isPlaying()) loadHeatmap(); }, REFRESH_MS);
  }
  function activate(){
    if (activated) return;
    activated = true;
    visibleReady = true;
    if (statusEl && /tap|scroll|play/i.test(statusEl.textContent || '')) setStatus('Loading replay map…');
    loadHeatmap();
  }
  function bindActivation(){
    ['pointerdown','keydown','touchstart','scroll'].forEach(function(evt){
      window.addEventListener(evt, function(){ activate(); }, { once:true, passive:true });
    });
    if (typeof window.__alexiaOnActivate === 'function') window.__alexiaOnActivate(activate);
  }

  if (jumpBtn) jumpBtn.addEventListener('click', seekToPeak);
  window.addEventListener('resize', function(){ if (activated) loadHeatmap(); });
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') flushBuffer(); });
  window.addEventListener('beforeunload', function(){ flushBuffer(); });

  clearCanvas();
  if (statusEl) setStatus('Tap, scroll or play to load replay map');
  if (jumpBtn) jumpBtn.style.display = 'none';

  bindActivation();
  if (nativeVideo) {
    bindNative();
  } else if (iframe) {
    ensureYTPlayer(function(){
      if (player && !player.__alexiaHeatmapPlayBinding) {
        player.__alexiaHeatmapPlayBinding = true;
        try {
          player.addEventListener('onStateChange', function(ev){
            var state = Number(ev && ev.data);
            if (state === 1) { activate(); startLoops(); setTimeout(loadHeatmap, 120); }
            else if (state === 2 || state === 0) { flushBuffer(); }
          });
        } catch (e) {}
      }
    });
  }
})();
