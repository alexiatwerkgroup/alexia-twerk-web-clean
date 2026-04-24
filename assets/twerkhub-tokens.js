/* ═══ TWERKHUB · Token HUD engine ═══
 * Front-end only · localStorage-backed · non-invasive.
 *
 * Rewards (SAGRADA-aligned):
 *   +10 TKN · first time a user lands on a page (path + search)
 *   +5  TKN · first time a user plays a specific video (data-vid)
 *
 * UI:
 *   A persistent badge (coin + count + tier) floats at top-right.
 *   Earn events fire a sliding toast with "+N" and what triggered it.
 *
 * LocalStorage keys:
 *   twerkhub_tokens         · integer balance
 *   twerkhub_tokens_seen_paths  · JSON array of visited pathnames
 *   twerkhub_tokens_seen_vids   · JSON array of played video ids
 *
 * Idempotent: safe to include on every page.
 * v20260424-p8 · unified balance — reads AlexiaTokens state so /account and HUD match
 */
(function(){
  'use strict';
  if (window.__twerkhubTokensInit) return;
  window.__twerkhubTokensInit = true;

  var LS = {
    TOKENS: 'twerkhub_tokens',
    PATHS:  'twerkhub_tokens_seen_paths',
    VIDS:   'twerkhub_tokens_seen_vids'
  };
  var AWARD_PAGE = 10;
  var AWARD_VIDEO = 5;
  var TOAST_TTL = 3500;

  function lsGet(key, fallback){
    try {
      var v = localStorage.getItem(key);
      if (v == null) return fallback;
      return JSON.parse(v);
    } catch(e){ return fallback; }
  }
  function lsSet(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }

  // UNIFIED BALANCE (v20260424-p8):
  // Previously this HUD stored its own balance in `twerkhub_tokens`, but the
  // /account and /profile pages read their balance from `window.AlexiaTokens`
  // (token-system.js) — so the two numbers drifted and the user saw 225 in
  // the HUD while /profile showed 1,300+. From now on there's a single source
  // of truth: AlexiaTokens. The HUD reads its state and grants any rewards
  // through AlexiaTokens.grant(), which also fires the standard toasts.
  // The local `twerkhub_tokens` key is kept as a fallback for when the
  // AlexiaTokens module hasn't loaded yet (e.g. during the first paint).
  function hasAlexia(){ return !!(window.AlexiaTokens && typeof window.AlexiaTokens.getState === 'function'); }
  function getTokens(){
    if (hasAlexia()) {
      try { return Number(window.AlexiaTokens.getState().balance) || 0; } catch(_){}
    }
    return Number(lsGet(LS.TOKENS, 0)) || 0;
  }
  function setTokens(n){
    // Legacy path — only used when AlexiaTokens isn't available. If it is,
    // mutations must go through AlexiaTokens.grant() to keep /account in sync.
    lsSet(LS.TOKENS, Number(n) || 0);
  }

  function getSeenPaths(){
    var v = lsGet(LS.PATHS, []);
    return Array.isArray(v) ? v : [];
  }
  function setSeenPaths(a){ lsSet(LS.PATHS, a); }

  function getSeenVids(){
    var v = lsGet(LS.VIDS, []);
    return Array.isArray(v) ? v : [];
  }
  function setSeenVids(a){ lsSet(LS.VIDS, a); }

  // Tier label based on current token balance (mirrors 4-tier pricing).
  function tierFor(tokens){
    if (tokens >= 10000) return 'VIP';
    if (tokens >= 2000)  return 'Premium';
    if (tokens >= 500)   return 'Medium';
    return 'Basic';
  }

  // ── DOM: build the HUD (badge + toast host) ──────────────────────────────
  var hud, badge, countEl, tierEl, toastHost;
  function buildHud(){
    if (hud) return;
    hud = document.createElement('div');
    hud.className = 'twerkhub-tokens-hud';
    hud.setAttribute('aria-live', 'polite');
    hud.setAttribute('aria-label', 'Token balance');

    badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'twerkhub-tokens-badge';
    badge.title = 'Your Twerkhub tokens — earn by exploring and watching';
    badge.innerHTML =
      '<span class="twerkhub-tokens-coin" aria-hidden="true"></span>' +
      '<span class="twerkhub-tokens-count">0</span>' +
      '<span class="twerkhub-tokens-tier">BASIC</span>';
    badge.addEventListener('click', function(){
      // Click on badge scrolls to the tiers section so users can see what
      // they're unlocking. Graceful no-op on pages without #tokens.
      var tgt = document.getElementById('tokens');
      if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({behavior:'smooth', block:'start'});
    });

    toastHost = document.createElement('div');
    toastHost.className = 'twerkhub-tokens-toast-host';

    hud.appendChild(badge);
    hud.appendChild(toastHost);
    document.body.appendChild(hud);

    countEl = badge.querySelector('.twerkhub-tokens-count');
    tierEl  = badge.querySelector('.twerkhub-tokens-tier');
  }

  function render(){
    var t = getTokens();
    if (countEl) countEl.textContent = t.toLocaleString('en-US');
    if (tierEl)  tierEl.textContent = tierFor(t).toUpperCase();
  }

  function pulse(){
    if (!badge) return;
    badge.classList.remove('is-pulsing');
    // Force reflow for restart.
    void badge.offsetWidth;
    badge.classList.add('is-pulsing');
  }

  // Pleasant "coin ping" generated with Web Audio API — no external file.
  // Two quick notes with a decay envelope; very small volume so it never
  // interrupts whatever else the user is listening to.
  var _audioCtx = null;
  function ensureAudioCtx(){
    if (_audioCtx) return _audioCtx;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) _audioCtx = new Ctor();
    } catch(e){ /* not available */ }
    return _audioCtx;
  }
  function playTokenPing(){
    try {
      var ctx = ensureAudioCtx();
      if (!ctx) return;
      // Some browsers need user gesture to unlock — if still "suspended"
      // after a click (which we've probably had), resume will succeed.
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(_){} }
      var now = ctx.currentTime;
      var master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      master.connect(ctx.destination);
      // Bell-like: two sine tones, upper octave panned slightly right
      [[988, 0], [1318, 0.08]].forEach(function(pair, i){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pair[0], now + pair[1]);
        osc.frequency.exponentialRampToValueAtTime(pair[0] * 0.98, now + pair[1] + 0.35);
        g.gain.setValueAtTime(0.0001, now + pair[1]);
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.9 : 0.55, now + pair[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + pair[1] + 0.38);
        osc.connect(g).connect(master);
        osc.start(now + pair[1]);
        osc.stop(now + pair[1] + 0.42);
      });
    } catch(e){ /* quiet — sound is bonus */ }
  }

  function showToast(plusN, title, sub){
    if (!toastHost) return;
    var el = document.createElement('div');
    el.className = 'twerkhub-tokens-toast';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="twerkhub-tokens-toast-plus">+' + Number(plusN) + '</span>' +
      '<span class="twerkhub-tokens-toast-body">' +
        '<span class="twerkhub-tokens-toast-title">' + escapeHtml(title) + '</span>' +
        '<span class="twerkhub-tokens-toast-sub">' + escapeHtml(sub) + '</span>' +
      '</span>';
    toastHost.appendChild(el);
    // Next frame → visible (trigger CSS transition)
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ el.classList.add('is-visible'); });
    });
    // Play the pleasant coin ping alongside the toast.
    playTokenPing();
    setTimeout(function(){
      el.classList.remove('is-visible');
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }, TOAST_TTL);
  }

  function escapeHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Reward flows ─────────────────────────────────────────────────────────
  // These route through AlexiaTokens.grant() when available so the /account
  // dashboard reflects them immediately — otherwise they fall back to the
  // local counter. The HUD's toast + pulse + ping always fire either way.
  function grantUnified(amount, title, sub){
    if (hasAlexia() && typeof window.AlexiaTokens.grant === 'function') {
      try { window.AlexiaTokens.grant(amount, title); } catch(_){}
    } else {
      setTokens(getTokens() + amount);
    }
    render();
    pulse();
    showToast(amount, title, sub);
  }

  function rewardIfNewPath(){
    // Skip the legacy per-path reward when AlexiaTokens is the source of truth —
    // that module already awards +5 per new page via its own onPageVisit().
    // We just refresh the HUD display; no double-granting.
    if (hasAlexia()) { render(); return; }
    var key = (location.pathname || '/') + (location.search || '');
    var seen = getSeenPaths();
    if (seen.indexOf(key) !== -1) return;
    seen.push(key);
    if (seen.length > 400) seen = seen.slice(-400);
    setSeenPaths(seen);

    var label = document.title.replace(/\s*·\s*Twerkhub.*$/,'').slice(0,42) || 'New page';
    grantUnified(AWARD_PAGE, 'New page discovered', label);
  }

  function rewardIfNewVid(vid){
    if (!vid) return;
    var seen = getSeenVids();
    if (seen.indexOf(vid) !== -1) return;
    seen.push(vid);
    if (seen.length > 800) seen = seen.slice(-800);
    setSeenVids(seen);
    grantUnified(AWARD_VIDEO, 'Video unlocked', 'Preview · ' + vid.slice(0,10));
  }

  // Bind clicks on any card with data-hot="1" data-vid (playlist swap pattern).
  // Fires AFTER the swap handler (we're not preventing default here).
  function bindVideoListeners(){
    document.addEventListener('click', function(ev){
      var hot = ev.target.closest && ev.target.closest('[data-hot="1"][data-vid]');
      if (!hot) return;
      var vid = hot.getAttribute('data-vid');
      // Delay slightly so the swap handler runs first and doesn't fight us.
      setTimeout(function(){ rewardIfNewVid(vid); }, 50);
    }, true);
  }

  // Listen for ANY balance change broadcast by token-system.js (daily login,
  // video complete, referral, etc.) and re-render the HUD so the two numbers
  // always match. Safe to bind even if AlexiaTokens loads later.
  function bindAlexiaSync(){
    try {
      window.addEventListener('alexia-tokens-changed', function(){
        render(); pulse();
      });
    } catch(_){}
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init(){
    try {
      buildHud();
      render();
      // Award page visit on first landing (new paths only).
      // Slight delay so the HUD is mounted and the pulse animation registers.
      setTimeout(rewardIfNewPath, 700);
      bindVideoListeners();
      bindAlexiaSync();
      // If AlexiaTokens loads AFTER us, re-render once it shows up so the
      // balance switches from the local fallback to the unified source.
      var waitForAlexia = setInterval(function(){
        if (hasAlexia()) { clearInterval(waitForAlexia); render(); }
      }, 400);
      setTimeout(function(){ clearInterval(waitForAlexia); }, 8000);
      console.info('[twerkhub-tokens] ready · balance=', getTokens(), '· unified:', hasAlexia());
    } catch(e){
      console.warn('[twerkhub-tokens] init failed', e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  // Expose minimal API for other scripts (video player swap, etc).
  window.TwerkhubTokens = {
    award: function(n, title, sub){
      var t = getTokens() + (Number(n)||0);
      setTokens(t); render(); pulse();
      showToast(Number(n)||0, title||'Tokens earned', sub||'');
    },
    balance: getTokens,
    tier: function(){ return tierFor(getTokens()); },
    reset: function(){
      setTokens(0); setSeenPaths([]); setSeenVids([]); render();
    }
  };
})();
