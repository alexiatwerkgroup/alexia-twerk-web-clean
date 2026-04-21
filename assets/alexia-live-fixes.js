
(function(){
  'use strict';
  if (window.__alexiaLiveFixesV3) return;
  window.__alexiaLiveFixesV3 = true;

  var activated = false;
  var activationQueue = [];

  function canonicalSlug(){
    try {
      return decodeURIComponent((location.pathname.split('/').pop() || '').replace(/\.html$/i,''));
    } catch(e) {
      return (location.pathname.split('/').pop() || '').replace(/\.html$/i,'');
    }
  }
  function canonicalPageId(){
    return (location.pathname || '').replace(/^\//,'');
  }
  function isPlaylistDetail(){
    return /\/playlist\/.+\.html$/i.test(location.pathname || '') && !/\/playlist\/index\.html$/i.test(location.pathname || '');
  }
  function runQueue(){
    var list = activationQueue.slice();
    activationQueue = [];
    list.forEach(function(fn){ try{ fn(); }catch(e){} });
  }
  window.__alexiaOnActivate = function(fn){
    if (activated) { try{ fn(); }catch(e){} return; }
    activationQueue.push(fn);
  };
  window.__alexiaHasUserActivated = function(){ return activated; };
  function activate(){
    if (activated) return;
    activated = true;
    document.documentElement.classList.add('alexia-user-activated');
    document.dispatchEvent(new CustomEvent('alexia-user-activated'));
    runQueue();
  }

  ['pointerdown','keydown','touchstart','scroll','mousemove'].forEach(function(evt){
    window.addEventListener(evt, activate, { once:true, passive:true });
  });

  function normalizeVoteAttrs(){
    if (!isPlaylistDetail()) return;
    var slug = canonicalSlug();
    document.querySelectorAll('[data-video-id]').forEach(function(el){ el.setAttribute('data-video-id', slug); });
    document.querySelectorAll('[data-inline-votes]').forEach(function(el){ el.setAttribute('data-inline-votes', slug); });
    document.querySelectorAll('[data-vote-score]').forEach(function(el){ el.setAttribute('data-vote-score', slug); });
  }

  function parseCount(text){
    var m = String(text || '').match(/(\d[\d,]*)/);
    if (!m) return 0;
    return parseInt(m[1].replace(/,/g,''), 10) || 0;
  }

  function syncVoteMeta(root, count){
    document.querySelectorAll('[data-inline-votes]').forEach(function(el){ el.textContent = String(count); });
    document.querySelectorAll('[data-vote-score]').forEach(function(el){
      el.textContent = count + ' total vote' + (count === 1 ? '' : 's');
      el.style.display = '';
    });
  }

  function optimisticVoteUI(btn){
    if (!btn || btn.dataset.alexiaOptimisticLock === '1') return;
    btn.dataset.alexiaOptimisticLock = '1';
    var slug = btn.getAttribute('data-video-id') || canonicalSlug();
    if (!slug) return;

    var currentActive = btn.classList.contains('active') || localStorage.getItem('voted_' + slug) === '1' || /voted/i.test(btn.textContent || '');
    var count = parseCount(btn.textContent);
    var nextActive = !currentActive;
    var nextCount = Math.max(0, count + (nextActive ? 1 : -1));

    try { localStorage.setItem('voted_' + slug, nextActive ? '1' : '0'); } catch(e) {}
    try { localStorage.setItem('vote_count_' + slug, String(nextCount)); } catch(e) {}

    btn.classList.toggle('active', nextActive);
    btn.textContent = nextActive ? ('🔥 Voted (' + nextCount + ')') : ('🔥 Vote Hot (' + nextCount + ')');
    syncVoteMeta(document, nextCount);

    setTimeout(function(){ btn.dataset.alexiaOptimisticLock = '0'; }, 1200);

    window.__alexiaOnActivate(function(){
      setTimeout(function(){
        try {
          if (typeof window.refreshVoteUI === 'function') window.refreshVoteUI(document);
        } catch(e){}
        try {
          if (typeof window.refreshMetaLine === 'function') window.refreshMetaLine(canonicalPageId(), document);
        } catch(e){}
      }, 1200);
    });
  }

  function bindOptimisticVote(){
    if (!isPlaylistDetail()) return;
    document.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('.vote-btn') : null;
      if (!btn) return;
      activate();
      optimisticVoteUI(btn);
    }, true);
  }

  function bindActivationRefresh(){
    if (!isPlaylistDetail()) return;
    window.__alexiaOnActivate(function(){
      normalizeVoteAttrs();
      try { if (typeof window.refreshMetaLine === 'function') window.refreshMetaLine(canonicalPageId(), document); } catch(e){}
      try { if (typeof window.refreshVoteUI === 'function') window.refreshVoteUI(document); } catch(e){}
      try { if (typeof window.renderAdminPanel === 'function') window.renderAdminPanel(canonicalPageId()); } catch(e){}
    });
  }

  function prepHeatmapUI(){
    if (!isPlaylistDetail()) return;
    var status = document.getElementById('alexia-hm-status');
    var jump = document.getElementById('alexia-jump-most');
    var canvas = document.getElementById('alexia-heatmap-canvas');
    if (jump) jump.style.display = 'none';
    if (status && !activated) status.textContent = 'Tap, scroll or play to load replay map';
    if (canvas && !activated) {
      try {
        var ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
      } catch(e){}
    }
  }

  function injectPlaylistBadgeFix(){
    if (!/\/playlist\/index\.html$/i.test(location.pathname || '')) return;
    if (document.getElementById('alexia-pill-row-fix-v1')) return;
    var style = document.createElement('style');
    style.id = 'alexia-pill-row-fix-v1';
    style.textContent =
      '#playlist-hero-badges{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:8px!important;overflow-x:auto!important;overflow-y:hidden!important;padding-bottom:4px!important;scrollbar-width:none!important;-ms-overflow-style:none!important;}' +
      '#playlist-hero-badges::-webkit-scrollbar{display:none!important;}' +
      '#playlist-hero-badges > *{flex:0 0 auto!important;white-space:nowrap!important;margin:0!important;}' +
      '#playlist-hero-badges .badge,#playlist-hero-badges .badge-btn{max-width:none!important;}';
    document.head.appendChild(style);
  }

  function init(){
    normalizeVoteAttrs();
    bindOptimisticVote();
    bindActivationRefresh();
    prepHeatmapUI();
    injectPlaylistBadgeFix();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
