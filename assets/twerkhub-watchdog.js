/* â•â•â• TWERKHUB Â· Runtime Watchdog v1 (2026-04-26) â•â•â•
 *
 * Self-healing safety net for the most common failure modes that have
 * recurred on this site. Loaded on EVERY page early. Idempotent + non-blocking.
 *
 * What it heals automatically (no human intervention needed):
 *   1. Dead tier CTA buttons (.tier__cta with href="#checkout-*") â†’ redirect to Discord
 *   2. Unbound .tier__cta[data-tier] â†’ opens TwkCheckout modal if available, else navigates to Discord
 *   3. Stuck countdowns (text not changing for 6s) â†’ re-init via TwerkhubCountdownsV2.start() if available
 *   4. Stale top-5 ranking vids in twk_blocked_videos â†’ purges them (SAGRADA #9)
 *   5. Missing </body> or </html> â†’ logs warning (can't auto-fix HTML, but flags it)
 *   6. Global uncaught errors â†’ logs to console with [twk-watchdog] prefix for triage
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

  // â”€â”€ Heal #1 + #2: tier CTAs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function healCtas(){
    try {
      // ALSO heal any <button> with TwerkhubAuthPatch onclick (legacy dead handler)
      var deadButtons = document.querySelectorAll('button[onclick*="TwerkhubAuthPatch"]');
      for (var j = 0; j < deadButtons.length; j++) {
        var b = deadButtons[j];
        if (b.__twkWatchdogHealed) continue;
        b.removeAttribute('onclick');
        // Detect tier from button text for proper data-tier
        var t = (b.textContent || '').toLowerCase();
        var detectedTier = t.indexOf('medium') >= 0 ? 'medium'
                         : t.indexOf('premium') >= 0 ? 'premium'
                         : t.indexOf('vip') >= 0 ? 'vip-top'
                         : '';
        b.addEventListener('click', function(ev){
          ev.preventDefault();
          window.open(DISCORD, '_blank', 'noopener');
        });
        b.__twkWatchdogHealed = true;
        log('healed dead TwerkhubAuthPatch button (tier=' + (detectedTier||'?') + ')');
      }
      var ctas = document.querySelectorAll('.tier__cta, a[href^="#checkout-"], [data-tier][href^="#checkout-"]');
      for (var i = 0; i < ctas.length; i++) {
        var el = ctas[i];
        if (el.__twkWatchdogHealed) continue;
        var href = el.getAttribute('href') || '';
        var tier = el.getAttribute('data-tier') || '';

        // Dead anchor â†’ Discord
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

        // Register Free â†’ ensure /profile.html
        if (/register/i.test(el.textContent || '') && (!href || href === '#')) {
          el.setAttribute('href', '/profile.html');
        }

        el.__twkWatchdogHealed = true;
      }
    } catch(e){ log('healCtas failed: ' + e.message); }
  }

  // â”€â”€ Heal #3: stuck countdowns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            log('farm countdown stuck â€” re-initing');
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
            log('hero countdown stuck â€” re-initing');
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

  // â”€â”€ Heal #4: SAGRADA #9 â€” purge top-5 vids from blocked list â”€â”€â”€
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

  // â”€â”€ Heal #5: HTML structural integrity check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  function installGlobalErrorTrap(){
    if (window.__twkErrTrapInstalled) return;
    window.__twkErrTrapInstalled = true;
    window.addEventListener('error', function(ev){
      try { log('global error: ' + (ev.message || '?') + ' @ ' + (ev.filename || '?') + ':' + (ev.lineno || '?')); } catch(_){}
    });
  }

  // â”€â”€ Heal #7: auto-load checkout modal module on pages that need it â”€â”€
  function ensureCheckoutModalLoaded(){
    if (window.__twkCheckoutModalLoaderRan) return;
    var hasTierCta = document.querySelector('.tier__cta[data-tier]');
    if (!hasTierCta) return;
    if (window.TwkCheckout && typeof window.TwkCheckout.open === 'function') {
      window.__twkCheckoutModalLoaderRan = true;
      return;
    }
    if (document.querySelector('script[src*="twerkhub-checkout-modal"]')) return;
    window.__twkCheckoutModalLoaderRan = true;
    var s = document.createElement('script');
    s.src = '/assets/twerkhub-checkout-modal.js?v=20260426-p2';
    s.defer = true;
    document.head.appendChild(s);
    log('auto-loaded checkout modal module');
  }

  // ── Heal #8: fresh state on user change ─────────────────────────
  // When a NEW user logs in (different from the last seen user),
  // wipe per-user UI state so they start with 0 viewed videos.
  // Also wipes blocked videos cache so old +18 detections don't carry over.
  function freshOnUserChange(){
    try {
      var raw = localStorage.getItem('alexia_current_user') || sessionStorage.getItem('alexia_current_user');
      var currentId = '';
      if (raw && raw !== 'null') {
        try { var u = JSON.parse(raw); currentId = (u && (u.id || u.email || u.username)) || ''; } catch(_){}
      }
      var lastId = localStorage.getItem('__twk_last_user_id') || '';
      if (currentId !== lastId) {
        // User changed (login, logout, or different account). Wipe per-user UI state.
        var wipeKeys = [
          'twk_viewed_videos',
          'twk_blocked_videos',
          'twk_watch_seconds_total',
          'twk_favorites',
          'twk_models_followed',
          'twk_heatmap',
          'twk_drop_endstamp_v1',
          'twerkhub_tokens_seen_paths',
          'twerkhub_tokens_seen_vids'
        ];
        for (var i = 0; i < wipeKeys.length; i++) {
          try { localStorage.removeItem(wipeKeys[i]); } catch(_){}
        }
        // Wipe any keys with these prefixes too
        try {
          var toDel = [];
          for (var k = 0; k < localStorage.length; k++) {
            var key = localStorage.key(k);
            if (key && (key.indexOf('twk_drop_endstamp_v1_') === 0 || key.indexOf('twk_view_') === 0)) toDel.push(key);
          }
          for (var d = 0; d < toDel.length; d++) localStorage.removeItem(toDel[d]);
        } catch(_){}
        localStorage.setItem('__twk_last_user_id', currentId);
        log('user changed (' + (lastId || 'guest') + ' -> ' + (currentId || 'guest') + '): wiped per-user UI state');
        // Force-remove any .twk-viewed / .twk-blocked classes already on the page
        try {
          var els = document.querySelectorAll('.twk-viewed, .twk-blocked');
          for (var e = 0; e < els.length; e++) {
            els[e].classList.remove('twk-viewed', 'twk-blocked');
            var bdg = els[e].querySelector(':scope > .twk-viewed-badge, :scope > .twk-blocked-badge, :scope > .twk-blocked-lock');
            while (bdg) { bdg.remove(); bdg = els[e].querySelector(':scope > .twk-viewed-badge, :scope > .twk-blocked-badge, :scope > .twk-blocked-lock'); }
          }
        } catch(_){}
      }
    } catch(e){ log('freshOnUserChange failed: ' + e.message); }
  }
  function runOnce(){
    freshOnUserChange();
    healCtas();
    purgeProtectedFromBlocked();
    checkPageStructure();
    ensureCheckoutModalLoaded();
  }

  function start(){
    installGlobalErrorTrap();
    runOnce();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(muts){
        var any = false;
        muts.forEach(function(m){ if (m.addedNodes && m.addedNodes.length) any = true; });
        if (any) runOnce();
      }).observe(document.body, { childList: true, subtree: true });
    }
    setInterval(function(){ runOnce(); checkCountdowns(); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.TwkWatchdog = { run: runOnce, healCtas: healCtas, purgeProtected: purgeProtectedFromBlocked, restartCountdowns: tryRestartCountdowns };
})();
