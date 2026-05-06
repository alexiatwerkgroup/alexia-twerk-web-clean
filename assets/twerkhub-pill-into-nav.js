/* ═══ TWERKHUB · token pill → universal in-nav loader ═══
 * v20260506-p6
 *
 * Relocates .twerkhub-tokens-hud (created async by twerkhub-tokens.js)
 * INTO the flex row of nav-inner, RIGHT NEXT TO the LIVE pill. The
 * flex row already has align-items:center so the pill aligns with LIVE
 * automatically — no JS measurement, no math, no CSS top calculation.
 * Both pills sit in the same flex container so they CANNOT differ
 * vertically. Scroll-sticky is automatic because nav.twk-nav-v1 is
 * position:sticky.
 *
 * Idempotent. Re-checks on DOM mutations because tokens.js creates the
 * HUD lazily after page interactivity. Self-disconnects after success.
 */
(function(){
  'use strict';
  if (window.__twkPillIntoNavInit) return;
  window.__twkPillIntoNavInit = true;

  function relocate(){
    var pill = document.querySelector('.twerkhub-tokens-hud');
    if (!pill) return false;
    // Prefer placing right BEFORE the LIVE pill so order is:
    //   [logo] [...links...] [EN/ES/RU] [LIVE]  →  [logo] [...links...] [EN/ES/RU] [TOKENS] [LIVE]
    // If LIVE not found, fall back to the inner container's last position.
    var inner = document.querySelector('.twk-nav-v1 .twk-nav-v1-inner');
    var live  = document.querySelector('.twk-nav-v1-live, #twk-nav-v1-live');
    if (!inner) return false;
    if (pill.parentElement === inner) return true; // already placed
    pill.classList.add('twk-tk-hud--in-nav');
    if (live && live.parentElement === inner) {
      inner.insertBefore(pill, live);
    } else {
      inner.appendChild(pill);
    }
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
