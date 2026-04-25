/* ═══ TWERKHUB · Playlist theater (in-page video modal) ═══
 * v20260425-p9
 *
 * Universal click handler for playlist landing pages. Intercepts clicks on
 * any [data-vid] element (top 5 .rk-item AND .vcard grid items) and opens
 * the video INLINE in a modal — no navigation, no muted autoplay, no
 * "watch on YouTube" redirect.
 *
 * Side effects:
 *  - Marks video as viewed in localStorage (cross-session memory)
 *  - Adds .twk-viewed class to all matching cards (visual checkmark)
 *  - Grants +15 tokens per unique view via AlexiaTokens.watchClip()
 *  - Forces unmute via YouTube IFrame postMessage after 600ms
 *
 * Compatibility: works on /playlist/, /try-on-hot-leaks/,
 * /hottest-cosplay-fancam/, /korean-girls-kpop-twerk/, /ttl-latin-models/.
 */
(function(){
  'use strict';
  if (window.__twkPlTheaterInit) return;
  window.__twkPlTheaterInit = true;

  var modal, frame;

  // ── Modal scaffold ───────────────────────────────────────────────
  function ensureModal(){
    if (modal) return;
    var st = document.createElement('style');
    st.id = 'twk-pl-theater-style';
    st.textContent = [
      '#twk-pl-theater{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}',
      '#twk-pl-theater.is-open{display:flex}',
      '#twk-pl-theater .twk-pl-theater-box{position:relative;width:min(100%,1200px);aspect-ratio:16/9;background:#000;border-radius:14px;overflow:hidden;box-shadow:0 20px 80px rgba(0,0,0,.7)}',
      '#twk-pl-theater-frame{width:100%;height:100%;border:0;background:#000}',
      '#twk-pl-theater-close{position:absolute;top:10px;right:10px;z-index:2;width:42px;height:42px;border-radius:50%;border:none;background:rgba(0,0,0,.7);color:#fff;font-size:22px;cursor:pointer;line-height:1}',
      '#twk-pl-theater-close:hover{background:rgba(255,45,135,.85)}',
      '/* Viewed marker on cards */',
      '.vcard.twk-viewed .vthumb img,.rk-item.twk-viewed .rk-thumb img{opacity:.45;filter:grayscale(.55)}',
      '.vcard.twk-viewed,.rk-item.twk-viewed{position:relative}',
      '.vcard.twk-viewed::before,.rk-item.twk-viewed::before{content:"✓ VIEWED";position:absolute;top:8px;left:8px;background:rgba(56,217,169,.92);color:#06140e;font:800 10px/1 ui-sans-serif,system-ui;letter-spacing:.14em;padding:5px 9px;border-radius:6px;z-index:6;pointer-events:none;text-shadow:none;box-shadow:0 2px 8px rgba(0,0,0,.4)}'
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
      '  <iframe id="twk-pl-theater-frame" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    frame = modal.querySelector('#twk-pl-theater-frame');
    modal.querySelector('#twk-pl-theater-close').addEventListener('click', close);
    modal.addEventListener('click', function(ev){ if (ev.target === modal) close(); });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  function open(vid){
    if (!vid) return;
    ensureModal();
    // Use youtube-nocookie + autoplay (no mute=1) + enablejsapi for postMessage control
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid)
              + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    // Aggressively unmute via YouTube IFrame API postMessage. Browsers may
    // start muted because of autoplay policy — once we have user interaction
    // (the click that opened this), we can safely unmute and bump volume.
    var unmuteAttempts = 0;
    function tryUnmute(){
      if (!frame || !frame.contentWindow || unmuteAttempts++ > 12) return;
      try {
        frame.contentWindow.postMessage(JSON.stringify({event:'command',func:'unMute',args:[]}), '*');
        frame.contentWindow.postMessage(JSON.stringify({event:'command',func:'setVolume',args:[100]}), '*');
        frame.contentWindow.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}), '*');
      } catch(_){}
      setTimeout(tryUnmute, 400);
    }
    setTimeout(tryUnmute, 600);

    markViewed(vid);
    grantViewToken();
  }

  function close(){
    if (!modal) return;
    frame.src = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
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
    document.querySelectorAll('[data-vid="' + cssEscape(vid) + '"]').forEach(function(el){
      el.classList.add('twk-viewed');
    });
    return fresh;
  }
  function applyViewedClasses(){
    var v = getViewed();
    Object.keys(v).forEach(function(vid){
      document.querySelectorAll('[data-vid="' + cssEscape(vid) + '"]').forEach(function(el){
        el.classList.add('twk-viewed');
      });
    });
  }
  function cssEscape(s){
    return String(s).replace(/[^\w-]/g, function(c){ return '\\' + c; });
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
    // Match anchor tags with data-vid that are either rk-item or vcard
    if (!(a.matches('.rk-item') || a.matches('.vcard'))) return;
    var vid = a.getAttribute('data-vid');
    if (!vid) return;
    ev.preventDefault();
    ev.stopPropagation();
    open(vid);
  }

  function init(){
    applyViewedClasses();
    // Capture phase so we beat the paywall renderer and any other delegated handler
    document.addEventListener('click', onDocClick, true);
    // Re-apply viewed classes when new cards are inserted (renderer / pagination)
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
