/* ═══ TWERKHUB · token pill → into nav (universal) ═══
 * v20260505-p1
 *
 * Relocates the floating .twerkhub-tokens-hud (created async by
 * twerkhub-tokens.js) INTO the sticky nav as the last flex item, so the
 * pill lives in ONE position across every page on the site:
 *   - same vertical height as the LIVE indicator (flex align-items center)
 *   - flush against the right edge (nav-inner padding reduced by ph-theme)
 *   - sticky together with the nav (inherited)
 *
 * Activates on every page that has body.twerkhub-ph-theme (now applied site-
 * wide by apply-ph-theme-everywhere.py). Idempotent. Self-disconnects after
 * relocation or 8s timeout to avoid leaking observers.
 */
(function(){
  'use strict';
  if (window.__twkPillIntoNavInit) return;
  window.__twkPillIntoNavInit = true;

  function relocate(){
    if (!document.body || !document.body.classList.contains('twerkhub-ph-theme')) return false;
    var pill = document.querySelector('.twerkhub-tokens-hud');
    // 2026-05-05: append to .twk-nav-v1 (the outer sticky nav) instead of
    // .twk-nav-v1-inner. The inner has max-width:1480px which left a visible
    // gap on wide screens (>1480px). The outer fills the full viewport, so
    // a position:absolute right:6px places the pill flush against the screen
    // edge on every monitor size.
    var nav  = document.querySelector('.twk-nav-v1');
    if (!pill || !nav) return false;
    if (pill.parentElement === nav) return true;
    pill.classList.add('twk-tk-hud--in-nav');
    nav.appendChild(pill);
    return true;
  }

  function arm(){
    if (relocate()) return;
    var obs = new MutationObserver(function(){
      if (relocate()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function(){ obs.disconnect(); }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
})();
