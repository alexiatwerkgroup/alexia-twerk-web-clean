/* ═══ TWERKHUB · +18 Age Gate (auto-detects YouTube embed-blocked videos) ═══
 * v20260426-p7
 *
 * 2026-04-26 fix p7: showOverlay z-index bumped 50 → 999 so YouTube's
 * "video unavailable" black UI inside the iframe cannot bleed through.
 * Pairs with theater p7 which now also hides the iframe via inline style.
 *
 * 2026-04-26 fix p6: paywall flashed for ~0.5s then went black. Two root causes:
 *   (a) CSS used `aspect-ratio:16/9` inside a flex parent (modal's frame-host),
 *       which collapsed the child's height to 0 after the first reflow → only
 *       the modal's #000 background remained visible.
 *   (b) z-index missing → any leftover detached iframe could paint on top.
 * Fix: switched to height:100% + min-height:280px + z-index:60 so the paywall
 *      always fills its parent and stays above any sibling.
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
  var DISCORD_URL  = 'https://discord.gg/WWn8ZgQMjn';
  var TELEGRAM_URL = 'https://t.me/+0xNr69raiIlmYWRh';
  var STORAGE_KEY  = 'twk_blocked_videos';
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
      '.twk-age-gate{position:relative;width:100%;height:100%;min-height:280px;display:flex;align-items:center;justify-content:center;background:radial-gradient(900px 600px at 20% 10%,rgba(255,46,99,.18),transparent 55%),radial-gradient(900px 600px at 80% 90%,rgba(232,200,128,.10),transparent 55%),linear-gradient(180deg,#0a0a10,#13131c);border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#f4f4f8;text-align:center;padding:24px;z-index:60;}',
      '.twk-age-gate::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 8px,transparent 8px,transparent 16px);pointer-events:none;}',
      '.twk-age-gate-card{position:relative;max-width:540px;width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;}',
      '.twk-age-gate-lock{font-size:54px;line-height:1;filter:drop-shadow(0 6px 20px rgba(255,46,99,.35));}',
      '.twk-age-gate-kicker{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#e8c880;font-weight:700;}',
      '.twk-age-gate-title{font-size:26px;line-height:1.1;font-weight:800;letter-spacing:-.01em;margin:0;}',
      '.twk-age-gate-title em{color:#ff5fa3;font-style:italic;}',
      '.twk-age-gate-body{font-size:14px;line-height:1.55;color:rgba(255,255,255,.72);margin:0;max-width:460px;}',
      '.twk-age-gate-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:6px;}',
      '.twk-age-gate-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:13px 22px;border-radius:14px;border:none;color:#fff;font:800 13px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;text-decoration:none;cursor:pointer;transition:transform .15s,box-shadow .15s;}',
      '.twk-age-gate-btn--discord{background:linear-gradient(145deg,#5865F2,#3a44b8);box-shadow:0 12px 32px rgba(88,101,242,.35);}',
      '.twk-age-gate-btn--discord:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(88,101,242,.45);}',
      '.twk-age-gate-btn--telegram{background:linear-gradient(145deg,#2AABEE,#229ED9);box-shadow:0 12px 32px rgba(42,171,238,.35);}',
      '.twk-age-gate-btn--telegram:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(42,171,238,.45);}',
      '.twk-age-gate-btn svg{width:18px;height:18px;}',
      '.twk-age-gate-foot{font-size:11px;color:rgba(255,255,255,.45);margin-top:4px;}',
      // Card decorations (cards with vid that are blocked)
      // Pill goes top-RIGHT to avoid overlap with the VIEWED badge (top-left)
      '.twk-blocked{position:relative;}',
      '.twk-blocked-badge{position:absolute;top:6px;right:6px;display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;background:linear-gradient(135deg,#ff2d87,#ff5f5f);color:#fff;font:800 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;z-index:6;backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.25);pointer-events:none;box-shadow:0 4px 14px rgba(255,45,135,.4);}',
      // Big center lock overlay so the card READS as locked from a distance
      '.twk-blocked-lock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:42px;color:rgba(255,255,255,.92);text-shadow:0 4px 20px rgba(0,0,0,.7),0 0 30px rgba(255,45,135,.5);pointer-events:none;z-index:5;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6));}',
      // Strong filter on the thumbnail so users SEE the difference instantly
      '.twk-blocked img,.twk-blocked .vcard-thumb,.twk-blocked picture{filter:brightness(.4) saturate(.5) contrast(1.05);}',
      '.twk-blocked:hover img,.twk-blocked:hover .vcard-thumb,.twk-blocked:hover picture{filter:brightness(.5) saturate(.6);}',
      // Hide the play button on blocked cards — clicking opens the paywall, not the player
      '.twk-blocked .vplay,.twk-blocked .vscrim{opacity:.3 !important;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // —————————————— Paywall HTML ——————————————
  function buildHTML(){
    return ''
      + '<div class="twk-age-gate" role="dialog" aria-modal="true" aria-label="Adult content gate">'
      +   '<div class="twk-age-gate-card">'
      +     '<div class="twk-age-gate-lock" aria-hidden="true">🔒</div>'
      +     '<div class="twk-age-gate-kicker">+18 · Locked content</div>'
      +     '<h2 class="twk-age-gate-title">This video is <em>locked</em>.</h2>'
      +     '<p class="twk-age-gate-body"><strong>To unlock, contact Alexia on Discord or Telegram.</strong> YouTube blocks this video from playing outside their platform because it is age-restricted. The uncensored version comes from Alexia directly, in private.</p>'
      +     '<div class="twk-age-gate-btns">'
      +       '<a class="twk-age-gate-btn twk-age-gate-btn--discord" href="' + DISCORD_URL + '" target="_blank" rel="noopener nofollow ugc">'
      +         '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.27 5.33A18.34 18.34 0 0 0 14.94 4l-.2.4a16.8 16.8 0 0 1 4.05 1.4 16.4 16.4 0 0 0-12.6 0A16.8 16.8 0 0 1 10.24 4.4L10.04 4a18.34 18.34 0 0 0-4.32 1.33C2.95 9.5 2.2 13.55 2.6 17.55a18.6 18.6 0 0 0 5.65 2.85l.45-.62a12.2 12.2 0 0 1-2-.97c.17-.12.34-.25.5-.38a13.16 13.16 0 0 0 11.6 0c.16.13.33.26.5.38-.62.37-1.3.7-2 .97l.45.62a18.6 18.6 0 0 0 5.65-2.85c.5-4.6-.77-8.6-3.13-12.22zM9.5 15.4c-1.04 0-1.9-.95-1.9-2.13s.84-2.13 1.9-2.13c1.05 0 1.91.95 1.9 2.13 0 1.18-.85 2.13-1.9 2.13zm5 0c-1.04 0-1.9-.95-1.9-2.13s.84-2.13 1.9-2.13c1.05 0 1.91.95 1.9 2.13 0 1.18-.85 2.13-1.9 2.13z"/></svg>'
      +         '<span>Contact on Discord</span>'
      +       '</a>'
      +       '<a class="twk-age-gate-btn twk-age-gate-btn--telegram" href="' + TELEGRAM_URL + '" target="_blank" rel="noopener nofollow ugc">'
      +         '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>'
      +         '<span>Contact on Telegram</span>'
      +       '</a>'
      +     '</div>'
      +     '<div class="twk-age-gate-foot">Free invite · 18+ only · Private</div>'
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
    div.style.cssText = 'position:absolute;inset:0;z-index:999;background:#0a0a10;';
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
    // Big center lock — overlays the thumbnail so users see it from a distance
    if (!el.querySelector(':scope > .twk-blocked-lock')) {
      var lock = document.createElement('span');
      lock.className = 'twk-blocked-lock';
      lock.setAttribute('aria-hidden', 'true');
      lock.textContent = '🔒';
      el.appendChild(lock);
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
