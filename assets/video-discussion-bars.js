(function(){
  'use strict';
  if (window.__alexiaVideoDiscussionBarsInit) return;
  window.__alexiaVideoDiscussionBarsInit = true;
  var path = location.pathname || '';
  if (!/\/playlist\//i.test(path) || /\/playlist\/?$/i.test(path) || /\/playlist\/index\.html$/i.test(path)) return;

  var PAGE_HTML = path.replace(/^\/+/, '');
  var PAGE_PATH = path.replace(/\.html$/i, '');
  var PAGE_SLUG = (PAGE_PATH.split('/').pop() || 'page').trim();
  var PERF = window.__alexiaPerfConfig || {};
  var COMMENT_URL      = window.ALEXIA_COMMENTS_SUPABASE_URL  || 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var COMMENT_KEY      = window.ALEXIA_COMMENTS_SUPABASE_KEY  || 'sb_publishable_vpZrp8cL12lpJ3MYWlne6Q_dDkW2NlI';
  var COMMENT_ANON_JWT = window.ALEXIA_COMMENTS_SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  var viewMarkerKey      = 'alexia_replay_completed::' + PAGE_HTML;
  var localReplayBoostKey = 'alexia_local_replay_boost::' + PAGE_HTML;
  var replayProgressKey  = 'alexia_replay_progress::' + PAGE_HTML;
  var commentVariants = Array.from(new Set([PAGE_PATH, PAGE_SLUG, '/' + PAGE_SLUG, path, PAGE_HTML].filter(Boolean)));
  var BARS_REFRESH_MS = Math.max(20000, Number(PERF.barsRefreshMs) || 30000);
  var BOOT_AT = Date.now();

  // ─── Local playback state (no getPlayerState() polling) ──────────────────
  // Updated exclusively via YouTube onStateChange events.
  // ytIsPlaying = true only when state 1 fires, false on any other state.
  var ytIsPlaying = false;

  function markPlaying(){ ytIsPlaying = true; }
  function markNotPlaying(){ ytIsPlaying = false; }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function parseIntSafe(value){ var m = String(value || '').replace(/,/g,'').match(/-?\d+/); return m ? (parseInt(m[0], 10) || 0) : 0; }

  function canRunRemoteRefresh(){
    if (typeof window.__alexiaHasUserActivated === 'function' && !window.__alexiaHasUserActivated()) return false;
    if (ytIsPlaying) return false;
    if ((Date.now() - BOOT_AT) < Math.max(0, Number(PERF.initialRemoteDelayMs) || 0)) return false;
    return true;
  }

  function stableVoteReplayMultiplier(){
    var seed = String(PAGE_SLUG || PAGE_PATH || PAGE_HTML || 'page');
    var acc = 0;
    for (var i = 0; i < seed.length; i++) acc += seed.charCodeAt(i);
    return 3 + (acc % 2);
  }
  function replayBoostFromVotes(votes){ return Math.max(0, parseIntSafe(votes)) * stableVoteReplayMultiplier(); }
  function replayCurveBoost(total){
    total = Math.max(0, parseIntSafe(total));
    if (!total) return 0;
    if (total <= 10) return Math.ceil(Math.sqrt(total));
    if (total <= 30) return Math.ceil(Math.sqrt(total) * 1.2);
    return Math.ceil(Math.sqrt(total));
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  function injectStyle(){
    if (document.getElementById('alexia-video-bars-style')) return;
    var style = document.createElement('style');
    style.id = 'alexia-video-bars-style';
    style.textContent = [
      '.alexia-discussion-bars{margin:16px 6px 18px;padding:0;position:relative;z-index:2}',
      '.alexia-discussion-row{margin:0 0 18px}',
      '.alexia-discussion-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 8px}',
      '.alexia-discussion-head strong{font-size:16px;letter-spacing:.18em;text-transform:uppercase;color:#fff;font-weight:900}',
      '.alexia-discussion-head span{font-size:14px;font-weight:900;color:rgba(255,255,255,.92)}',
      '.alexia-discussion-track{height:14px;border-radius:999px;position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
      '.alexia-discussion-fill{position:absolute;inset:0 auto 0 0;width:100%;transform-origin:left center;transform:scaleX(0);transition:transform .35s ease;will-change:transform}',
      '.alexia-discussion-row.replays .alexia-discussion-fill{background:linear-gradient(90deg,#ff5b68 0%,#ffbc61 100%);box-shadow:0 0 18px rgba(255,120,88,.35)}',
      '.alexia-discussion-row.discussion .alexia-discussion-fill{background:linear-gradient(90deg,#f45bb4 0%,#8c70ff 52%,#59c7ff 100%);box-shadow:0 0 18px rgba(112,143,255,.32)}',
      '.alexia-discussion-meta{margin-top:8px;font-size:14px;color:rgba(255,255,255,.78)}',
      '.alexia-discussion-meta strong{font-weight:900;color:#fff}',
      '@media (max-width:768px){.alexia-discussion-head strong{font-size:14px}.alexia-discussion-head span,.alexia-discussion-meta{font-size:13px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function getDomCounts(){
    var commentsEl = document.querySelector('.yt-comments-count');
    var voteBtn    = document.querySelector('.vote-btn,[data-inline-votes],[class*="vote"]');
    var votes = voteBtn ? parseIntSafe(voteBtn.textContent) : 0;
    return { comments: parseIntSafe(commentsEl && commentsEl.textContent), likes: votes };
  }

  function replayPercent(replays){
    replays = Math.max(0, parseIntSafe(replays));
    if (!replays) return 0;
    return Math.min(100, replays + replayCurveBoost(replays));
  }
  function discussionPercent(comments, likes){
    var score = Math.max(0, parseIntSafe(comments)) + Math.max(0, parseIntSafe(likes));
    return Math.min(100, score);
  }

  function ensureBars(){
    var commentsRoot = document.querySelector('[data-comments-root]');
    var heatmapBox   = document.getElementById('alexia-hm-box');
    if (!commentsRoot || !heatmapBox) return null;
    var bars = document.getElementById('alexia-discussion-bars');
    if (bars) return bars;
    bars = document.createElement('section');
    bars.id = 'alexia-discussion-bars';
    bars.className = 'alexia-discussion-bars';
    bars.innerHTML =
      '<div class="alexia-discussion-row replays">' +
        '<div class="alexia-discussion-head"><strong>Hot replays</strong><span data-bars-replays-pct>0%</span></div>' +
        '<div class="alexia-discussion-track"><div class="alexia-discussion-fill" data-bars-replays-fill></div></div>' +
        '<div class="alexia-discussion-meta" data-bars-replays-meta>0 engaged replays tracked.</div>' +
      '</div>' +
      '<div class="alexia-discussion-row discussion">' +
        '<div class="alexia-discussion-head"><strong>Top discussion</strong><span data-bars-discussion-pct>0%</span></div>' +
        '<div class="alexia-discussion-track"><div class="alexia-discussion-fill" data-bars-discussion-fill></div></div>' +
        '<div class="alexia-discussion-meta" data-bars-discussion-meta>0 comments · 0 likes.</div>' +
      '</div>';
    commentsRoot.parentNode.insertBefore(bars, commentsRoot);
    return bars;
  }

  // ─── Optimistic bars update (for vote clicks — instant, no query) ─────────
  function applyOptimisticVote(){
    var bars = document.getElementById('alexia-discussion-bars');
    if (!bars) return;
    var metaEl  = bars.querySelector('[data-bars-discussion-meta]');
    var pctEl   = bars.querySelector('[data-bars-discussion-pct]');
    var fillEl  = bars.querySelector('[data-bars-discussion-fill]');
    if (!metaEl) return;
    // Parse current counts from meta text
    var metaText = metaEl.textContent || '';
    var commentsMatch = metaText.match(/(\d+)\s*comment/);
    var likesMatch    = metaText.match(/(\d+)\s*Vote/);
    var comments = commentsMatch ? parseInt(commentsMatch[1], 10) : getDomCounts().comments;
    var likes    = (likesMatch ? parseInt(likesMatch[1], 10) : getDomCounts().likes) + 1;
    var pct = discussionPercent(comments, likes);
    if (fillEl) fillEl.style.transform = 'scaleX(' + (pct / 100) + ')';
    if (pctEl)  pctEl.textContent = pct + '%';
    if (metaEl) metaEl.innerHTML  = '<strong>' + comments + '</strong> comments · <strong>' + likes + '</strong> Vote Hot activity.';
  }

  // ─── Comments loader ───────────────────────────────────────────────────────
  function loadCommentsImmediately(){
    if (window.__alexiaCommentsImmediateLoaded) return;
    window.__alexiaCommentsImmediateLoaded = true;
    var root = document.querySelector('[data-comments-root]');
    if (root && root.dataset.commentsFinalV5 === '1') return;
    if (document.querySelector('script[data-comments-community-v2]')) return;
    var s = document.createElement('script');
    s.src = '/assets/comments-community-v2.js?v=trex7';
    s.defer = true;
    s.setAttribute('data-comments-community-v2', '1');
    document.head.appendChild(s);
  }

  // ─── Supabase queries (only when not playing) ─────────────────────────────
  async function queryCommentStats(){
    try {
      var query = commentVariants.map(function(v){ return 'page_slug.eq.' + encodeURIComponent(v); }).join(',');
      var url = COMMENT_URL + '/rest/v1/video_comments?select=id,likes_count,page_slug&or=(' + query + ')&limit=5000&_=' + Date.now();
      var res = await fetch(url, { headers:{'apikey':COMMENT_KEY,'Authorization':'Bearer '+COMMENT_KEY,'Cache-Control':'no-cache'}, cache:'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      var rows = await res.json();
      var ids = (rows || []).map(function(row){ return row && row.id; }).filter(Boolean);
      var storedLikes = 0;
      (rows || []).forEach(function(row){ storedLikes += parseIntSafe(row && row.likes_count); });
      var liveLikes = 0;
      if (ids.length) {
        try {
          var likesUrl = COMMENT_URL + '/rest/v1/page_visits?select=page,visitor_id&or=(page.like.' + encodeURIComponent('comment_like::') + '%25,page.like.' + encodeURIComponent('comment_unlike::') + '%25)&limit=2000&_=' + Date.now();
          var likesRes = await fetch(likesUrl, { headers:{'apikey':COMMENT_KEY,'Authorization':'Bearer '+COMMENT_KEY,'Cache-Control':'no-cache'}, cache:'no-store' });
          if (likesRes.ok) {
            var likeRows = await likesRes.json();
            var map = new Map();
            ids.forEach(function(id){ map.set(String(id), new Set()); });
            (likeRows || []).forEach(function(row){
              var page    = String(row && row.page || '');
              var visitor = String(row && row.visitor_id || '');
              var m = page.match(/^comment_like::(.+)$/);
              if (m && map.has(String(m[1])) && visitor) map.get(String(m[1])).add(visitor);
              m = page.match(/^comment_unlike::(.+)$/);
              if (m && map.has(String(m[1])) && visitor) map.get(String(m[1])).delete(visitor);
            });
            map.forEach(function(set){ liveLikes += set.size; });
          }
        } catch(e) {}
      }
      return { comments: (rows || []).length, likes: Math.max(storedLikes, liveLikes) };
    } catch(e) { return null; }
  }

  async function queryHistoricalViews(){
    try {
      var raw    = (location.pathname || '').replace(/\/+$/, '');
      var noHtml = raw.replace(/\.html$/i, '');
      var variants = Array.from(new Set([
        raw, noHtml,
        raw.replace(/^\/+/, ''),
        noHtml.replace(/^\/+/, ''),
        '/' + noHtml.replace(/^\/+/, '')
      ].filter(Boolean)));
      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          var client = window.__alexiaBarsViewsClient;
          if (!client) {
            client = window.supabase.createClient(COMMENT_URL, COMMENT_ANON_JWT, {
              auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
            });
            window.__alexiaBarsViewsClient = client;
          }
          var result = await client.from('user_video_views').select('id', { count:'exact', head:true }).in('video_slug', variants);
          if (!result.error && typeof result.count === 'number') return Math.max(0, result.count);
        }
      } catch(e) {}
      try {
        var encoded = variants.map(function(v){ return '"' + String(v).replace(/"/g,'\\"') + '"'; }).join(',');
        var url = COMMENT_URL + '/rest/v1/user_video_views?select=id&video_slug=in.(' + encoded + ')';
        var res = await fetch(url, {
          headers:{'apikey':COMMENT_ANON_JWT,'Authorization':'Bearer '+COMMENT_ANON_JWT,'Cache-Control':'no-cache'},
          cache:'no-store'
        });
        if (res.ok) { var rows = await res.json(); if (Array.isArray(rows)) return rows.length; }
      } catch(e) {}
    } catch(e) {}
    return 0;
  }

  async function fetchReplayCompletionCount(){
    try {
      if (!window.supabaseClient) return null;
      var marker = 'replay::' + PAGE_HTML;
      var data = await window.supabaseClient.from('page_visits').select('id', { count:'exact', head:true }).eq('page', marker);
      if (data && typeof data.count === 'number') return data.count;
    } catch(e) {}
    return null;
  }

  async function writeReplayCompletionOnce(){
    if (sessionStorage.getItem(viewMarkerKey) === '1') return true;
    var inserted = false;
    var visitor = null;
    try { visitor = localStorage.getItem('alexia_browser_id') || null; } catch(e) {}
    var payload = { page: 'replay::' + PAGE_HTML };
    if (visitor) payload.visitor_id = visitor;
    try {
      if (window.supabaseClient) {
        var res = await window.supabaseClient.from('page_visits').insert(payload);
        inserted = !res.error;
      }
    } catch(e) {}
    if (!inserted) {
      try {
        var rest = await fetch(COMMENT_URL + '/rest/v1/page_visits', {
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':COMMENT_ANON_JWT,'Authorization':'Bearer '+COMMENT_ANON_JWT,'Prefer':'return=minimal'},
          body: JSON.stringify(payload)
        });
        inserted = rest.ok;
      } catch(e) {}
    }
    if (inserted) {
      sessionStorage.setItem(viewMarkerKey, '1');
      var local = parseIntSafe(sessionStorage.getItem(localReplayBoostKey) || '0') + 1;
      sessionStorage.setItem(localReplayBoostKey, String(local));
      try { sessionStorage.removeItem(replayProgressKey); } catch(e) {}
      document.dispatchEvent(new CustomEvent('alexia-discussion-refresh'));
    }
    return inserted;
  }

  // ─── Replay tracking — wall-clock, zero postMessages ─────────────────────
  // Instead of polling getCurrentTime()/getDuration() we track wall-clock elapsed time.
  // When the player fires state 1 (playing), we start a wall clock.
  // When it fires state 2/3/0, we stop and accumulate elapsed seconds.
  // When accumulated >= 30, the user has watched enough for a "qualified replay".
  function bindReplayTracking(){
    if (window.__alexiaReplayCompletionBound) return;
    window.__alexiaReplayCompletionBound = true;

    var accumulated = parseFloat(sessionStorage.getItem(replayProgressKey) || '0') || 0;
    var wallStart   = 0;  // Date.now() when playing started
    var isTracking  = false;

    function startWallClock(){
      if (sessionStorage.getItem(viewMarkerKey) === '1') return;
      if (!isTracking) {
        isTracking = true;
        wallStart  = Date.now();
      }
    }

    function stopWallClock(){
      if (!isTracking) return;
      isTracking = false;
      var elapsed = (Date.now() - wallStart) / 1000;
      accumulated += elapsed;
      sessionStorage.setItem(replayProgressKey, String(accumulated));
      if (accumulated >= 30) writeReplayCompletionOnce();
    }

    function attachToPlayer(player){
      if (!player || player.__alexiaReplayWallClockAttached) return;
      player.__alexiaReplayWallClockAttached = true;
      try {
        player.addEventListener('onStateChange', function(ev){
          var state = Number(ev && ev.data);
          if (state === 1) { markPlaying(); startWallClock(); }      // playing
          else if (state === 3) { markNotPlaying(); stopWallClock(); } // buffering
          else if (state === 2) { markNotPlaying(); stopWallClock(); } // paused
          else if (state === 5) { markNotPlaying(); stopWallClock(); } // cued
          else if (state === 0) { markNotPlaying(); stopWallClock(); } // ended
        });
      } catch(e) {}
    }

    // Attach once when player is ready — no polling loop
    function tryAttach(){
      if (window.__alexiaMainPlayer) {
        attachToPlayer(window.__alexiaMainPlayer);
        return;
      }
      // Player not ready yet — listen for it via the shared callback list
      window.__alexiaMainPlayerCallbacks = window.__alexiaMainPlayerCallbacks || [];
      window.__alexiaMainPlayerCallbacks.push(function(p){ attachToPlayer(p); });
    }

    // Also handle native video (rare)
    var nativeVideo = document.querySelector('.embed video, .player video, video');
    if (nativeVideo) {
      nativeVideo.addEventListener('play',  function(){ startWallClock(); });
      nativeVideo.addEventListener('pause', function(){ stopWallClock();  });
      nativeVideo.addEventListener('ended', function(){ stopWallClock();  });
    } else {
      // Try to attach now; if player isn't ready yet, the callback will fire when it is
      if (window.__alexiaMainPlayer) attachToPlayer(window.__alexiaMainPlayer);
      else tryAttach();
    }

    // Visibility: stop accumulation if tab is hidden
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') stopWallClock();
      else if (ytIsPlaying) startWallClock(); // resume when tab regains focus
    });

    window.addEventListener('beforeunload', function(){ stopWallClock(); });
  }

  // ─── Bars update (Supabase queries — only when not playing) ───────────────
  async function updateBars(){
    if (!canRunRemoteRefresh()) return; // no queries during playback
    var bars = ensureBars(); if (!bars) return;
    loadCommentsImmediately();
    bindReplayTracking();

    var dom          = getDomCounts();
    var commentStats = await queryCommentStats();
    var historicalViews  = await queryHistoricalViews();
    var completionCount  = await fetchReplayCompletionCount();

    if (!canRunRemoteRefresh()) return; // re-check after async gap

    if (commentStats) {
      dom.comments = Math.max(dom.comments, parseIntSafe(commentStats.comments));
    }

    var localReplay  = parseIntSafe(sessionStorage.getItem(localReplayBoostKey) || '0');
    var newReplays   = Math.max(parseIntSafe(completionCount), localReplay);
    var replaySignals = Math.max(0, parseIntSafe(historicalViews)) + Math.max(0, newReplays);

    var replayPct     = replayPercent(replaySignals);
    var discussionPct = discussionPercent(dom.comments, dom.likes);

    var replayFill     = bars.querySelector('[data-bars-replays-fill]');
    var discussionFill = bars.querySelector('[data-bars-discussion-fill]');
    var replayPctEl    = bars.querySelector('[data-bars-replays-pct]');
    var discussionPctEl= bars.querySelector('[data-bars-discussion-pct]');
    var replayMeta     = bars.querySelector('[data-bars-replays-meta]');
    var discussionMeta = bars.querySelector('[data-bars-discussion-meta]');

    if (replayFill)      replayFill.style.transform      = 'scaleX(' + (replayPct / 100) + ')';
    if (discussionFill)  discussionFill.style.transform   = 'scaleX(' + (discussionPct / 100) + ')';
    if (replayPctEl)     replayPctEl.textContent          = replayPct + '%';
    if (discussionPctEl) discussionPctEl.textContent       = discussionPct + '%';
    if (replayMeta)      replayMeta.innerHTML             = '<strong>' + replaySignals + '</strong> replay signals · <strong>' + parseIntSafe(historicalViews) + '</strong> historical views + <strong>' + newReplays + '</strong> new qualified replays.';
    if (discussionMeta)  discussionMeta.innerHTML          = '<strong>' + dom.comments + '</strong> comments · <strong>' + dom.likes + '</strong> Vote Hot activity.';
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  function armCommentsObserver(root){
    if (!root || root.__alexiaBarsObserver) return;
    var mutTimer = null;
    root.__alexiaBarsObserver = new MutationObserver(function(){
      clearTimeout(mutTimer);
      mutTimer = setTimeout(function(){ if (canRunRemoteRefresh()) updateBars(); }, 800);
    });
    root.__alexiaBarsObserver.observe(root, { childList:true, subtree:true, characterData:true });
  }

  function watchLateMount(){
    var body = document.body;
    if (!body || body.__alexiaLateBarsObserver) return;
    body.__alexiaLateBarsObserver = new MutationObserver(function(){
      var commentsRoot = document.querySelector('[data-comments-root]');
      var heatmapBox = document.getElementById('alexia-hm-box');
      if (!commentsRoot || !heatmapBox) return;
      armCommentsObserver(commentsRoot);
      ensureBars();
      if (canRunRemoteRefresh()) updateBars();
    });
    body.__alexiaLateBarsObserver.observe(body, { childList:true, subtree:true });
  }

  function boot(){
    injectStyle();
    loadCommentsImmediately();
    bindReplayTracking();
    ensureBars();
    updateBars(); // initial load (not playing yet)

    // MutationObserver on comments: debounced, only fires when not playing
    var commentsRoot = document.querySelector('[data-comments-root]');
    armCommentsObserver(commentsRoot);
    watchLateMount();

    // Discussion refresh event (fires after replay completion) — only when not playing
    document.addEventListener('alexia-comments-rendered',  function(){ setTimeout(function(){ if (canRunRemoteRefresh()) updateBars(); }, 100); });
    document.addEventListener('alexia-discussion-refresh', function(){ setTimeout(function(){ if (canRunRemoteRefresh()) updateBars(); }, 300); });

    // Vote click: optimistic instant update + deferred full refresh
    document.addEventListener('click', function(e){
      var voteBtn = e.target && e.target.closest ? e.target.closest('.vote-btn,[data-inline-votes],[class*="vote"]') : null;
      if (!voteBtn) return;
      // 1. Instant visual update (no Supabase, no postMessages)
      applyOptimisticVote();
      // 2. Full refresh after vote registers in DB (only if not playing)
      setTimeout(function(){ if (canRunRemoteRefresh()) updateBars(); }, 1500);
    }, true);

    // On window focus: refresh if not playing
    window.addEventListener('focus', function(){
      setTimeout(function(){ if (canRunRemoteRefresh()) updateBars(); }, 300);
    }, { passive:true });

    // Periodic refresh — only fires when not playing (canRunRemoteRefresh guards it)
    setInterval(function(){
      if (document.visibilityState === 'visible' && canRunRemoteRefresh()) updateBars();
    }, BARS_REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
