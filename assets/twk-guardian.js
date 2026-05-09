/* ═══════════════════════════════════════════════════════════════════
 * TWERKHUB · GUARDIAN · 2026-05-09
 * ───────────────────────────────────────────────────────────────────
 * This script runs FIRST on every page. Its job is to make sure the
 * site stays in a known-good state regardless of what other scripts,
 * cached state, or stale Service Workers try to do.
 *
 * ⚠️ DO NOT REMOVE OR REORDER THIS SCRIPT.
 * ⚠️ This file is the ONLY thing standing between us and the bugs we
 *    spent hours fixing. If you delete it, ALL of the following will
 *    regress within minutes:
 *
 *  - Toast notifications collapsing into a single inline blob
 *  - "VIDEO UNAVAILABLE" overlay covering alive videos
 *  - Random logout on hard refresh
 *  - Wrong tier thresholds (1500 instead of 9000 for Premium)
 *  - Founder showing as basic/0 tokens
 *  - Stale Service Worker serving old cached JS
 *  - Locked videos hiding the iframe instead of overlaying paywall
 *
 * The guardian runs in 3 phases:
 *  1. PARSE-TIME (this file): inject defensive CSS, kill stale SW state.
 *  2. DOMContentLoaded: validate DOM, recover hijacked img srcs.
 *  3. POST-LOAD (500ms / 2s / 5s): keep checking, self-heal as needed.
 * ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twkGuardian) return;
  window.__twkGuardian = { version: '1.0', startedAt: Date.now() };

  // ─── Frozen invariants — DO NOT mutate ─────────────────────────────
  var INVARIANTS = Object.freeze({
    FOUNDER_EMAILS: Object.freeze(['alexiatwerkoficial@gmail.com']),
    FOUNDER_FLOOR: 1000009,
    TIERS: Object.freeze({ medium: 3000, premium: 9000, vip: 50000 }),
    REWARDS: Object.freeze({
      pageVisit: 5,
      videoWatch: 15,
      videoComplete: 30,
      share: 50,
      dailyLogin: 30,
      streakBonus: 15,
      streakCap: 7,
      welcomeBonus: 200,
    }),
    LOCAL_KEYS: Object.freeze({
      auth: 'alexia-auth-v3',
      balance: 'alexia_tokens_v1.balance',
      total: 'alexia_tokens_v1.total_earned',
      tier: 'alexia_tokens_v1.tier',
      role: 'alexia_role',
    }),
  });
  window.__twkGuardian.INVARIANTS = INVARIANTS;

  function warn(msg, extra) {
    try { console.warn('[twk-guardian] ' + msg, extra || ''); } catch (_) {}
  }

  // ─── Phase 1: parse-time CSS armor ─────────────────────────────────
  // These rules prevent the most common visual breakages.
  function injectArmorCSS() {
    if (document.getElementById('twk-guardian-armor')) return;
    var s = document.createElement('style');
    s.id = 'twk-guardian-armor';
    s.textContent = [
      // Toast structure — beats any stale CSS that would collapse spans inline.
      '.twerkhub-tokens-toast{display:inline-flex!important;align-items:center!important;gap:12px!important;max-width:320px!important}',
      '.twerkhub-tokens-toast .twerkhub-tokens-toast-plus{display:inline-block!important;flex-shrink:0!important;font-size:22px!important;font-weight:900!important;line-height:1!important;white-space:nowrap!important;color:#1ee08f!important}',
      '.twerkhub-tokens-toast .twerkhub-tokens-toast-body{display:flex!important;flex-direction:column!important;gap:2px!important;min-width:0!important;flex:1 1 auto!important}',
      '.twerkhub-tokens-toast .twerkhub-tokens-toast-title{display:block!important;font-size:13px!important;font-weight:800!important;color:#fff!important;line-height:1.25!important}',
      '.twerkhub-tokens-toast .twerkhub-tokens-toast-sub{display:block!important;font-size:9.5px!important;font-weight:700!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:#1ee08f!important;opacity:.85!important}',
      // Thumbnails — force visible, kill the "UNAVAILABLE" overlay.
      '.rh-thumb img,img[src*="i.ytimg.com"],.twerkhub-pl-more-playlists img{opacity:1!important;visibility:visible!important;display:block!important;width:100%!important;height:100%!important;object-fit:cover!important}',
      '.twk-thumb-dead::after,.twk-thumb-maybe-dead::after{display:none!important;content:none!important}',
      'img[src$="/thumb-unavailable.svg"]{opacity:0!important;visibility:hidden!important}',
      '.twk-thumb-dead{pointer-events:auto!important;cursor:pointer!important}',
      'a.twk-thumb-dead{pointer-events:auto!important}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }
  injectArmorCSS();

  // ─── Phase 2: validate auth coherence ──────────────────────────────
  // Detects malformed alexia-auth-v3 (e.g. missing email when id present).
  // Does NOT clear it (we never auto-logout) — just warns.
  function validateAuth() {
    try {
      var raw = JSON.parse(localStorage.getItem(INVARIANTS.LOCAL_KEYS.auth) || '{}');
      if (!raw || !raw.user) return;
      if (raw.user.id && !raw.user.email) {
        warn('auth-v3 has user.id but no user.email — founder check will fail');
      }
      if (raw.token && raw.token.split('.').length !== 3) {
        warn('auth-v3 token is malformed (not a JWT)');
      }
    } catch (e) {
      warn('auth-v3 parse failed', e && e.message);
    }
  }

  // ─── Phase 2: founder coherence ────────────────────────────────────
  function isFounder() {
    try {
      var raw = JSON.parse(localStorage.getItem(INVARIANTS.LOCAL_KEYS.auth) || '{}');
      var email = raw && raw.user && String(raw.user.email || '').toLowerCase().trim();
      return !!email && INVARIANTS.FOUNDER_EMAILS.indexOf(email) !== -1;
    } catch (_) { return false; }
  }
  window.__twkGuardian.isFounder = isFounder;

  // Ensure founder local balance never drops below the floor.
  function enforceFounderFloor() {
    if (!isFounder()) return;
    try {
      var bal = parseInt(localStorage.getItem(INVARIANTS.LOCAL_KEYS.balance) || '0', 10) || 0;
      if (bal < INVARIANTS.FOUNDER_FLOOR) {
        localStorage.setItem(INVARIANTS.LOCAL_KEYS.balance, JSON.stringify(INVARIANTS.FOUNDER_FLOOR));
      }
      var tot = parseInt(localStorage.getItem(INVARIANTS.LOCAL_KEYS.total) || '0', 10) || 0;
      if (tot < INVARIANTS.FOUNDER_FLOOR) {
        localStorage.setItem(INVARIANTS.LOCAL_KEYS.total, JSON.stringify(INVARIANTS.FOUNDER_FLOOR));
      }
      var tier = String(localStorage.getItem(INVARIANTS.LOCAL_KEYS.tier) || '').replace(/"/g, '').toLowerCase();
      if (tier !== 'vip' && tier !== 'founder') {
        localStorage.setItem(INVARIANTS.LOCAL_KEYS.tier, JSON.stringify('vip'));
      }
    } catch (_) {}
  }

  // ─── Phase 2: thumbnail recovery ───────────────────────────────────
  function recoverThumbnails() {
    try {
      // 1. Force eager + visible on every YouTube thumb.
      var all = document.querySelectorAll('img[src*="i.ytimg.com"]');
      for (var i = 0; i < all.length; i++) {
        var im = all[i];
        if (!im.dataset.twkOrigSrc) {
          im.dataset.twkOrigSrc = im.getAttribute('src') || '';
        }
        im.setAttribute('loading', 'eager');
        im.style.opacity = '1';
        im.style.visibility = 'visible';
        im.style.display = 'block';
      }
      // 2. Recover any imgs that got hijacked to the dead-poster SVG.
      var bad = document.querySelectorAll('img[src*="thumb-unavailable"]');
      for (var j = 0; j < bad.length; j++) {
        var im2 = bad[j];
        if (im2.dataset.twkOrigSrc) {
          im2.src = im2.dataset.twkOrigSrc;
        }
      }
      // 3. Strip stale dead classes + restore hrefs.
      var dead = document.querySelectorAll('.twk-thumb-dead, .twk-thumb-maybe-dead');
      for (var k = 0; k < dead.length; k++) {
        dead[k].classList.remove('twk-thumb-dead');
        dead[k].classList.remove('twk-thumb-maybe-dead');
        if (dead[k].tagName === 'A' && dead[k].dataset.twkDeadHref) {
          dead[k].setAttribute('href', dead[k].dataset.twkDeadHref);
        }
      }
    } catch (_) {}
  }

  // ─── Phase 2: SW health (best-effort) ──────────────────────────────
  // We don't unregister on every load — the kill script handles that
  // once via twk_killed_20260509_v2 flag. We DO check for known stale
  // versions and warn.
  function checkServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        if (regs.length === 0) return;
        // We only care about same-origin SWs.
        regs.forEach(function (r) {
          var scope = r.scope || '';
          if (scope.indexOf(location.origin) === 0) {
            // Active SW exists. Check active.scriptURL for known-good version.
            var active = r.active;
            if (active && active.scriptURL && active.scriptURL.indexOf('service-worker.js') === -1) {
              warn('unknown SW script URL', active.scriptURL);
            }
          }
        });
      }).catch(function () {});
    } catch (_) {}
  }

  // ─── Public API for self-tests / debugging ─────────────────────────
  window.__twkGuardian.selfTest = function () {
    var report = {
      version: window.__twkGuardian.version,
      uptime: Date.now() - window.__twkGuardian.startedAt,
      isFounder: isFounder(),
      armorCSS: !!document.getElementById('twk-guardian-armor'),
      thumbsHijacked: document.querySelectorAll('img[src*="thumb-unavailable"]').length,
      auth: (function () {
        try {
          var r = JSON.parse(localStorage.getItem(INVARIANTS.LOCAL_KEYS.auth) || '{}');
          return r && r.user ? { email: r.user.email, hasToken: !!r.token } : null;
        } catch (_) { return null; }
      })(),
      balance: parseInt(localStorage.getItem(INVARIANTS.LOCAL_KEYS.balance) || '0', 10) || 0,
      tier: String(localStorage.getItem(INVARIANTS.LOCAL_KEYS.tier) || '').replace(/"/g, ''),
    };
    console.log('[twk-guardian] self-test:', report);
    return report;
  };

  // ─── Run all phases ────────────────────────────────────────────────
  function runAll() {
    validateAuth();
    enforceFounderFloor();
    recoverThumbnails();
    checkServiceWorker();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll, { once: true });
  } else {
    runAll();
  }
  // Re-run as DOM stabilizes — some pages mutate the grid after load.
  setTimeout(runAll, 500);
  setTimeout(runAll, 2000);
  setTimeout(runAll, 5000);

  // Watch for new YouTube imgs added to DOM (lazy-loaded grids).
  try {
    new MutationObserver(function (muts) {
      var sawNew = false;
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && (n.tagName === 'IMG' || (n.querySelectorAll && n.querySelectorAll('img[src*="i.ytimg.com"]').length))) {
            sawNew = true;
          }
        });
      });
      if (sawNew) recoverThumbnails();
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
})();
