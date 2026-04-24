/* ═══ TWERKHUB · PREMIUM INTERACTIONS ═══
 * v20260424-p2 · + viewed-video tracker + paywall killswitch on /playlist
 *
 * Three responsibilities:
 *   1. Scroll-reveal: fade in `[data-twk-reveal]` + staggered grids as they
 *      enter the viewport. Uses IntersectionObserver (no scroll listener jank).
 *   2. Count-up ticker: for any `[data-twk-count="N"]` element, count from 0
 *      to N the first time it's on screen. Feels premium, draws the eye.
 *   3. Auto-tag sections: wraps major <section>s with scroll-reveal so we
 *      don't have to edit every page manually.
 *
 * Respects prefers-reduced-motion (becomes a no-op).
 */
(function(){
  'use strict';
  if (window.__twerkhubPremiumInit) return;
  window.__twerkhubPremiumInit = true;

  var reduced = false;
  try {
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch(_){}

  // ── 1 · Scroll reveal ────────────────────────────────────────────────
  function revealEl(el){ el.classList.add('is-revealed'); }
  function initReveal(){
    if (reduced) {
      // Show everything immediately.
      document.querySelectorAll('[data-twk-reveal],[data-twk-reveal-stagger]').forEach(revealEl);
      return;
    }
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-twk-reveal],[data-twk-reveal-stagger]').forEach(revealEl);
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          revealEl(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
    document.querySelectorAll('[data-twk-reveal],[data-twk-reveal-stagger]').forEach(function(el){
      io.observe(el);
    });
  }

  // ── 2 · Count-up ticker ──────────────────────────────────────────────
  function countUp(el, target){
    if (reduced) { el.textContent = formatNum(el, target); return; }
    var start = null;
    var duration = 1400;
    var from = 0;
    function step(ts){
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.floor(from + (target - from) * eased);
      el.textContent = formatNum(el, val);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = formatNum(el, target);
    }
    requestAnimationFrame(step);
  }
  function formatNum(el, val){
    var prefix = el.getAttribute('data-twk-count-prefix') || '';
    var suffix = el.getAttribute('data-twk-count-suffix') || '';
    var sep = el.getAttribute('data-twk-count-sep');
    var str = (sep === 'none') ? String(val) : Number(val).toLocaleString('en-US');
    return prefix + str + suffix;
  }
  function initCountUp(){
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = Number(el.getAttribute('data-twk-count')) || 0;
          countUp(el, target);
          io.unobserve(el);
        }
      });
    }, { threshold: .5 });
    document.querySelectorAll('[data-twk-count]').forEach(function(el){
      io.observe(el);
    });
  }

  // ── 3 · Auto-tag major sections for reveal ──────────────────────────
  function autoTagSections(){
    // Tag every direct-child <section> of <main>/<body>, plus any .twerkhub-*
    // hero/section/article. Skip elements that already have reveal attrs.
    var candidates = document.querySelectorAll(
      'main > section, body > section, .twerkhub-comm-hero, .twerkhub-home-hero, .twerkhub-stack, .twerkhub-tiers, .twerkhub-coming'
    );
    candidates.forEach(function(el){
      if (!el.hasAttribute('data-twk-reveal') && !el.hasAttribute('data-twk-reveal-stagger')) {
        el.setAttribute('data-twk-reveal','');
      }
    });
    // Grids of cards get the stagger variant.
    document.querySelectorAll('.twerkhub-coming-grid, .twerkhub-tiers-grid, .twerkhub-playlists-grid, .twerkhub-threads').forEach(function(g){
      if (!g.hasAttribute('data-twk-reveal-stagger')) g.setAttribute('data-twk-reveal-stagger','');
    });
  }

  // ── 4 · Lazy-load image "loaded" flag (kills shimmer) ───────────────
  function initImgLoadFlags(){
    document.querySelectorAll('img[loading="lazy"]').forEach(function(img){
      if (img.complete) { img.classList.add('is-loaded'); return; }
      img.addEventListener('load', function(){ img.classList.add('is-loaded'); }, { once:true });
      img.addEventListener('error', function(){ img.classList.add('is-loaded'); }, { once:true });
    });
  }

  // ── 5 · Skip-to-content link (a11y) ─────────────────────────────────
  function injectSkipLink(){
    if (document.querySelector('.twk-skip-link')) return;
    var main = document.querySelector('main, [role="main"], .twerkhub-threads, .ac, .wrap');
    if (!main) return;
    if (!main.id) main.id = 'twk-main';
    var link = document.createElement('a');
    link.className = 'twk-skip-link';
    link.href = '#' + main.id;
    link.textContent = 'Skip to content';
    document.body.insertBefore(link, document.body.firstChild);
  }

  // ── 6 · Viewed-video tracker ────────────────────────────────────────
  // Marks any `[data-vid]` link that's been clicked before with an
  // `.is-viewed` class. The CSS layer draws the desaturated thumb + the
  // big "VIEWED" stamp. Persists in localStorage so it survives reloads.
  var VIEWED_KEY = 'twerkhub_viewed_vids';
  function getViewed(){
    try { return JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]'); } catch(_){ return []; }
  }
  function saveViewed(arr){
    try { localStorage.setItem(VIEWED_KEY, JSON.stringify(arr)); } catch(_){}
  }
  function markCurrent(){
    var viewed = getViewed();
    document.querySelectorAll('[data-vid]').forEach(function(el){
      var id = el.getAttribute('data-vid');
      if (id && viewed.indexOf(id) !== -1) el.classList.add('is-viewed');
    });
  }
  function initViewedTracker(){
    markCurrent();
    // Any click on a `[data-vid]` link registers that video as viewed.
    document.addEventListener('click', function(ev){
      var hot = ev.target.closest && ev.target.closest('[data-vid]');
      if (!hot) return;
      var id = hot.getAttribute('data-vid');
      if (!id) return;
      var viewed = getViewed();
      if (viewed.indexOf(id) !== -1) return;
      viewed.push(id);
      if (viewed.length > 2000) viewed = viewed.slice(-2000);
      saveViewed(viewed);
      // Slight delay so the click handler finishes first.
      setTimeout(function(){ hot.classList.add('is-viewed'); }, 120);
    }, true);
  }

  // ── 7 · Paywall killswitch on /playlist ─────────────────────────────
  // The user explicitly wants the listing itself to be free. We remove any
  // TwerkhubPaywall.open invocation and hide the modal if it sneaks in.
  function initPaywallKillOnPlaylist(){
    if (!/^\/playlist(\/|$)/.test(location.pathname)) return;
    document.documentElement.setAttribute('data-playlist-open','1');
    // Neutralize the paywall API on this page so any "onclick TwerkhubPaywall.open(...)"
    // becomes a no-op.
    try {
      window.TwerkhubPaywall = window.TwerkhubPaywall || {};
      window.TwerkhubPaywall.open = function(){ /* disabled on /playlist listing */ };
      window.TwerkhubPaywall.close = function(){};
    } catch(_){}
    // Remove any existing paywall elements periodically (defensive — some
    // scripts inject them late).
    function sweep(){
      document.querySelectorAll('.twerkhub-paywall, [data-paywall-modal]').forEach(function(el){
        try { el.remove(); } catch(_){}
      });
    }
    sweep();
    setTimeout(sweep, 500);
    setTimeout(sweep, 2000);
  }

  function init(){
    try { autoTagSections(); } catch(e){ console.warn('[twerkhub-premium] autoTag failed', e); }
    try { initReveal(); }     catch(e){ console.warn('[twerkhub-premium] reveal failed', e); }
    try { initCountUp(); }    catch(e){ console.warn('[twerkhub-premium] countUp failed', e); }
    try { initImgLoadFlags(); } catch(e){ console.warn('[twerkhub-premium] imgLoad failed', e); }
    try { injectSkipLink(); } catch(e){ console.warn('[twerkhub-premium] skipLink failed', e); }
    try { initViewedTracker(); } catch(e){ console.warn('[twerkhub-premium] viewed failed', e); }
    try { initPaywallKillOnPlaylist(); } catch(e){ console.warn('[twerkhub-premium] paywall-kill failed', e); }
    console.info('[twerkhub-premium] ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
