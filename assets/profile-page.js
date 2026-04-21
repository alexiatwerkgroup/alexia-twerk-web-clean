(function(){
  var STORAGE_KEY = 'alexia_forum_profile_v1';
  var SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  var nicknameEl=document.getElementById('nickname'), bioEl=document.getElementById('bio'), fileEl=document.getElementById('avatar-file'), saveBtn=document.getElementById('save-profile'), removeBtn=document.getElementById('remove-avatar'), preview=document.getElementById('avatar-preview'), statusEl=document.getElementById('status');
  var avatarData='';
  function esc(str){ return String(str||'').replace(/[&<>"']/g, function(s){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);});}
  function initials(name){ var text=String(name||'').trim(); if(!text) return 'P'; var parts=text.split(/\s+/).filter(Boolean).slice(0,2); return parts.length?parts.map(function(p){return p.slice(0,1).toUpperCase();}).join('').slice(0,2):text.slice(0,1).toUpperCase(); }
  function loadProfile(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}}
  function saveProfile(data){ var merged=Object.assign({}, loadProfile(), data||{}, {updated_at:new Date().toISOString()}); try{localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));}catch(e){} return merged; }
  function setStatus(msg){ if(statusEl) statusEl.textContent=msg||''; }
  function render(){ var p=loadProfile(); if(nicknameEl) nicknameEl.value=p.nickname||''; if(bioEl) bioEl.value=p.bio||''; avatarData=p.avatar_url||''; if(preview) preview.innerHTML = avatarData?'<img src="'+esc(avatarData)+'" alt="Avatar">':initials(p.nickname||'P'); }
  function resizeImage(file){ return new Promise(function(resolve){ var reader=new FileReader(); reader.onload=function(){ var img=new Image(); img.onload=function(){ var size=240, canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size; var ctx=canvas.getContext('2d'); var sw=img.width, sh=img.height, src=Math.min(sw,sh), sx=Math.max(0,(sw-src)/2), sy=Math.max(0,(sh-src)/2); ctx.drawImage(img,sx,sy,src,src,0,0,size,size); try{resolve(canvas.toDataURL('image/jpeg',0.85));}catch(e){resolve(reader.result);} }; img.onerror=function(){resolve(reader.result)}; img.src=reader.result; }; reader.onerror=function(){resolve('')}; reader.readAsDataURL(file); }); }
  async function syncRemote(current){
    try{
      if(!window.supabase || !window.supabase.createClient) return false;
      if(!window.__alexiaProfilePageClient) window.__alexiaProfilePageClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'alexia-comments-auth-v2'}});
      var client=window.__alexiaProfilePageClient;
      var sess=await client.auth.getSession(); var user=sess&&sess.data&&sess.data.session&&sess.data.session.user; if(!user||!user.id) return false;
      await client.from('profiles').upsert({id:user.id,email:String(user.email||'').trim().toLowerCase()||null,username:String(current.nickname||'').trim()||null,bio:String(current.bio||'').trim()||null,avatar_url:String(current.avatar_url||'').trim()||null},{onConflict:'id'});
      return true;
    }catch(e){ console.error(e); return false; }
  }
  if(fileEl) fileEl.addEventListener('change', async function(e){ var file=e.target.files&&e.target.files[0]; if(!file) return; setStatus('Preparing avatar...'); avatarData=await resizeImage(file); saveProfile({avatar_url:avatarData||''}); render(); setStatus(avatarData?'Avatar ready.':'Could not read that image.'); e.target.value=''; });
  if(removeBtn) removeBtn.addEventListener('click', function(){ saveProfile({avatar_url:''}); render(); setStatus('Avatar removed.'); });
  if(saveBtn) saveBtn.addEventListener('click', async function(){ var nick=String(nicknameEl&&nicknameEl.value||'').trim(); var bio=String(bioEl&&bioEl.value||'').trim().slice(0,220); if(!nick){ setStatus('Please choose a nickname first.'); if(nicknameEl) nicknameEl.focus(); return; } setStatus('Saving...'); var current=saveProfile({nickname:nick,bio:bio,avatar_url:avatarData||''}); var ok=await syncRemote(current); setStatus(ok?'Profile saved and synced.':'Profile saved on this browser.'); });
  render();
})();

(function(){
  'use strict';

  var STORAGE_STATE = 'alexia_profile_state_v2';
  var STORAGE_USER_ID = 'alexia_profile_user_id_v1';
  var SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';

  var lastRenderedFingerprint = '';
  var remoteLoaded = false;
  var lastRenderedAtMs = 0;

  function safeNumber(value){
    return Number(value || 0) || 0;
  }

  function fmtTime(totalSeconds){
    var seconds = Math.max(0, safeNumber(totalSeconds));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    if (minutes > 0) return minutes + 'm';
    return '0m';
  }

  function getBadgeLabel(videoCount){
    var count = safeNumber(videoCount);
    if (count >= 50) return 'ADDICTED';
    if (count >= 10) return 'EXPLORER';
    return 'VISITOR';
  }

  function readCache(){
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}') || {};
      raw.stats = raw.stats || {};
      raw.meta = raw.meta || {};
      return {
        total_time_seconds: safeNumber(raw.stats.total_time_seconds),
        video_watch_seconds: safeNumber(raw.stats.video_watch_seconds),
        total_videos_watched: safeNumber(raw.stats.total_videos_watched || raw.stats.videos_viewed_count),
        videos_viewed_count: safeNumber(raw.stats.videos_viewed_count || raw.stats.total_videos_watched),
        score: safeNumber(raw.stats.score),
        updated_at: String(raw.stats.updated_at || ''),
        user_id: String(raw.meta.user_id || raw.meta.local_user_id || localStorage.getItem(STORAGE_USER_ID) || '')
      };
    } catch(e) {
      return {
        total_time_seconds: 0,
        video_watch_seconds: 0,
        total_videos_watched: 0,
        videos_viewed_count: 0,
        score: 0,
        updated_at: '',
        user_id: String(localStorage.getItem(STORAGE_USER_ID) || '')
      };
    }
  }

  function fingerprint(stats){
    return [
      safeNumber(stats.total_time_seconds),
      safeNumber(stats.video_watch_seconds),
      safeNumber(stats.total_videos_watched || stats.videos_viewed_count),
      safeNumber(stats.score),
      String(stats.updated_at || '')
    ].join('|');
  }

  function parseUpdatedAt(value){
    var time = Date.parse(String(value || ''));
    return isFinite(time) ? time : 0;
  }

  function setText(el, value){
    if (el) el.textContent = value;
  }

  function findStatValueByLabel(labelRegex){
    var labels = Array.from(document.querySelectorAll('.stat-label, .metric-label, [data-stat-label]'));
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      var text = (label.textContent || '').trim();
      if (!labelRegex.test(text)) continue;
      var parent = label.closest('.stat, .metric, .profile-stat, .stat-card, li, .item') || label.parentElement;
      if (!parent) continue;
      var value = parent.querySelector('.stat-value, .metric-value, [data-stat-value], strong, b, h3, h4, .value');
      if (value) return value;
    }
    return null;
  }

  function ensureBadgeElement(){
    var row = document.querySelector('.profile-badges, .badge-row, .profile-meta, .community-profile-badges');
    if (!row) {
      var online = Array.from(document.querySelectorAll('*')).find(function(el){
        return /online now/i.test((el.textContent || '').trim());
      });
      if (online && online.parentElement) row = online.parentElement;
    }
    if (!row) return null;
    var badge = row.querySelector('[data-auto-badge="1"]');
    if (badge) return badge;
    badge = document.createElement('div');
    badge.setAttribute('data-auto-badge', '1');
    badge.className = 'auto-user-badge';
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.06));box-shadow:0 10px 24px rgba(0,0,0,.28);font-weight:800;letter-spacing:.08em;font-size:12px;color:#fff;margin-right:10px;';
    row.insertBefore(badge, row.firstChild);
    return badge;
  }

  function updateProfileUI(stats){
    stats = stats || readCache();
    var currentFingerprint = fingerprint(stats);
    if (currentFingerprint === lastRenderedFingerprint) return;
    var incomingUpdatedAtMs = parseUpdatedAt(stats.updated_at);
    if (lastRenderedAtMs && incomingUpdatedAtMs && incomingUpdatedAtMs < lastRenderedAtMs) return;

    var videos = safeNumber(stats.total_videos_watched || stats.videos_viewed_count);
    var timeEl = findStatValueByLabel(/total time|time on site|time in the house/i);
    var videoEl = findStatValueByLabel(/videos watched|watched videos|videos/i);
    var scoreEl = findStatValueByLabel(/activity score|score/i);

    setText(timeEl, fmtTime(stats.total_time_seconds));
    setText(videoEl, String(videos));
    setText(scoreEl, String(safeNumber(stats.score)));

    var badgeEl = ensureBadgeElement();
    if (badgeEl) badgeEl.textContent = getBadgeLabel(videos);

    lastRenderedFingerprint = currentFingerprint;
    lastRenderedAtMs = incomingUpdatedAtMs || lastRenderedAtMs;
  }

  function loadSupabase(cb){
    if (window.supabase && window.supabase.createClient) return cb();
    var existing = document.querySelector('script[data-alexia-supabase-loader="1"]');
    if (existing) {
      existing.addEventListener('load', cb, { once: true });
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.defer = true;
    script.setAttribute('data-alexia-supabase-loader', '1');
    script.onload = cb;
    document.head.appendChild(script);
  }

  function fetchRemoteStats(){
    loadSupabase(async function(){
      try {
        if (!window.__alexiaProfileStatsClient) {
          window.__alexiaProfileStatsClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              storageKey: 'alexia-comments-auth-v2'
            }
          });
        }

        var client = window.__alexiaProfileStatsClient;
        var cache = readCache();
        var session = await client.auth.getSession();
        var authUser = session && session.data && session.data.session && session.data.session.user;
        var trackedUserId = authUser && authUser.id ? String(authUser.id) : cache.user_id;
        if (!trackedUserId) return;

        var statsRes = await client.from('user_stats').select('*').eq('user_id', trackedUserId).maybeSingle();
        var viewedCountRes = await client.from('user_video_views')
          .select('video_slug', { count: 'exact', head: true })
          .eq('user_id', trackedUserId)
          .eq('viewed', true);

        var row = statsRes && statsRes.data ? statsRes.data : {};
        updateProfileUI({
          total_time_seconds: safeNumber(row.total_time_seconds),
          video_watch_seconds: safeNumber(row.video_watch_seconds),
          total_videos_watched: safeNumber(viewedCountRes && viewedCountRes.count || row.videos_viewed_count || row.total_videos_watched),
          videos_viewed_count: safeNumber(viewedCountRes && viewedCountRes.count || row.videos_viewed_count || row.total_videos_watched),
          score: safeNumber(row.score),
          updated_at: String(row.updated_at || row.last_update || '')
        });

        remoteLoaded = true;
      } catch (e) {}
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateProfileUI(readCache());
    fetchRemoteStats();
  });

  window.addEventListener('alexia-profile-cache-updated', function(ev){
    var stats = ev && ev.detail && ev.detail.stats ? ev.detail.stats : readCache();
    updateProfileUI(stats);
  });

  window.addEventListener('storage', function(ev){
    if (ev.key !== STORAGE_STATE) return;
    updateProfileUI(readCache());
    if (!remoteLoaded) fetchRemoteStats();
  });
})();
