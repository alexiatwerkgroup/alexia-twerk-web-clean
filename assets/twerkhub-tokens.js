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
 * v20260424-p1
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

  function getTokens(){ return Number(lsGet(LS.TOKENS, 0)) || 0; }
  function setTokens(n){ lsSet(LS.TOKENS, Number(n) || 0); }

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
  function rewardIfNewPath(){
    var key = (location.pathname || '/') + (location.search || '');
    var seen = getSeenPaths();
    if (seen.indexOf(key) !== -1) return;
    seen.push(key);
    // Cap memory at 400 paths so localStorage never blows up.
    if (seen.length > 400) seen = seen.slice(-400);
    setSeenPaths(seen);

    var t = getTokens() + AWARD_PAGE;
    setTokens(t);
    render();
    pulse();
    var label = document.title.replace(/\s*·\s*Twerkhub.*$/,'').slice(0,42) || 'New page';
    showToast(AWARD_PAGE, 'New page discovered', label);
  }

  function rewardIfNewVid(vid){
    if (!vid) return;
    var seen = getSeenVids();
    if (seen.indexOf(vid) !== -1) return;
    seen.push(vid);
    if (seen.length > 800) seen = seen.slice(-800);
    setSeenVids(seen);

    var t = getTokens() + AWARD_VIDEO;
    setTokens(t);
    render();
    pulse();
    showToast(AWARD_VIDEO, 'Video unlocked', 'Preview · ' + vid.slice(0,10));
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

  // ── Init ─────────────────────────────────────────────────────────────────
  function init(){
    try {
      buildHud();
      render();
      // Award page visit on first landing (new paths only).
      // Slight delay so the HUD is mounted and the pulse animation registers.
      setTimeout(rewardIfNewPath, 700);
      bindVideoListeners();
      console.info('[twerkhub-tokens] ready · balance=', getTokens());
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
