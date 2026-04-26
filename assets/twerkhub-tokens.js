/* ═══ TWERKHUB · Token HUD engine ═══
 * Front-end only · localStorage-backed · non-invasive.
 *
 * Rewards (SAGRADA-aligned with token-system.js v9, 2026-04-26 economy):
 *   +5 TKN · first time a user lands on a page (path + search) · cap 10/day
 *   +3 TKN · first time a user plays a specific video (data-vid) · cap 30/day
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
 * v20260426-p12 · aligned with the tightened economy (page +5, video +3) so
 *                   HUD toasts match what token-system.js actually credits.
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
  var AWARD_PAGE = 5;
  var AWARD_VIDEO = 3;
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

  // SINGLE SOURCE OF TRUTH (v20260425-p1):
  // The HUD reads ONLY from `alexia_tokens_v1.balance` — same key that
  // token-system.js, /account, and /profile all use. No legacy `twerkhub_tokens`
  // fallback. If the key doesn't exist yet, balance is 0. token-system.js will
  // call setBalance() on init which will broadcast and re-render.
  var ALEXIA_KEY = 'alexia_tokens_v1.balance';
  function hasAlexia(){ return !!(window.AlexiaTokens && typeof window.AlexiaTokens.getState === 'function'); }
  // GATE: anonymous users see balance=0. Tokens only count when there's a
  // logged-in user (alexia_current_user in local OR session storage).
  function isLoggedIn(){
    try {
      var ls = localStorage.getItem('alexia_current_user');
      if (ls && ls !== 'null') return true;
      var ss = sessionStorage.getItem('alexia_current_user');
      if (ss && ss !== 'null') return true;
    } catch(_){}
    return false;
  }
  function getTokens(){
    if (!isLoggedIn()) return 0;
    // Prefer the live module state (in case it has unflushed in-memory writes).
    if (hasAlexia()) {
      try {
        var s = window.AlexiaTokens.getState();
        var n = Number(s && s.balance);
        if (!isNaN(n) && n >= 0) return n;
      } catch(_){}
    }
    // Direct read of the canonical key — works on every page regardless of
    // whether token-system.js has finished loading yet.
    try {
      var raw = localStorage.getItem(ALEXIA_KEY);
      if (raw != null) {
        var parsed = JSON.parse(raw);
        var num = Number(parsed);
        if (!isNaN(num) && num >= 0) return num;
      }
    } catch(_){}
    return 0;
  }
  // No more setTokens() — all writes go through AlexiaTokens.grant() exclusively.
  function setTokens(n){
    if (hasAlexia() && typeof window.AlexiaTokens.setBalance === 'function') {
      try { window.AlexiaTokens.setBalance(Number(n) || 0); return; } catch(_){}
    }
    // Fallback: write directly to the canonical key + dispatch the event so
    // any listening HUDs/widgets re-render.
    try {
      localStorage.setItem(ALEXIA_KEY, JSON.stringify(Number(n) || 0));
      window.dispatchEvent(new CustomEvent('alexia-tokens-changed'));
    } catch(_){}
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
      '<span class="twerkhub-tokens-unit">tokens</span>' +
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
    // Hide HUD entirely for anonymous users — pill should only appear when
    // there's an actual user accumulating tokens.
    if (hud) {
      hud.style.display = isLoggedIn() ? '' : 'none';
    }
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
  // ── "Casino coin cascade" — fuller, more rewarding than a single tink.
  // Stacks 4 metallic notes in a quick descending+rising arpeggio (~220ms
  // total) so it reads as "coins falling into the pile". Triangle wave for
  // warmth, low master gain (0.07) so it never competes with playing video.
  function playTokenPing(){
    try {
      var ctx = ensureAudioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(_){} }
      var now = ctx.currentTime;
      var master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.07, now + 0.006);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      master.connect(ctx.destination);
      // 4 notes: A6 → C7 → E7 → G7 (rising arpeggio, casino coin shower vibe).
      // Stagger by 50ms so they overlap into a "cascade" texture.
      [[1760,0],[2093,0.05],[2637,0.10],[3136,0.15]].forEach(function(pair){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pair[0], now + pair[1]);
        g.gain.setValueAtTime(0.0001, now + pair[1]);
        g.gain.exponentialRampToValueAtTime(0.85, now + pair[1] + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + pair[1] + 0.10);
        osc.connect(g).connect(master);
        osc.start(now + pair[1]);
        osc.stop(now + pair[1] + 0.11);
      });
    } catch(e){ /* quiet — sound is bonus */ }
  }

  // ── Level-up chime: 3 ascending notes + a fifth-above ringer for sparkle.
  // Bigger, longer, more triumphant than the coin ping. Plays once when the
  // user crosses a tier boundary (event 'alexia-level-up' from token-system.js).
  function playLevelUp(){
    try {
      var ctx = ensureAudioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(_){} }
      var now = ctx.currentTime;
      var master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.14, now + 0.008);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      master.connect(ctx.destination);
      // Major triad arpeggio: C5 → E5 → G5 → C6 (ascending) + final C6+E6 chord
      // Square wave on chord for video-game "achievement unlocked" vibe.
      [[523.25,0,'triangle',0.18],
       [659.25,0.10,'triangle',0.18],
       [783.99,0.20,'triangle',0.20],
       [1046.50,0.30,'triangle',0.40],   // Sustained C6
       [1318.51,0.30,'square',0.35]      // E6 rings on top for sparkle
      ].forEach(function(p){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = p[2];
        osc.frequency.setValueAtTime(p[0], now + p[1]);
        g.gain.setValueAtTime(0.0001, now + p[1]);
        g.gain.exponentialRampToValueAtTime(0.7, now + p[1] + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + p[1] + p[3]);
        osc.connect(g).connect(master);
        osc.start(now + p[1]);
        osc.stop(now + p[1] + p[3] + 0.02);
      });
    } catch(e){ /* quiet — sound is bonus */ }
  }

  // Listen for tier change → play the level-up chime once.
  window.addEventListener('alexia-level-up', function(ev){
    var d = (ev && ev.detail) || {};
    playLevelUp();
    // Also surface a celebratory toast that lasts longer than a normal earn
    if (toastHost) {
      var el = document.createElement('div');
      el.className = 'twerkhub-tokens-toast twerkhub-tokens-toast--levelup';
      el.setAttribute('role', 'status');
      var label = String(d.to || '').toUpperCase();
      el.innerHTML =
        '<span class="twerkhub-tokens-toast-plus">★</span>' +
        '<span class="twerkhub-tokens-toast-body">' +
          '<span class="twerkhub-tokens-toast-title">LEVEL UP · ' + escapeHtml(label) + '</span>' +
          '<span class="twerkhub-tokens-toast-sub">New tier unlocked</span>' +
        '</span>';
      toastHost.appendChild(el);
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ el.classList.add('is-visible'); });
      });
      setTimeout(function(){
        el.classList.remove('is-visible');
        setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 400);
      }, 5200);
    }
  });

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
  // always match. Also sync across tabs (storage event) and on tab focus.
  function bindAlexiaSync(){
    try {
      // Same-tab broadcasts from token-system.js / setBalance / grant.
      window.addEventListener('alexia-tokens-changed', function(){
        render(); pulse();
      });
      // Cross-tab: another tab earned tokens → update this tab's HUD.
      // Also covers logout in another tab (key removed → balance=0).
      window.addEventListener('storage', function(ev){
        if (!ev.key) return;
        if (ev.key === ALEXIA_KEY || ev.key === 'alexia_tokens_v1.tier' || ev.key === 'alexia_current_user') {
          render();
        }
      });
      // Tab refocus — user might have earned tokens elsewhere or storage events
      // may have been throttled while the tab was backgrounded.
      window.addEventListener('focus', render);
      document.addEventListener('visibilitychange', function(){
        if (document.visibilityState === 'visible') render();
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
      //
      bindVideoListeners();
      bindAlexiaSync();
    } catch(e) {
      console.error('HUD error:', e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
