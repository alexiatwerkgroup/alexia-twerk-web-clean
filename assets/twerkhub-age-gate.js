/* ═══ TWERKHUB · +18 Age Gate (auto-detects YouTube embed-blocked videos) ═══
 * v20260425-p1
 *
 * Distinct from the LEGACY twerkhub-paywall.js (which is killed on /playlist/).
 * This module handles a different problem: when YouTube refuses to embed a
 * video on our site (age-restricted, blocked by uploader, embed disabled),
 * the iframe fires onError with code 101 or 150. We catch that and replace
 * the player with a Discord paywall pointing users to Alexia's server.
 *
 * Once a video errors out:
 *   1) Its videoId is saved to localStorage.twk_blocked_videos
 *   2) All cards for that vid get the .twk-blocked decoration + 🔒 +18 badge
 *   3) Future clicks on that card go straight to the paywall — no reload
 *      attempt, the video stays locked.
 *
 * Public API (window.TwkAgeGate):
 *   isBlocked(vid)            → boolean
 *   markBlocked(vid)          → adds to localStorage + decorates cards
 *   show(container, vid)      → renders paywall HTML into container
 *   handleYTError(code, vid, container)  → call from YT onError event
 *   decorateAll()             → adds 🔒 badge to all blocked cards
 *
 * Hooked from twerkhub-pl-theater.js (modal AND inline player).
 */
(function(){
  'use strict';
  if (window.TwkAgeGate) return;

  // —————————————— Configuration ——————————————
  var DISCORD_URL = 'https://discord.gg/WWn8ZgQMjn';
  var STORAGE_KEY = 'twk_blocked_videos';
  // YouTube embed-error codes that mean "this video is +18 / not embeddable here"
  // 100 = video not found  → NOT a paywall case (real 404)
  // 101 = embed disabled by uploader / age-restricted
  // 150 = same as 101 (different video category)
  var BLOCK_CODES = { 101: true, 150: true };

  // —————————————— Storage helpers ——————————————
  function readBlocked(){
    try {
      var v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return (v && typeof v === 'object') ? v : {};
    } catch(_){ return {}; }
  }
  function writeBlocked(obj){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch(_){}
  }
  function isBlocked(vid){
    if (!vid) return false;
    var b = readBlocked();
    return !!b[vid];
  }
  function markBlocked(vid){
    if (!vid) return;
    var b = readBlocked();
    if (!b[vid]) {
      b[vid] = Date.now();
      writeBlocked(b);
    }
    decorateAllForVid(vid);
  }

  // —————————————— Style injection ——————————————
  function injectStyle(){
    if (document.getElementById('twk-age-gate-css')) return;
    var s = document.createElement('style');
    s.id = 'twk-age-gate-css';
    s.textContent = [
      '.twk-age-gate{position:relative;width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:radial-gradient(900px 600px at 20% 10%,rgba(255,46,99,.18),transparent 55%),radial-gradient(900px 600px at 80% 90%,rgba(232,200,128,.10),transparent 55%),linear-gradient(180deg,#0a0a10,#13131c);border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#f4f4f8;text-align:center;padding:24px;}',
      '.twk-age-gate::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 8px,transparent 8px,transparent 16px);pointer-events:none;}',
      '.twk-age-gate-card{position:relative;max-width:540px;width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;}',
      '.twk-age-gate-lock{font-size:54px;line-height:1;filter:drop-shadow(0 6px 20px rgba(255,46,99,.35));}',
      '.twk-age-gate-kicker{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#e8c880;font-weight:700;}',
      '.twk-age-gate-title{font-size:26px;line-height:1.1;font-weight:800;letter-spacing:-.01em;margin:0;}',
      '.twk-age-gate-title em{color:#ff5fa3;font-style:italic;}',
      '.twk-age-gate-body{font-size:14px;line-height:1.55;color:rgba(255,255,255,.72);margin:0;max-width:460px;}',
      '.twk-age-gate-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;margin-top:6px;padding:13px 26px;border-radius:14px;border:none;background:linear-gradient(145deg,#5865F2,#3a44b8);color:#fff;font:800 14px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;text-decoration:none;cursor:pointer;box-shadow:0 12px 32px rgba(88,101,242,.35);transition:transform .15s,box-shadow .15s;}',
      '.twk-age-gate-btn:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(88,101,242,.45);}',
      '.twk-age-gate-btn svg{width:20px;height:20px;}',
      '.twk-age-gate-foot{font-size:11px;color:rgba(255,255,255,.45);margin-top:4px;}',
      // Card decorations (cards with vid that are blocked)
      '.twk-blocked{position:relative;}',
      '.twk-blocked-badge{position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,.78);color:#ffd166;font:700 10px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;z-index:5;backdrop-filter:blur(6px);border:1px solid rgba(255,209,102,.35);pointer-events:none;}',
      '.twk-blocked img,.twk-blocked .vcard-thumb,.twk-blocked picture{filter:brightness(.55) saturate(.7);}',
      '.twk-blocked:hover img,.twk-blocked:hover .vcard-thumb,.twk-blocked:hover picture{filter:brightness(.7) saturate(.85);}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // —————————————— Paywall HTML ——————————————
  function buildHTML(){
    return ''
      + '<div class="twk-age-gate" role="dialog" aria-modal="true" aria-label="Adult content gate">'
      +   '<div class="twk-age-gate-card">'
      +     '<div class="twk-age-gate-lock" aria-hidden="true">🔒</div>'
      +     '<div class="twk-age-gate-kicker">+18 · Members only</div>'
      +     '<h2 class="twk-age-gate-title">This clip is <em>locked</em>.</h2>'
      +     '<p class="twk-age-gate-body">YouTube blocks this video from playing on third-party sites because it is age-restricted. Get the uncensored version directly from Alexia on Discord.</p>'
      +     '<a class="twk-age-gate-btn" href="' + DISCORD_URL + '" target="_blank" rel="noopener nofollow ugc">'
      +       '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.27 5.33A18.34 18.34 0 0 0 14.94 4l-.2.4a16.8 16.8 0 0 1 4.05 1.4 16.4 16.4 0 0 0-12.6 0A16.8 16.8 0 0 1 10.24 4.4L10.04 4a18.34 18.34 0 0 0-4.32 1.33C2.95 9.5 2.2 13.55 2.6 17.55a18.6 18.6 0 0 0 5.65 2.85l.45-.62a12.2 12.2 0 0 1-2-.97c.17-.12.34-.25.5-.38a13.16 13.16 0 0 0 11.6 0c.16.13.33.26.5.38-.62.37-1.3.7-2 .97l.45.62a18.6 18.6 0 0 0 5.65-2.85c.5-4.6-.77-8.6-3.13-12.22zM9.5 15.4c-1.04 0-1.9-.95-1.9-2.13s.84-2.13 1.9-2.13c1.05 0 1.91.95 1.9 2.13 0 1.18-.85 2.13-1.9 2.13zm5 0c-1.04 0-1.9-.95-1.9-2.13s.84-2.13 1.9-2.13c1.05 0 1.91.95 1.9 2.13 0 1.18-.85 2.13-1.9 2.13z"/></svg>'
      +       '<span>Únete a Alexia en Discord</span>'
      +     '</a>'
      +     '<div class="twk-age-gate-foot">Free invite · Adult content · 18+ only</div>'
      +   '</div>'
      + '</div>';
  }

  function show(container, vid){
    injectStyle();
    if (!container) return;
    // Replace the iframe (or anything else inside the player slot) with the gate
    container.innerHTML = buildHTML();
    if (vid) markBlocked(vid);
  }

  /**
   * Render the gate as an ABSOLUTE overlay inside `wrap` without touching the
   * existing iframe. Used by the inline player on /playlist/ where the iframe
   * must stay intact for swap() to reuse on the next click.
   * Sets wrap.style.position='relative' if not already, then injects an absolute
   * child .twk-age-gate that fills the wrap.
   */
  function showOverlay(wrap, vid){
    injectStyle();
    if (!wrap) return;
    var prev = wrap.querySelector(':scope > .twk-age-gate-overlay');
    if (prev) prev.remove();
    // Make sure wrap is a positioning context
    var cs = window.getComputedStyle(wrap);
    if (cs.position === 'static') wrap.style.position = 'relative';
    var div = document.createElement('div');
    div.className = 'twk-age-gate-overlay';
    div.style.cssText = 'position:absolute;inset:0;z-index:50;';
    div.innerHTML = buildHTML();
    wrap.appendChild(div);
    if (vid) markBlocked(vid);
  }

  function hideOverlay(wrap){
    if (!wrap) return;
    var prev = wrap.querySelector(':scope > .twk-age-gate-overlay');
    if (prev) prev.remove();
  }

  function handleYTError(code, vid, container){
    if (!BLOCK_CODES[code]) return false;
    show(container, vid);
    return true;
  }

  // —————————————— Card decoration ——————————————
  function decorateAllForVid(vid){
    if (!vid) return;
    injectStyle();
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].getAttribute('data-vid') === vid) addBlockedDecoration(els[i]);
    }
  }
  function addBlockedDecoration(el){
    if (!el || el.classList.contains('twk-blocked')) return;
    el.classList.add('twk-blocked');
    if (!el.querySelector(':scope > .twk-blocked-badge')) {
      var b = document.createElement('span');
      b.className = 'twk-blocked-badge';
      b.textContent = '🔒 +18';
      el.appendChild(b);
    }
  }
  function decorateAll(){
    injectStyle();
    var b = readBlocked();
    var keys = Object.keys(b);
    if (!keys.length) return;
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      var vid = els[i].getAttribute('data-vid');
      if (vid && b[vid]) addBlockedDecoration(els[i]);
    }
  }

  // Auto-decorate on load + on DOM mutations (filters re-render cards)
  function init(){
    decorateAll();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(muts){
        var any = false;
        muts.forEach(function(m){ if (m.addedNodes && m.addedNodes.length) any = true; });
        if (any) decorateAll();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.TwkAgeGate = {
    isBlocked: isBlocked,
    markBlocked: markBlocked,
    show: show,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    handleYTError: handleYTError,
    decorateAll: decorateAll,
    DISCORD_URL: DISCORD_URL,
    BLOCK_CODES: BLOCK_CODES
  };
})();
