/* ═══ TWERKHUB · token pill → universal in-nav loader ═══
 * v20260506-p2
 *
 * Relocates .twerkhub-tokens-hud (created async by twerkhub-tokens.js)
 * into the OUTER <nav class="twk-nav-v1"> on every page so the pill
 * always sits at the screen's right edge, vertically centered with
 * LIVE / EN-ES-RU buttons. Idempotent. Re-checks on DOM mutations
 * because tokens.js creates the HUD lazily after page interactivity.
 *
 *   - Targets the OUTER nav (full viewport span), not .twk-nav-v1-inner
 *     (which has max-width:1480px → leaves gap on wide screens).
 *   - Adds class `.twk-tk-hud--in-nav` so ph-theme.css can position it
 *     absolute right:6px top:50% translateY(-50%).
 *   - Self-disconnects after success or 10s timeout to avoid leaks.
 */
(function(){
  'use strict';
  if (window.__twkPillIntoNavInit) return;
  window.__twkPillIntoNavInit = true;

  function relocate(){
    var pill = document.querySelector('.twerkhub-tokens-hud');
    var nav  = document.querySelector('nav.twk-nav-v1');
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
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(function(){ obs.disconnect(); }, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
})();
