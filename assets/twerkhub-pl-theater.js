/* ═══ TWERKHUB · Playlist theater (large centered window, never fullscreen) ═══
 * v20260425-p11
 *
 * For themed playlist pages (/try-on-hot-leaks/, /ttl-latin-models/,
 * /hottest-cosplay-fancam/, /korean-girls-kpop-twerk/) that DON'T have an
 * inline #twerkhub-pl-player iframe — opens videos in a LARGE CENTERED
 * window (90vw / 82vh), never fullscreen, never tiny popup.
 *
 * For /playlist/index.html — SKIPS its own click handler entirely, because
 * that page has its own inline iframe + swap() function that uses the
 * existing main player area.
 *
 * Side effects:
 *  - Marks video as viewed in localStorage (cross-session memory)
 *  - Adds a COMPACT green pill ("✓ VIEWED") absolutely positioned over the
 *    top-left of each clicked card. Real DOM <span>, not pseudo, so it
 *    survives any parent CSS conflicts.
 *  - Grants +15 tokens via AlexiaTokens.watchClip() per unique view
 *  - Uses YouTube IFrame API for reliable unMute + setVolume(100)
 */
(function(){
  'use strict';
  if (window.__twkPlTheaterInit) return;
  window.__twkPlTheaterInit = true;

  // ── State ───────────────────────────────────────────────────────
  var modal, frameContainer, ytPlayer, ytApiPromise = null;
  // If the page has its own inline player (#twerkhub-pl-player), we don't
  // want to take over click handling — that page handles it.
  var INLINE_PLAYER_PRESENT = false;

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

  // ── Modal scaffold (large centered window, NEVER fullscreen) ────
  function ensureModal(){
    if (modal) return;
    var st = document.createElement('style');
    st.id = 'twk-pl-theater-style';
    st.textContent = [
      /* Modal: large centered window, never fullscreen */
      '#twk-pl-theater{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(6px)}',
      '#twk-pl-theater.is-open{display:flex}',
      '#twk-pl-theater .twk-pl-theater-box{position:relative;width:min(90vw,1400px);max-height:82vh;aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.7)}',
      '@media(max-aspect-ratio:16/9){#twk-pl-theater .twk-pl-theater-box{width:90vw;height:auto}}',
      '#twk-pl-theater .twk-pl-theater-frame-host{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000}',
      '#twk-pl-theater .twk-pl-theater-frame-host iframe{width:100%;height:100%;border:0;background:#000}',
      '#twk-pl-theater-close{position:absolute;top:12px;right:12px;z-index:5;width:42px;height:42px;border-radius:50%;border:none;background:rgba(0,0,0,.7);color:#fff;font-size:24px;cursor:pointer;line-height:1;transition:background .2s}',
      '#twk-pl-theater-close:hover{background:#ff2d87}',
      /* Viewed badge: COMPACT green pill, absolutely positioned over card top-left.
         !important on position rules so flex/grid parents can't push it to a new row. */
      '.twk-viewed-badge{position:absolute!important;top:6px;left:6px;background:linear-gradient(145deg,#3ddca0,#28a877);color:#06140e;font:800 9px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;letter-spacing:.16em;padding:4px 8px;border-radius:5px;z-index:9;pointer-events:none;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,.45);white-space:nowrap;display:inline-block;line-height:1}',
      '.twk-viewed-badge::before{content:"✓ ";font-weight:900}',
      /* Force parent positioning so the absolute badge anchors correctly */
      '.vcard.twk-viewed,.rk-item.twk-viewed{position:relative!important}',
      /* Subtle dimming of viewed content (the part the user said works fine — keeping intact) */
      '.vcard.twk-viewed .vthumb img,.rk-item.twk-viewed .rk-thumb img,.rk-item.twk-viewed img{opacity:.55!important;filter:grayscale(.45)!important;transition:opacity .25s,filter .25s}'
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
    modal.addEventListener('click', function(ev){ if (ev.target === modal) close(); });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  function open(vid){
    if (!vid) return;
    ensureModal();
    frameContainer.innerHTML = '<div id="twk-pl-theater-target"></div>';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    markViewed(vid);
    grantViewToken();

    loadYTApi().then(function(YT){
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try { ytPlayer.destroy(); } catch(_){}
      }
      ytPlayer = new YT.Player('twk-pl-theater-target', {
        videoId: vid,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1,
          enablejsapi: 1, origin: window.location.origin
        },
        events: {
          onReady: function(ev){
            try { ev.target.unMute(); ev.target.setVolume(100); ev.target.playVideo(); } catch(_){}
            var attempts = 0;
            var iv = setInterval(function(){
              attempts++;
              try { ev.target.unMute(); ev.target.setVolume(100); } catch(_){}
              if (attempts >= 6) clearInterval(iv);
            }, 500);
          },
          onStateChange: function(ev){
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

  // ── Viewed memory + decoration ──────────────────────────────────
  var KEY = 'twk_viewed_videos';
  function getViewed(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch(_){ return {}; }
  }
  function setViewed(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(_){} }

  function markViewed(vid){
    if (!vid) return;
    var v = getViewed();
    var fresh = !v[vid];
    if (fresh) { v[vid] = Date.now(); setViewed(v); }
    decorateAllForVid(vid);
    return fresh;
  }
  function decorateAllForVid(vid){
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].getAttribute('data-vid') === vid) addViewedDecoration(els[i]);
    }
  }
  function addViewedDecoration(el){
    if (!el || el.classList.contains('twk-viewed')) return;
    el.classList.add('twk-viewed');
    if (!el.querySelector(':scope > .twk-viewed-badge')) {
      var b = document.createElement('span');
      b.className = 'twk-viewed-badge';
      b.textContent = 'Viewed';
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

  // ── Click delegation (only when there's no inline player on the page) ──
  function onDocClick(ev){
    if (INLINE_PLAYER_PRESENT) return; // /playlist/ handles its own clicks
    var a = ev.target.closest && ev.target.closest('a[data-vid]');
    if (!a) return;
    if (!(a.matches('.rk-item') || a.matches('.vcard'))) return;
    var vid = a.getAttribute('data-vid');
    if (!vid) return;
    ev.preventDefault();
    ev.stopPropagation();
    open(vid);
  }

  // ── Hook into /playlist/ inline player to mark viewed on swap ───
  function patchInlinePlayer(){
    // The inline page calls swap(vid) when user clicks. We piggyback by
    // observing the iframe.src and marking that vid as viewed too.
    var player = document.getElementById('twerkhub-pl-player');
    if (!player) return false;
    INLINE_PLAYER_PRESENT = true;
    function onLoad(){
      try {
        var m = (player.src || '').match(/embed\/([^?&\s]{6,})/);
        if (m && m[1]) markViewed(m[1]);
      } catch(_){}
    }
    player.addEventListener('load', onLoad);
    onLoad();
    return true;
  }

  function init(){
    patchInlinePlayer();
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
