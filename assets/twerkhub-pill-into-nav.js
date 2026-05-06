/* ═══ TWERKHUB · token pill → universal in-nav loader ═══
 * v20260506-p4
 *
 * Relocates .twerkhub-tokens-hud (created async by twerkhub-tokens.js)
 * into the OUTER <nav class="twk-nav-v1"> on every page so the pill
 * lives next to LIVE / EN-ES-RU buttons. Then MEASURES the LIVE pill's
 * actual rendered position and pins TOKENS to the exact same vertical
 * center via inline style — bypasses all CSS / cache / font-rendering
 * variation between browsers.
 *
 *   - Pill stays position:fixed (sticky to viewport) but top is set in
 *     JS based on LIVE.getBoundingClientRect() so alignment is pixel-
 *     perfect on every page regardless of nav height differences.
 *   - Re-measures on resize (font reflow, nav wrapping) so alignment
 *     survives responsive breakpoints.
 *   - Idempotent. Self-disconnects after success or 10s timeout.
 */
(function(){
  'use strict';
  if (window.__twkPillIntoNavInit) return;
  window.__twkPillIntoNavInit = true;

  function alignToLive(){
    var pill = document.querySelector('.twerkhub-tokens-hud');
    var live = document.querySelector('.twk-nav-v1-live, #twk-nav-v1-live');
    if (!pill || !live) return false;
    try {
      var lr = live.getBoundingClientRect();
      var pillH = pill.offsetHeight || 28;
      // y of LIVE pill's vertical center, relative to viewport
      var liveCenterY = lr.top + (lr.height / 2);
      // Pill is height-locked to ~28px and uses translateY(-50%) so its
      // visual center sits at `top:N` where N = liveCenterY (after the
      // -50% transform pulls it up by half its own height).
      pill.style.setProperty('position', 'fixed',  'important');
      pill.style.setProperty('top',      liveCenterY + 'px', 'important');
      pill.style.setProperty('right',    '14px',   'important');
      pill.style.setProperty('bottom',   'auto',   'important');
      pill.style.setProperty('left',     'auto',   'important');
      pill.style.setProperty('transform','translateY(-50%)', 'important');
      pill.style.setProperty('height',   pillH + 'px', 'important');
      pill.classList.add('twk-tk-hud--in-nav');
    } catch(e){ return false; }
    return true;
  }

  function arm(){
    if (alignToLive()) {
      // Re-align on viewport resize / font reflow.
      var t = null;
      window.addEventListener('resize', function(){
        if (t) clearTimeout(t);
        t = setTimeout(alignToLive, 80);
      }, { passive: true });
      return;
    }
    var obs = new MutationObserver(function(){
      if (alignToLive()) {
        obs.disconnect();
        var t = null;
        window.addEventListener('resize', function(){
          if (t) clearTimeout(t);
          t = setTimeout(alignToLive, 80);
        }, { passive: true });
      }
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
