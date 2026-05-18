(function(){
  'use strict';

  var SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';

  var STORAGE_USER_ID = 'alexia_profile_user_id_v1';
  var STORAGE_STATE = 'alexia_profile_state_v2';
  var ACTIVE_TICK_MS = 15000;
  var WATCH_THRESHOLD_SECONDS = 12;
  var SCORE_PER_ACTIVE_TICK = 1;
  var SCORE_PER_VIDEO = 5;

  function ensureUserId(){
    try {
      var id = localStorage.getItem(STORAGE_USER_ID);
      if (!id) {
        if (window.crypto && window.crypto.randomUUID) id = window.crypto.randomUUID();
        else id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(STORAGE_USER_ID, id);
      }
      return id;
    } catch(e) {
      return 'u_fallback_' + Date.now();
    }
  }

  function loadState(){
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}') || {};
      if (!raw.viewedVideos || typeof raw.viewedVideos !== 'object') raw.viewedVideos = {};
      if (!raw.stats || typeof raw.stats !== 'object') raw.stats = {};
      raw.stats.total_time_seconds = Number(raw.stats.total_time_seconds || 0) || 0;
      raw.stats.total_videos_watched = Number(raw.stats.total_videos_watched || raw.stats.videos_viewed_count || 0) || 0;
      raw.stats.videos_viewed_count = Number(raw.stats.videos_viewed_count || raw.stats.total_videos_watched || 0) || 0;
      raw.stats.score = Number(raw.stats.score || 0) || 0;
      return raw;
    } catch(e) {
      return {
        viewedVideos: {},
        stats: { total_time_seconds: 0, total_videos_watched: 0, videos_viewed_count: 0, score: 0 }
      };
    }
  }

  function saveState(state){
    try { localStorage.setItem(STORAGE_STATE, JSON.stringify(state || {})); } catch(e) {}
  }


  function emitProfileCacheUpdate(){
    try {
      window.dispatchEvent(new CustomEvent('alexia-profile-cache-updated', {
        detail: {
          userId: userId,
          stats: {
            total_time_seconds: Number(state.stats.total_time_seconds || 0) || 0,
            total_videos_watched: Number(state.stats.total_videos_watched || 0) || 0,
            videos_viewed_count: Number(state.stats.videos_viewed_count || 0) || 0,
            score: Number(state.stats.score || 0) || 0
          }
        }
      }));
    } catch(e) {}
  }

  function getBadgeLabel(videoCount){
    var count = Number(videoCount || 0) || 0;
    if (count >= 50) return 'ADDICTED';
    if (count >= 10) return 'EXPLORER';
    return 'VISITOR';
  }


  function isPageActive(){
    return !document.hidden;
  }

  function findVideoSlug(){
    var path = (location.pathname || '').replace(/\/$/, '');
    var slug = path.split('/').pop() || 'home';
    slug = slug.replace(/\.html?$/i, '');
    return slug || 'home';
  }

  function findVideoId(){
    var iframe = document.querySelector('iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"], iframe[src*="player.vimeo.com/video/"]');
    var video = document.querySelector('video');
    if (iframe) {
      var src = iframe.getAttribute('src') || '';
      var yt = src.match(/embed\/([^?&#"']+)/i);
      var vi = src.match(/video\/([^?&#"']+)/i);
      if (yt && yt[1]) return yt[1];
      if (vi && vi[1]) return vi[1];
    }
    if (video) {
      var vsrc = video.currentSrc || video.getAttribute('src') || '';
      if (vsrc) return vsrc.split('/').pop().split('?')[0];
    }
    return findVideoSlug();
  }

  function isVideoLikePage(){
    var path = location.pathname || '';
    if (/\/playlist\//i.test(path)) return true;
    return !!document.querySelector('iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"], iframe[src*="player.vimeo.com/video/"], video');
  }

  function loadSupabase(cb){
    if (window.supabase && window.supabase.createClient) return cb();
    var existing = document.querySelector('script[data-alexia-supabase-loader="1"]');
    if (existing) {
      existing.addEventListener('load', cb, { once:true });
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.defer = true;
    s.setAttribute('data-alexia-supabase-loader', '1');
    s.onload = cb;
    document.head.appendChild(s);
  }

  var userId = ensureUserId();
  var localAnonUserId = userId;
  var state = loadState();
  var pageUrl = location.pathname || '/';
  var videoSlug = findVideoSlug();
  var videoId = findVideoId();
  var videoLikePage = isVideoLikePage();
  var client = null;
  var pendingTime = 0;
  var pendingScore = 0;
  var watchSeconds = 0;
  var markedViewed = !!state.viewedVideos[videoSlug];
  var flushBusy = false;

  function syncLocalVideoCount(){
    var count = Object.keys(state.viewedVideos || {}).length;
    state.stats.total_videos_watched = count;
    state.stats.videos_viewed_count = count;
  }

  syncLocalVideoCount();
  saveState(state);

  async function resolveTrackedUserId(){
    if (!client || !client.auth || !client.auth.getSession) return userId;
    try {
      var sess = await client.auth.getSession();
      var authUser = sess && sess.data && sess.data.session && sess.data.session.user;
      if (authUser && authUser.id) {
        var authId = String(authUser.id);
        if (authId !== userId) {
          userId = authId;
          await migrateAnonStatsToAuth(authId);
        }
      }
    } catch(e) {}
    return userId;
  }

  async function migrateAnonStatsToAuth(authId){
    if (!client || !authId || !localAnonUserId || localAnonUserId === authId) return;
    try {
      var anonStatsRes = await client.from('user_stats').select('*').eq('user_id', localAnonUserId).maybeSingle();
      var authStatsRes = await client.from('user_stats').select('*').eq('user_id', authId).maybeSingle();
      var anonStats = anonStatsRes && anonStatsRes.data ? anonStatsRes.data : null;
      var authStats = authStatsRes && authStatsRes.data ? authStatsRes.data : null;

      await client.from('user_stats').upsert({
        user_id: authId,
        total_time_seconds: Math.max(Number(authStats && authStats.total_time_seconds || 0), Number(anonStats && anonStats.total_time_seconds || 0), Number(state.stats.total_time_seconds || 0)),
        total_videos_watched: Math.max(Number(authStats && (authStats.total_videos_watched || authStats.videos_viewed_count) || 0), Number(anonStats && (anonStats.total_videos_watched || anonStats.videos_viewed_count) || 0), Number(state.stats.total_videos_watched || 0)),
        videos_viewed_count: Math.max(Number(authStats && (authStats.videos_viewed_count || authStats.total_videos_watched) || 0), Number(anonStats && (anonStats.videos_viewed_count || anonStats.total_videos_watched) || 0), Number(state.stats.videos_viewed_count || 0)),
        score: Math.max(Number(authStats && authStats.score || 0), Number(anonStats && anonStats.score || 0), Number(state.stats.score || 0)),
        last_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict:'user_id' });

      try {
        await client.from('user_video_views').update({ user_id: authId }).eq('user_id', localAnonUserId);
      } catch(_e) {}
    } catch(e) {}
  }

  async function ensureRemoteStatsRow(){
    if (!client) return;
    try {
      await resolveTrackedUserId();
      syncLocalVideoCount();
      await client.from('user_stats').upsert({
        user_id: userId,
        total_time_seconds: Number(state.stats.total_time_seconds || 0),
        total_videos_watched: Number(state.stats.total_videos_watched || 0),
        videos_viewed_count: Number(state.stats.videos_viewed_count || 0),
        score: Number(state.stats.score || 0),
        last_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict:'user_id' });
    } catch(e) {}
  }

  async function getRemoteViewedCount(){
    if (!client) return Number(state.stats.videos_viewed_count || state.stats.total_videos_watched || 0) || 0;
    try {
      var res = await client
        .from('user_video_views')
        .select('video_slug', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('viewed', true);
      return Number(res && res.count || 0) || 0;
    } catch(e) {
      return Number(state.stats.videos_viewed_count || state.stats.total_videos_watched || 0) || 0;
    }
  }

  async function upsertVideoViewRow(secondsValue){
    if (!client || !videoLikePage) return;
    var nowIso = new Date().toISOString();
    var seconds = Number(secondsValue || 0) || 0;

    try {
      var found = await client
        .from('user_video_views')
        .select('id, watched_seconds, viewed')
        .eq('user_id', userId)
        .eq('video_slug', videoSlug)
        .limit(1)
        .maybeSingle();

      if (found && found.data && found.data.id) {
        await client
          .from('user_video_views')
          .update({
            video_id: videoId,
            watched_seconds: Math.max(Number(found.data.watched_seconds || 0), seconds),
            viewed: true,
            last_seen_at: nowIso,
            watched_at: nowIso
          })
          .eq('id', found.data.id);
      } else {
        await client
          .from('user_video_views')
          .insert({
            user_id: userId,
            video_slug: videoSlug,
            video_id: videoId,
            watched_seconds: seconds,
            viewed: true,
            last_seen_at: nowIso,
            watched_at: nowIso
          });
      }
    } catch(e) {}
  }

  async function markVideoViewed(){
    if (!videoLikePage || markedViewed) return;
    markedViewed = true;
    state.viewedVideos[videoSlug] = Date.now();
    syncLocalVideoCount();
    state.stats.score = Number(state.stats.score || 0) + SCORE_PER_VIDEO;
    pendingScore += SCORE_PER_VIDEO;
    saveState(state);
    if (client) {
      try {
        await resolveTrackedUserId();
        await upsertVideoViewRow(watchSeconds);
        var viewedCount = await getRemoteViewedCount();
        state.stats.total_videos_watched = viewedCount;
        state.stats.videos_viewed_count = viewedCount;
        saveState(state);
      emitProfileCacheUpdate();
        await client.from('user_stats').upsert({
          user_id: userId,
          total_time_seconds: Number(state.stats.total_time_seconds || 0),
          total_videos_watched: viewedCount,
          videos_viewed_count: viewedCount,
          score: Number(state.stats.score || 0),
          last_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict:'user_id' });
      } catch(e) {}
    }
  }

  async function flushStats(force){
    if (!client || flushBusy) return;
    if (!force && pendingTime <= 0 && pendingScore <= 0) return;
    flushBusy = true;
    try {
      await resolveTrackedUserId();
      state.stats.total_time_seconds = Number(state.stats.total_time_seconds || 0) + pendingTime;
      state.stats.score = Number(state.stats.score || 0) + pendingScore;
      syncLocalVideoCount();
      pendingTime = 0;
      pendingScore = 0;
      saveState(state);
      emitProfileCacheUpdate();

      if (videoLikePage) {
        await upsertVideoViewRow(watchSeconds);
      }

      var viewedCount = await getRemoteViewedCount();
      state.stats.total_videos_watched = Math.max(Number(state.stats.total_videos_watched || 0), viewedCount);
      state.stats.videos_viewed_count = Math.max(Number(state.stats.videos_viewed_count || 0), viewedCount);
      saveState(state);
      emitProfileCacheUpdate();

      await client.from('user_stats').upsert({
        user_id: userId,
        total_time_seconds: Number(state.stats.total_time_seconds || 0),
        total_videos_watched: Number(state.stats.total_videos_watched || 0),
        videos_viewed_count: Number(state.stats.videos_viewed_count || 0),
        score: Number(state.stats.score || 0),
        last_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict:'user_id' });
    } catch(e) {
    } finally {
      flushBusy = false;
    }
  }

  function activeTick(){
    if (!isPageActive()) return;
    pendingTime += Math.round(ACTIVE_TICK_MS / 1000);
    pendingScore += SCORE_PER_ACTIVE_TICK;
    if (videoLikePage) watchSeconds += Math.round(ACTIVE_TICK_MS / 1000);
    if (videoLikePage && !markedViewed && watchSeconds >= WATCH_THRESHOLD_SECONDS) {
      markVideoViewed();
    }
    if (pendingTime >= 15 || pendingScore >= 5) {
      flushStats(false);
    }
  }

  function attachDirectVideoTracking(){
    var video = document.querySelector('video');
    if (!video) return;
    var playedEnough = false;

    function maybeMark(){
      watchSeconds = Math.max(watchSeconds, Math.floor(Number(video.currentTime || 0) || 0));
      if (!playedEnough && watchSeconds >= 8) {
        playedEnough = true;
        markVideoViewed();
      }
    }

    video.addEventListener('timeupdate', maybeMark);
    video.addEventListener('ended', function(){
      watchSeconds = Math.max(watchSeconds, Math.floor(Number(video.duration || video.currentTime || 0) || 0));
      playedEnough = true;
      markVideoViewed();
      flushStats(true);
    });
  }

  function start(){
    attachDirectVideoTracking();
    setInterval(activeTick, ACTIVE_TICK_MS);
    setInterval(function(){ flushStats(false); }, 20000);
    document.addEventListener('visibilitychange', function(){ if (document.hidden) flushStats(true); });
    window.addEventListener('pagehide', function(){ flushStats(true); });
    window.addEventListener('beforeunload', function(){ flushStats(true); });

    setTimeout(function(){
      if (videoLikePage && !markedViewed && watchSeconds >= WATCH_THRESHOLD_SECONDS) {
        markVideoViewed();
      }
    }, WATCH_THRESHOLD_SECONDS * 1000 + 600);
  }

  loadSupabase(function(){
    try {
      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:'alexia-comments-auth-v2' } }
      );
    } catch(e) {
      client = null;
    }

    emitProfileCacheUpdate();
    if (client) {
      resolveTrackedUserId()
        .then(function(){ ensureRemoteStatsRow(); })
        .catch(function(){ ensureRemoteStatsRow(); });
    }

    emitProfileCacheUpdate();
    start();
  });
})();
