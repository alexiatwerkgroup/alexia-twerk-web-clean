(function(){
  'use strict';
  var STORAGE_PROFILE = 'alexia_forum_profile_v1';
  var STORAGE_STATE = 'alexia_profile_state_v2';
  var modalTimer = null;

  function readProfile(){
    try { return JSON.parse(localStorage.getItem(STORAGE_PROFILE) || '{}') || {}; }
    catch(e){ return {}; }
  }

  function readState(){
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}') || {};
      raw.stats = raw.stats || {};
      return {
        total_time_seconds: Number(raw.stats.total_time_seconds || 0) || 0,
        total_videos_watched: Number(raw.stats.total_videos_watched || raw.stats.videos_viewed_count || 0) || 0,
        videos_viewed_count: Number(raw.stats.videos_viewed_count || raw.stats.total_videos_watched || 0) || 0,
        score: Number(raw.stats.score || 0) || 0
      };
    } catch(e) {
      return { total_time_seconds: 0, total_videos_watched: 0, videos_viewed_count: 0, score: 0 };
    }
  }

  function formatDuration(totalSeconds){
    var s = Math.max(0, Number(totalSeconds || 0) || 0);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return Math.floor(s / 60) + 'm';
  }

  function getOpenModalBody(){
    return document.querySelector('#community-profile-modal.open .modal-body');
  }

  function getModalUsername(modal){
    if (!modal) return '';
    var h = modal.querySelector('h3');
    return ((h && h.textContent) || '').trim().toLowerCase();
  }

  function getLocalUsername(){
    var p = readProfile();
    return String(p.nickname || '').trim().toLowerCase();
  }

  function updateStatByLabel(modal, labelRegex, value){
    if (!modal) return false;
    var spans = modal.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      var label = (spans[i].textContent || '').trim();
      if (!labelRegex.test(label)) continue;
      var stat = spans[i].closest('.stat');
      if (!stat) stat = spans[i].parentElement;
      if (!stat) continue;
      var strong = stat.querySelector('strong');
      if (strong) {
        strong.textContent = value;
        return true;
      }
    }
    return false;
  }

  function applyLiveStats(){
    var modal = getOpenModalBody();
    if (!modal) return;
    var modalUser = getModalUsername(modal);
    var localUser = getLocalUsername();
    if (!modalUser || !localUser || modalUser !== localUser) return;
    var stats = readState();
    updateStatByLabel(modal, /activity score/i, String(stats.score || 0));
    updateStatByLabel(modal, /total time|time on site|time in the house/i, formatDuration(stats.total_time_seconds));
    updateStatByLabel(modal, /videos watched|watched videos|videos/i, String(stats.total_videos_watched || stats.videos_viewed_count || 0));
  }

  function bumpLocalCommentCount(){
    var modal = getOpenModalBody();
    if (!modal) return;
    var modalUser = getModalUsername(modal);
    var localUser = getLocalUsername();
    if (!modalUser || !localUser || modalUser !== localUser) return;
    var spans = modal.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      var label = (spans[i].textContent || '').trim();
      if (!/comments/i.test(label)) continue;
      var stat = spans[i].closest('.stat') || spans[i].parentElement;
      if (!stat) continue;
      var strong = stat.querySelector('strong');
      if (!strong) continue;
      var current = parseInt(String(strong.textContent || '0').replace(/[^\d]/g, ''), 10);
      strong.textContent = String((isFinite(current) ? current : 0) + 1);
      return;
    }
  }

  function startModalSync(){
    if (modalTimer) return;
    modalTimer = setInterval(function(){
      if (!getOpenModalBody()) {
        clearInterval(modalTimer);
        modalTimer = null;
        return;
      }
      applyLiveStats();
    }, 5000);
  }

  function onPotentialOpen(){
    setTimeout(function(){
      applyLiveStats();
      if (getOpenModalBody()) startModalSync();
    }, 80);
    setTimeout(function(){
      applyLiveStats();
      if (getOpenModalBody()) startModalSync();
    }, 300);
  }

  document.addEventListener('click', onPotentialOpen, true);
  window.addEventListener('alexia-profile-cache-updated', applyLiveStats);
  window.addEventListener('storage', function(ev){
    if (ev.key === STORAGE_STATE || ev.key === STORAGE_PROFILE) applyLiveStats();
  });
  document.addEventListener('DOMContentLoaded', function(){ applyLiveStats(); });
})();