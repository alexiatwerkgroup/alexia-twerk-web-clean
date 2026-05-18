(function(){
  'use strict';
  if (window.__alexiaPagePerformanceGuard) return;
  window.__alexiaPagePerformanceGuard = true;

  function applyContainment(){
    var selectors = ['.yt-comments','.recommend-cta','.comment-invite-cta','.related','.footer','.side','.clip-finder','#alexia-hm-box','.community-shell','.sidecard'];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if (!el || el.dataset.alexiaPerfApplied === '1') return;
        el.dataset.alexiaPerfApplied = '1';
        el.style.contentVisibility = 'auto';
        el.style.containIntrinsicSize = el.style.containIntrinsicSize || '1px 900px';
      });
    });
    // ── Anti 2026-04-24 fix: stop clobbering playlist grid thumbs with
    //    auto lazy-loading. Playlists have ≤ 60 visible thumbs and the
    //    user expects them all visible without scrolling to trigger
    //    loading. Only apply lazy to genuinely below-the-fold content
    //    (community/footer/comments) and explicitly skip playlist grid,
    //    hot-rank sidebar, home 6-playlist cards, and hero poster.
    var LAZY_SKIP_SEL = '.vthumb img, .rk-thumb img, .twerkhub-fp-thumb img, .twerkhub-hh-iframe, .twerkhub-home-hero-media img, .twerkhub-club-card img, .twerkhub-coming-card img, [data-no-lazy], [fetchpriority="high"]';
    document.querySelectorAll('img').forEach(function(img){
      if (img.matches && img.matches(LAZY_SKIP_SEL)) { img.loading = 'eager'; return; }
      if (!img.loading) img.loading = 'lazy';
    });
    document.querySelectorAll('iframe').forEach(function(frame){
      if (frame.matches && frame.matches(LAZY_SKIP_SEL)) { frame.loading = 'eager'; return; }
      if (!frame.loading) frame.loading = 'lazy';
      frame.referrerPolicy = frame.referrerPolicy || 'strict-origin-when-cross-origin';
    });
  }


  function ensureLiveFixes(){
    if (document.querySelector('script[src="/assets/alexia-live-fixes.js?v=1"]')) return;
    var s = document.createElement('script');
    s.src = '/assets/alexia-live-fixes.js?v=1';
    s.defer = true;
    document.head.appendChild(s);
  }

  function cleanDuplicateHeaderStyles(){
    var ids = ['alexia-comments-tight-header-v17','alexia-comments-compact-v8'];
    ids.forEach(function(id){
      var styles = document.querySelectorAll('style#' + id);
      styles.forEach(function(node, idx){ if (idx === 0) node.remove(); });
    });
  }

  function run(){
    cleanDuplicateHeaderStyles();
    applyContainment();
    ensureLiveFixes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true });
  else run();
})();