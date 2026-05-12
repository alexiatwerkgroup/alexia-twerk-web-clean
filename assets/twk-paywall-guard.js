/* TWERKHUB · twk-paywall-guard · 2026-05-11 v1
 * ─────────────────────────────────────────────────────────────────
 * Auto-detects YouTube embeds + thumbnails on the page, cross-references
 * each video ID against `youtube-age-classification.json`, and:
 *   - Blocks iframes for videos marked "blocked" (age-restricted on YT).
 *   - Adds a "🔒 18+" badge on thumbnail tiles that point to blocked videos.
 *   - Skips bypass entirely for members (founder / premium / vip).
 *
 * This is the standalone version that does NOT require the page to have
 * pre-marked `.vd-player.vd-locked` markup. It works on any page that
 * embeds YouTube via <iframe src="...youtube.com/embed/ID..."> or has
 * thumbnail links with `data-vid="ID"`.
 *
 * Members (founder, premium, vip) bypass the overlay automatically — the
 * iframe plays unmodified for them.
 * ─────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__twkPaywallGuard) return;
  window.__twkPaywallGuard = true;

  var CLASSIFICATION_URL = '/assets/youtube-age-classification.json';
  var FOUNDER_EMAIL = 'alexiatwerkoficial@gmail.com';

  // ─────────────────────────────────────────────────────────────────
  // ⚠️ PAYWALL · PATH-SCOPED — 2026-05-12
  //
  // The paywall is ACTIVE only on the 5 canonical playlist directories
  // (and their child individual-video pages under /playlist/*). Every
  // other surface — the 162 recently-created pages we still want Google
  // to (re)index cleanly (the /pt/ tree, blog, creator profiles, recovered
  // legacy pages, etc.) — has the paywall disabled to avoid cloaking/soft-404
  // signals during the indexing window.
  //
  // Once GSC confirms the 162 pages are indexed, expand PAYWALL_PATHS to
  // include those surfaces too (or set PAYWALL_GLOBAL = true to enable
  // everywhere).
  // ─────────────────────────────────────────────────────────────────
  var PAYWALL_GLOBAL = false;           // set true to force-enable everywhere
  var PAYWALL_PATHS = [
    '/twerk-hub-leaks/',
    '/hottest-cosplay-fancam/',
    '/korean-girls-kpop-twerk/',
    '/try-on-hot-leaks/',
    '/sav-twerk-playlist/',
    '/playlist/'                        // individual video pages inside the 5 main playlists
  ];
  var __path = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
  var PAYWALL_ENABLED = PAYWALL_GLOBAL || PAYWALL_PATHS.some(function (p) { return __path.indexOf(p) === 0; });
  if (!PAYWALL_ENABLED) {
    try { console.log('[twk-paywall-guard] paywall off for this path (' + __path + ') — only active on 5 main playlists + /playlist/*'); } catch (_) {}
    return;
  }
  try { console.log('[twk-paywall-guard] paywall ACTIVE on ' + __path); } catch (_) {}

  // ⚡ Googlebot / search crawler whitelist (defense in depth)
  // Even when paywall is enabled, bots should never see the overlay.
  // window.__twkIsBot is set by /assets/twk-bot-detect.js (must load FIRST).
  if (typeof window !== 'undefined' && window.__twkIsBot) {
    try { console.log('[twk-paywall-guard] bot detected (' + (window.__twkBotName || '?') + ') — paywall skipped'); } catch (_) {}
    return;
  }

  function isMember() {
    try {
      // Founder by email (most reliable signal)
      var auth = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}');
      var email = auth && auth.user && String(auth.user.email || '').toLowerCase().trim();
      if (email === FOUNDER_EMAIL) return true;

      // Tier check from twk-tokens-v3 storage
      var tier = String(
        localStorage.getItem('alexia_tokens_v1.tier') ||
        localStorage.getItem('twk_tier') ||
        ''
      ).replace(/"/g, '').toLowerCase().trim();
      if (tier === 'vip' || tier === 'premium') return true;

      // Legacy role key (kept for backward compat, but only as one signal)
      var role = String(localStorage.getItem('alexia_role') || '').replace(/"/g, '').toLowerCase();
      if (role === 'founder') return true;
    } catch (_) {}
    return false;
  }

  function extractVideoId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:embed|watch\?v=|youtu\.be\/)\/?([\w-]{11})/);
    return m ? m[1] : null;
  }

  function applyIframePaywall(iframe, vid) {
    var parent = iframe.parentElement;
    if (!parent) return;
    if (parent.querySelector('.twk-paywall-overlay')) return; // already applied
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

    iframe.setAttribute('data-twk-blocked', vid);
    iframe.style.opacity = '0.15';
    iframe.style.pointerEvents = 'none';
    iframe.removeAttribute('allow'); // strip autoplay perms while blocked

    var overlay = document.createElement('div');
    overlay.className = 'twk-paywall-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Premium content paywall');
    overlay.style.cssText =
      'position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.96));' +
      'display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;' +
      'color:#fff;z-index:20;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;' +
      'box-sizing:border-box;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);';
    overlay.innerHTML =
      '<div style="font-size:42px;margin-bottom:10px;line-height:1;">🔒</div>' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:6px;">Premium · 18+ content</div>' +
      '<div style="font-size:13px;opacity:.85;margin-bottom:18px;max-width:380px;line-height:1.5;">' +
        'This video is age-restricted on YouTube. Become a Twerkhub member to verify and watch without leaving the site.' +
      '</div>' +
      '<a href="/membership.html" style="background:#ffd700;color:#000;padding:10px 24px;border-radius:6px;font-weight:700;text-decoration:none;font-size:14px;letter-spacing:.3px;">Become a member</a>' +
      '<a href="/account.html" style="color:#ccc;margin-top:12px;font-size:12px;text-decoration:underline;">Already a member? Sign in</a>';
    parent.appendChild(overlay);
  }

  function applyThumbBadge(el) {
    if (!el || el.querySelector('.twk-paywall-badge')) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var badge = document.createElement('span');
    badge.className = 'twk-paywall-badge';
    badge.setAttribute('aria-label', 'Premium 18+ content');
    badge.style.cssText =
      'position:absolute;top:6px;right:6px;background:rgba(0,0,0,.85);color:#ffd700;' +
      'padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.5px;' +
      'z-index:9;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;';
    badge.textContent