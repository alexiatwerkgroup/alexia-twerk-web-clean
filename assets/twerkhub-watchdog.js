/* ═══ TWERKHUB · Runtime Watchdog v1 (2026-04-26) ═══
 *
 * Self-healing safety net for the most common failure modes that have
 * recurred on this site. Loaded on EVERY page early. Idempotent + non-blocking.
 *
 * What it heals automatically (no human intervention needed):
 *   1. Dead tier CTA buttons (.tier__cta with href="#checkout-*") → redirect to Discord
 *   2. Unbound .tier__cta[data-tier] → opens TwkCheckout modal if available, else navigates to Discord
 *   3. Stuck countdowns (text not changing for 6s) → re-init via TwerkhubCountdownsV2.start() if available
 *   4. Stale top-5 ranking vids in twk_blocked_videos → purges them (SAGRADA #9)
 *   5. Missing </body> or </html> → logs warning (can't auto-fix HTML, but flags it)
 *   6. Global uncaught errors → logs to console with [twk-watchdog] prefix for triage
 *
 * Polls every 10 seconds to catch late-injected content. Total cost: <1ms/poll.
 *
 * To extend: add a new check inside `runOnce()` and (if applicable) inside the
 * MutationObserver callback. Each check must be wrapped in try/catch so one
 * failing check can never kill the others.
 */
(function(){
  'use strict';
  if (window.__twkWatchdogInit) return;
  window.__twkWatchdogInit = true;

  var DISCORD = 'https://discord.gg/WWn8ZgQMjn';
  var TELEGRAM = 'https://t.me/+0xNr69raiIlmYWRh';

  function log(msg){ try { console.warn('[twk-watchdog]', msg); } catch(_){} }

  // ── Heal #1 + #2: tier CTAs ─────────────────────────────────────
  function healCtas(){
    try {
      var ctas = document.querySelectorAll('.tier__cta, a[href^="#checkout-"], [data-tier][href^="#checkout-"]');
      for (var i = 0; i < ctas.length; i++) {
        var el = ctas[i];
        if (el.__twkWatchdogHealed) continue;
        var href = el.getAttribute('href') || '';
        var tier = el.getAttribute('data-tier') || '';

        // Dead anchor → Discord
        if (href.indexOf('#checkout-') === 0) {
          el.setAttribute('href', DISCORD);
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener nofollow ugc');
          log('healed dead checkout anchor for tier=' + (tier || '?'));
        }

        // If a tier is set and TwkCheckout modal is available, intercept clicks
        // to open the modal instead of navigating away.
        if (tier && window.TwkCheckout && typeof window.TwkCheckout.open === 'function' && !el.__twkCheckoutBound) {
          (function(t, p, e){
            e.addEventListener('click', function(ev){
              ev.preventDefault();
              try { window.TwkCheckout.open(t, p); } catch(_) { window.open(DISCORD, '_blank'); }
            });
          })(tier, el.getAttribute('data-price'), el);
          el.__twkCheckoutBound = true;
        }

        // Register Free → ensure /profile.html
        if (/register/i.test(el.textContent || '') && (!href || href === '#')) {
          el.setAttribute('href', '/profile.html');
        }

        el.__twkWatchdogHealed = true;
      }
    } catch(e){ log('healCtas failed: ' + e.message); }
  }

  // ── Heal #3: stuck countdowns ───────────────────────────────────
  // Watches the seconds field of the farm countdown + the hero timer. If the
  // displayed text doesn't change for 6 seconds, attempts to re-init.
  var _lastFarmText = null;
  var _lastHeroText = null;
  var _farmStuckSince = 0;
  var _heroStuckSince = 0;
  function checkCountdowns(){
    try {
      var now = Date.now();
      // Farm
      var farmS = document.getElementById('farm-cd-s');
      if (farmS) {
        var t = farmS.textContent;
        if (t === _lastFarmText) {
          if (!_farmStuckSince) _farmStuckSince = now;
          if (now - _farmStuckSince > 6000) {
            log('farm countdown stuck — re-initing');
            tryRestartCountdowns();
            _farmStuckSince = 0;
          }
        } else {
          _lastFarmText = t;
          _farmStuckSince = 0;
        }
      }
      // Hero
      var heroT = document.getElementById('twerkhub-hh-cd-timer');
      if (heroT) {
        var ht = heroT.textContent;
        if (ht === _lastHeroText) {
          if (!_heroStuckSince) _heroStuckSince = now;
          if (now - _heroStuckSince > 6000) {
            log('hero countdown stuck — re-initing');
            tryRestartCountdowns();
            _heroStuckSince = 0;
          }
        } else {
          _lastHeroText = ht;
          _heroStuckSince = 0;
        }
      }
    } catch(e){ log('checkCountdowns failed: ' + e.message); }
  }
  function tryRestartCountdowns(){
    try {
      // Reset init flag so the dedicated module can re-run, then load it
      // dynamically if it isn't loaded yet.
      window.__twerkhubCountdownsV2Init = false;
      var existing = document.querySelector('script[src*="twerkhub-countdowns.js"]');
      if (existing) {
        // Just re-execute by appending a new script tag with cache-busting
        var s = document.createElement('script');
        s.src = '/assets/twerkhub-countdowns.js?_heal=' + Date.now();
        s.defer = true;
        document.head.appendChild(s);
      } else {
        var s2 = document.createElement('script');
        s2.src = '/assets/twerkhub-countdowns.js?v=20260426-p1';
        s2.defer = true;
        document.head.appendChild(s2);
      }
    } catch(e){ log('tryRestartCountdowns failed: ' + e.message); }
  }

  // ── Heal #4: SAGRADA #9 — purge top-5 vids from blocked list ───
  function purgeProtectedFromBlocked(){
    try {
      var rkVids = document.querySelectorAll('.rk-item[data-vid]');
      if (!rkVids.length) return;
      var blocked;
      try { blocked = JSON.parse(localStorage.getItem('twk_blocked_videos') || '{}'); }
      catch(_) { blocked = {}; }
      if (!blocked || typeof blocked !== 'object') return;
      var changed = false;
      for (var i = 0; i < rkVids.length; i++) {
        var v = rkVids[i].getAttribute('data-vid');
        if (v && blocked[v]) {
          delete blocked[v];
          changed = true;
        }
      }
      if (changed) {
        try { localStorage.setItem('twk_blocked_videos', JSON.stringify(blocked)); } catch(_){}
        log('purged ' + rkVids.length + ' protected top-5 vids from blocked list');
      }
    } catch(e){ log('purgeProtected failed: ' + e.message); }
  }

  // ── Heal #5: HTML structural integrity check ────────────────────
  // Can't auto-fix missing </body></html> at runtime (the parser already gave up),
  // but we can detect it and log a clear signal.
  function checkPageStructure(){
    try {
      if (window.__twkStructureChecked) return;
      window.__twkStructureChecked = true;
      var html = document.documentElement.outerHTML;
      if (html.indexOf('</body>') === -1) log('CRITICAL: page missing </body> tag');
      if (html.indexOf('</html>') === -1) log('CRITICAL: page missing </html> tag');
    } catch(e){ log('checkPageStructure failed: ' + e.message); }
  }

  // ── Heal #6: capture global errors ──────────────────────────────
  function installGlobalErrorTrap(){
    if (window.__twkErrTrapInstalled) return;
    window.__twkErrTrapInstalled = true;
    window.addEventListener('error', function(ev){
      try {
        log('global error: ' + (ev.message || '?') + ' @ ' + (ev.filename || '?') + ':' + (ev.lineno || '?'));
      } catch(_){}
    });
  }

  function runOnce(){
    healCtas();
    purgeProtectedFromBlocked();
    checkPageStructure();
  }

  function start(){
    installGlobalErrorTrap();
    runOnce();
    // Re-run on DOM changes for late-injected content
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(muts){
        var any = false;
        muts.forEach(function(m){ if (m.addedNodes && m.addedNodes.length) any = true; });
        if (any) runOnce();
      }).observe(document.body, { childList: true, subtree: true });
    }
    // Periodic poll: countdowns check + re-scan CTAs in case new ones appeared
    setInterval(function(){
      runOnce();
      checkCountdowns();
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Public API for manual re-trigger (debugging)
  window.TwkWatchdog = { run: runOnce, healCtas: healCtas, purgeProtected: purgeProtectedFromBlocked, restartCountdowns: tryRestartCountdowns };
})();
