/* ═══ TWERKHUB · Playlist theater (in-page video modal) ═══
 * v20260425-p10
 *
 * Fullscreen-style modal that plays the video INLINE (no navigation, no
 * YouTube redirect). Uses the real YouTube IFrame API so we can setVolume
 * and unMute reliably after user interaction.
 *
 * Side effects:
 *  - Marks video as viewed in localStorage (cross-session memory)
 *  - Appends a real <span class="twk-viewed-badge"> to every matching
 *    [data-vid] card (top 5 sidebar AND grid). Pseudo-elements were
 *    blocked by other CSS — real DOM nodes always render.
 *  - Grants +15 tokens via AlexiaTokens.watchClip() per unique view
 *
 * Compatibility: works on /playlist/, /try-on-hot-leaks/,
 * /hottest-cosplay-fancam/, /korean-girls-kpop-twerk/, /ttl-latin-models/.
 */
(function(){
  'use strict';
  if (window.__twkPlTheaterInit) return;
  window.__twkPlTheaterInit = true;

  // ── State ───────────────────────────────────────────────────────
  var modal, frameContainer, ytPlayer, ytApiPromise = null;

  // ── YouTube IFrame API loader (single-shot) ─────────────────────
  function loadYTApi(){
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise(function(resolve){
      if (window.YT && window.YT.Player) return resolve(window.YT);
      var existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
      var prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){
        if (typeof prevCb === 'function') { try { prevCb(); } catch(_){} }
        resolve(window.YT);
      };
      if (!existing) {
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        document.head.appendChild(s);
      }
    });
    return ytApiPromise;
  }

  // ── Modal scaffold ──────────────────────────────────────────────
  function ensureModal(){
    if (modal) return;
    var st = document.createElement('style');
    st.id = 'twk-pl-theater-style';
    st.textContent = [
      '#twk-pl-theater{position:fixed;inset:0;background:#000;z-index:99999;display:none;align-items:stretch;justify-content:stretch;padding:0}',
      '#twk-pl-theater.is-open{display:flex}',
      '#twk-pl-theater .twk-pl-theater-box{position:relative;width:100vw;height:100vh;background:#000}',
      '#twk-pl-theater .twk-pl-theater-frame-host{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000}',
      '#twk-pl-theater .twk-pl-theater-frame-host iframe{width:100%;height:100%;border:0;background:#000}',
      '#twk-pl-theater-close{position:absolute;top:14px;right:14px;z-index:5;width:48px;height:48px;border-radius:50%;border:none;background:rgba(0,0,0,.7);color:#fff;font-size:26px;cursor:pointer;line-height:1;transition:background .2s}',
      '#twk-pl-theater-close:hover{background:#ff2d87}',
      '/* Viewed marker (real DOM badge appended by JS) */',
      '.twk-viewed-badge{position:absolute;top:8px;left:8px;background:rgba(56,217,169,.95);color:#06140e;font:800 10px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI;letter-spacing:.14em;padding:5px 9px;border-radius:6px;z-index:9;pointer-events:none;text-shadow:none;box-shadow:0 2px 8px rgba(0,0,0,.5);text-transform:uppercase}',
      '.vcard.twk-viewed,.rk-item.twk-viewed{position:relative}',
      '.vcard.twk-viewed .vthumb img,.rk-item.twk-viewed .rk-thumb img,.rk-item.twk-viewed img{opacity:.45!important;filter:grayscale(.55)!important}'
    ].join('\n');
    document.head.appendChild(st);

    modal = document.createElement('div');
    modal.id = 'twk-pl-theater';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = [
      '<div class="twk-pl-theater-box">',
      '  <button id="twk-pl-theater-close" type="button" aria-label="Close">×</button>',
      '  <div class="twk-pl-theater-frame-host" id="twk-pl-theater-frame-host"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    frameContainer = modal.querySelector('#twk-pl-theater-frame-host');
    modal.querySelector('#twk-pl-theater-close').addEventListener('click', close);
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  function open(vid){
    if (!vid) return;
    ensureModal();

    // Reset frame container — YT.Player will replace this <div> with an iframe.
    frameContainer.innerHTML = '<div id="twk-pl-theater-target"></div>';

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    markViewed(vid);
    grantViewToken();

    // Use real YouTube IFrame API for reliable volume/unmute control
    loadYTApi().then(function(YT){
      // Destroy previous instance if any
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try { ytPlayer.destroy(); } catch(_){}
      }
      ytPlayer = new YT.Player('twk-pl-theater-target', {
        videoId: vid,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: function(ev){
            try {
              ev.target.unMute();
              ev.target.setVolume(100);
              ev.target.playVideo();
            } catch(_){}
            // Belt-and-suspenders: re-apply unmute a few times in case
            // browser autoplay policy delays the first unmute.
            var attempts = 0;
            var iv = setInterval(function(){
              attempts++;
              try {
                ev.target.unMute();
                ev.target.setVolume(100);
              } catch(_){}
              if (attempts >= 6) clearInterval(iv);
            }, 500);
          },
          onStateChange: function(ev){
            // 1 = playing, 5 = video cued
            if (ev.data === 1 || ev.data === 5) {
              try { ev.target.unMute(); ev.target.setVolume(100); } catch(_){}
            }
          }
        }
      });
    });
  }

  function close(){
    if (!modal) return;
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
      try { ytPlayer.destroy(); } catch(_){}
      ytPlayer = null;
    }
    if (frameContainer) frameContainer.innerHTML = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // ── Viewed memory ───────────────────────────────────────────────
  var KEY = 'twk_viewed_videos';
  function getViewed(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch(_){ return {}; }
  }
  function setViewed(v){
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(_){}
  }
  function markViewed(vid){
    if (!vid) return;
    var v = getViewed();
    var fresh = !v[vid];
    if (fresh) {
      v[vid] = Date.now();
      setViewed(v);
    }
    decorateAllForVid(vid);
    return fresh;
  }
  function decorateAllForVid(vid){
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute('data-vid') !== vid) continue;
      addViewedDecoration(el);
    }
  }
  function addViewedDecoration(el){
    if (!el || el.classList.contains('twk-viewed')) return;
    el.classList.add('twk-viewed');
    // Append a real <span> badge — pseudo-elements were getting masked by
    // other CSS rules on .vcard, real DOM nodes always render visibly.
    if (!el.querySelector(':scope > .twk-viewed-badge')) {
      var b = document.createElement('span');
      b.className = 'twk-viewed-badge';
      b.textContent = '✓ VIEWED';
      el.appendChild(b);
    }
  }
  function applyViewedClasses(){
    var v = getViewed();
    var keys = Object.keys(v);
    if (!keys.length) return;
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      var vid = els[i].getAttribute('data-vid');
      if (vid && v[vid]) addViewedDecoration(els[i]);
    }
  }

  // ── Token grant ─────────────────────────────────────────────────
  function grantViewToken(){
    try {
      if (window.AlexiaTokens && typeof window.AlexiaTokens.watchClip === 'function') {
        window.AlexiaTokens.watchClip();
      } else if (window.AlexiaTokens && typeof window.AlexiaTokens.grant === 'function') {
        window.AlexiaTokens.grant(15, 'watch_clip');
      }
    } catch(_){}
  }

  // ── Click delegation ────────────────────────────────────────────
  function onDocClick(ev){
    var a = ev.target.closest && ev.target.closest('a[data-vid]');
    if (!a) return;
    if (!(a.matches('.rk-item') || a.matches('.vcard'))) return;
    var vid = a.getAttribute('data-vid');
    if (!vid) return;
    ev.preventDefault();
    ev.stopPropagation();
    open(vid);
  }

  function init(){
    applyViewedClasses();
    document.addEventListener('click', onDocClick, true);
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(muts){
        var added = false;
        muts.forEach(function(m){ if (m.addedNodes && m.addedNodes.length) added = true; });
        if (added) applyViewedClasses();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.TwerkhubPlTheater = { open: open, close: close, markViewed: markViewed };
})();
