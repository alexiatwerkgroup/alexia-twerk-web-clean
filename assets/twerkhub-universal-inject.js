/* ═══ TWERKHUB · UNIVERSAL TOPBAR INJECTOR ═══
 * v20260424-p8
 *
 * Purpose: ONE script to ensure every page in the platform — regardless of
 * whether someone edited it manually or it was auto-generated months ago —
 * renders the unified twerkhub-topbar with:
 *   - Brand + hover-zoom logo
 *   - Full nav (8 items including Hot Packs)
 *   - Live "online now" pill (breathing, 300–500 range)
 *   - Locale switcher EN · ES · RU
 *   - Token HUD on the right
 *
 * Strategy: self-bootstrap. If this script is loaded on a page that already
 * has the proper `.twerkhub-topbar` markup, it's a no-op. If the page has
 * legacy nav shapes (`.site-nav-final`, `.snf`, `[data-alexia-online-count]`,
 * etc.), they get ripped out first and the new topbar is injected at the top
 * of <body>. Then all dependent CSS/JS are lazy-loaded in the right order.
 *
 * Idempotent. Safe to include twice. Loads ONLY what's missing.
 *
 * Typical deploy: the Service Worker rewrites every HTML response so the
 * very last thing before </body> is a <script src=".../twerkhub-universal-
 * inject.js"></script>. No need to edit 640+ individual HTML files.
 */
(function(){
  'use strict';
  if (window.__twerkhubUniversalInjectInit) return;
  window.__twerkhubUniversalInjectInit = true;

  var ASSET_BASE = '/assets/';
  var VER = { tokens:'20260424-p11', topbar:'20260424-p8', locale:'20260424-p5',
              mobile:'20260424-p1', sound:'20260424-p7', premium:'20260424-p5',
              page:'20260424-p13', polish:'20260424-p4', auth:'20260424-p4',
              tokens_css:'20260424-p1', a11y:'20260424-p4',
              elevation:'20260424-p2', cursor:'20260424-p1',
              share:'20260424-p1', vitals:'20260424-p1' };
  // premium.js + premium.css share the same 'premium' version key; bumped
  // to p6 for the scroll-reveal rootMargin fix (playlist grids no longer
  // wait for viewport to unhide). sound bumped to p8 for auto-unmute on
  // first gesture. paywall bumped for /playlist/ kill-switch.
  VER.premium = '20260424-p6';
  VER.sound = '20260424-p8';

  // ── 1 · Remove legacy nav markup ─────────────────────────────────────
  // The platform accumulated three generations of topbars over the years.
  // Anything NOT `.twerkhub-topbar` is history — delete on sight.
  function purgeLegacyNav(){
    var selectors = [
      '.site-nav-final',                // 2024 generation full bar
      '.snf',                            // 2025 generation full bar
      '.alexia-nav',                    // older catalog-page nav
      '.alexia-top-nav',                // even older catalog nav
      '.alexia-global-nav',             // alexia-unify.js legacy 2023 nav (Home/Playlist/Community/Top100/…)
      '.alexia-global-nav__inner',
      '.alexia-online-pill',
      '.twerkhub-pl-topbar',            // ← legacy static topbar hardcoded in /playlist/*.html pages
                                        //   (7 links: Home/Exclusive/Playlists/Top100/Community/Tokens/Profile)
                                        //   stacks underneath the SAGRADA .twerkhub-topbar — the "2da botonera cutre"
      '.twerkhub-pl-topbar-inner',
      '#alexia-global-brand',           // global-brand.js injected logo row
      '#alexia-global-counters',        // global-counters.js token pill
      '[data-alexia-online-count]',    // the "891 online" / "ONLINE NOW 1" badge
      '.snf__on',
      '#snf-music-btn',
      '.site-nav-final__online',
      '.site-nav-final__music',
      '.atk-widget',                    // token-system.js's own gold "TOKENS" widget
      '.analytics-profile-nav',         // /analytics-profile.js injected nav
      // Legacy locale switchers (global-i18n.js dropped these before topbar-
      // enhance.js mounted its own slot, causing duplicates on /profile etc.)
      '.alexia-i18n-switcher:not(.twerkhub-locale-slot *)',
      '#alexia-i18n-root',
      '.alexia-legacy-locale',
      '.alexia-lang-switch',
      // BLUR OVERLAYS — any leftover backdrop from older auth/age-gate versions.
      // If the user is currently NOT on the portal root, no blocking modal
      // should exist anywhere. Nuke them. This is the emergency blur kill-
      // switch users have been asking for.
      '#alexia-age-gate:not([data-user-opened])',
      '#twk-auth-modal:not([data-user-opened])',
      '.twk-auth-backdrop:not([data-user-opened])',
      '.agg-backdrop',
      '.alexia-paywall-backdrop',
      '.twerkhub-paywall-backdrop'
    ];
    selectors.forEach(function(sel){
      try {
        document.querySelectorAll(sel).forEach(function(el){
          // Don't nuke if this element is actually INSIDE our new topbar
          // (could happen if markup is nested oddly).
          if (el.closest && el.closest('.twerkhub-topbar')) return;
          el.remove();
        });
      } catch(_){}
    });
  }

  // ── 2 · Ensure CSS dependencies are loaded ───────────────────────────
  function ensureCss(href){
    if (document.querySelector('link[rel="stylesheet"][href^="'+href+'"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  function loadAllCss(){
    ensureCss(ASSET_BASE + 'twerkhub-page.css?v=' + VER.page);
    ensureCss(ASSET_BASE + 'twerkhub-tokens.css?v=' + VER.tokens);
    ensureCss(ASSET_BASE + 'twerkhub-polish.css?v=' + VER.polish);
    ensureCss(ASSET_BASE + 'twerkhub-premium.css?v=' + VER.premium);
    ensureCss(ASSET_BASE + 'twerkhub-design-tokens.css?v=' + VER.tokens_css);
    ensureCss(ASSET_BASE + 'twerkhub-a11y.css?v=' + VER.a11y);
    // Elevation layer — premium visual polish ($90M-tier). Loaded last
    // so it wins the cascade. Shadows, aurora, grain, glass, bloom,
    // focus rings, staggered entrance, etc. Zero HTML changes.
    ensureCss(ASSET_BASE + 'twerkhub-elevation.css?v=' + VER.elevation);
    // Google Fonts — only if the site didn't already preconnect.
    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
      var pre1 = document.createElement('link');
      pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(pre1);
      var pre2 = document.createElement('link');
      pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com';
      pre2.crossOrigin = '';
      document.head.appendChild(pre2);
      var font = document.createElement('link');
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap';
      document.head.appendChild(font);
    }
  }

  // ── 3 · Ensure JS dependencies are loaded ────────────────────────────
  function ensureJs(src){
    if (document.querySelector('script[src^="'+src+'"]')) return;
    var s = document.createElement('script');
    s.src = src; s.defer = true;
    document.body.appendChild(s);
  }
  function loadAllJs(){
    // Order matters a bit: tokens module loads FIRST so the HUD can read
    // AlexiaTokens if present. Topbar-enhance runs second (decorates the
    // nav). Locale switcher third (mounts inside the right-cluster slot).
    // Mobile nav + sound manager + premium come last — order doesn't matter.
    ensureJs(ASSET_BASE + 'twerkhub-tokens.js?v=' + VER.tokens);
    ensureJs(ASSET_BASE + 'twerkhub-topbar-enhance.js?v=' + VER.topbar);
    ensureJs(ASSET_BASE + 'twerkhub-locale-switcher.js?v=' + VER.locale);
    ensureJs(ASSET_BASE + 'twerkhub-mobile-nav.js?v=' + VER.mobile);
    ensureJs(ASSET_BASE + 'twerkhub-sound-on-interaction.js?v=' + VER.sound);
    ensureJs(ASSET_BASE + 'twerkhub-premium.js?v=' + VER.premium);
    // Magnetic cursor — premium micro-interaction. Self-guards on touch
    // devices and prefers-reduced-motion. Zero cost on mobile.
    ensureJs(ASSET_BASE + 'twerkhub-cursor.js?v=' + VER.cursor);
    // Social share widget — auto-mounts on blog + legal + playlist pages.
    ensureJs(ASSET_BASE + 'twerkhub-share.js?v=' + VER.share);
    // Core Web Vitals RUM — LCP/CLS/INP/FCP/TTFB beacon.
    ensureJs(ASSET_BASE + 'twerkhub-vitals.js?v=' + VER.vitals);
    ensureJs(ASSET_BASE + 'twerkhub-auth.js?v=' + VER.auth);
  }

  // ── 4 · Inject the topbar DOM if missing ─────────────────────────────
  // The 8-item SAGRADA nav. Hot Packs marked with the dedicated class so
  // twerkhub-premium.css paints it gold/pink with the flame-wiggle.
  var NAV_HTML = (
    '<nav class="twerkhub-topbar" aria-label="Primary">' +
      '<div class="twerkhub-topbar-inner">' +
        '<a class="twerkhub-brand" href="/" aria-label="Twerkhub · home">' +
          '<img class="twerkhub-logo" src="/logo-twerkhub.png" alt="Twerkhub" decoding="async" width="44" height="44">' +
          '<span class="twerkhub-brand-sub">TWERKHUB · Est. 2018</span>' +
        '</a>' +
        '<div class="twerkhub-nav">' +
          '<a href="/">Home</a>' +
          '<a href="/#private-models">Exclusive</a>' +
          '<a href="/#playlists">Playlists</a>' +
          '<a href="/alexia-video-packs.html" class="twerkhub-nav-hot">Hot Packs</a>' +
          '<a href="/community.html">Community</a>' +
          '<a href="/membership.html">Membership</a>' +
          '<a href="/account.html">My Account</a>' +
          '<a href="/profile.html">Profile</a>' +
        '</div>' +
      '</div>' +
    '</nav>'
  );

  function ensureTopbar(){
    if (document.querySelector('.twerkhub-topbar')) {
      // Already present — just make sure Hot Packs exists inside it.
      var nav = document.querySelector('.twerkhub-topbar .twerkhub-nav');
      if (nav && !nav.querySelector('a[href*="alexia-video-packs"]')) {
        var hot = document.createElement('a');
        hot.href = '/alexia-video-packs.html';
        hot.className = 'twerkhub-nav-hot';
        hot.textContent = 'Hot Packs';
        // Insert after the 3rd item (Playlists).
        var items = nav.querySelectorAll('a');
        if (items.length >= 3) items[2].insertAdjacentElement('afterend', hot);
        else nav.appendChild(hot);
      }
      // Mark the link matching the current page as active.
      markActive();
      return;
    }
    // No topbar → inject at the very top of <body>.
    var host = document.createElement('div');
    host.innerHTML = NAV_HTML;
    var nav = host.firstChild;
    document.body.insertBefore(nav, document.body.firstChild);
    markActive();
  }

  function markActive(){
    var path = location.pathname.replace(/\/$/, '') || '/';
    var hash = location.hash || '';
    var links = document.querySelectorAll('.twerkhub-topbar .twerkhub-nav a');
    var exactMatch = null;
    var pathMatches = [];
    links.forEach(function(a){
      a.classList.remove('is-active');
      a.removeAttribute('aria-current');
      try {
        var href = new URL(a.getAttribute('href'), location.href);
        var hp = href.pathname.replace(/\/$/, '') || '/';
        var hh = href.hash || '';
        if (hp !== path) return;
        // Exact match (both pathname AND hash). Highest priority.
        if (hh === hash) exactMatch = a;
        // Path-only match with NO hash in the href → the "plain page" anchor
        // (e.g. Home href="/", path="/"). Lower priority than exact-hash match.
        else if (!hh) pathMatches.push(a);
      } catch(_){}
    });
    // Only ONE link wins. Prefer exact-hash match; fall back to the bare-path
    // link (Home), so Exclusive/Playlists don't light up just because they
    // live on "/". On the home page with no scroll, Home is active. When the
    // user scrolls into #private-models, Exclusive takes over.
    var winner = exactMatch || pathMatches[0];
    if (winner) {
      winner.classList.add('is-active');
      winner.setAttribute('aria-current', 'page');
    }
  }

  // Re-run markActive when the hash changes (smooth-scroll anchors) so the
  // underline tracks the current section on single-page navigations.
  window.addEventListener('hashchange', function(){ try { markActive(); } catch(_){} });

  // Continuous legacy-nav sweep. Some pages have late-firing scripts (e.g.
  // /analytics-profile.js or premium-polish-v10.js) that inject the old
  // .site-nav-final row AFTER DOMContentLoaded. We keep the purge running for
  // the first few seconds so nothing slips through.
  [400, 1200, 2500, 5000].forEach(function(ms){
    setTimeout(function(){ try { purgeLegacyNav(); } catch(_){} }, ms);
  });

  // ── BLUR KILL-SWITCH ────────────────────────────────────────────────
  // If any stale modal/overlay is covering the viewport with a blur filter
  // (without being user-opened), kill it. Also release any body/html scroll
  // lock so the user can always interact with the page.
  function killBlurOverlays(){
    try {
      // Remove explicit blur overlays we know about.
      ['#alexia-age-gate','#twk-auth-modal','.twk-auth-backdrop','.agg-backdrop',
       '.alexia-paywall-backdrop','.twerkhub-paywall-backdrop'].forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          // If explicitly marked user-opened, leave it alone.
          if (el.hasAttribute('data-user-opened')) return;
          try { el.remove(); } catch(_){}
        });
      });
      // Scan for ANY fixed-position element that covers the whole viewport AND
      // has a backdrop-filter:blur on it. If we didn't mark it user-opened,
      // strip its blur so the page is readable even if removal fails.
      document.querySelectorAll('body > *').forEach(function(el){
        if (el.hasAttribute('data-user-opened')) return;
        var cs;
        try { cs = getComputedStyle(el); } catch(_){ return; }
        if (!cs) return;
        var isFixed = cs.position === 'fixed';
        var inset0 = parseFloat(cs.top) === 0 && parseFloat(cs.left) === 0 &&
                     (el.offsetWidth >= window.innerWidth * .9) &&
                     (el.offsetHeight >= window.innerHeight * .9);
        var hasBlur = /blur\(/.test(cs.backdropFilter || '') ||
                      /blur\(/.test(cs.webkitBackdropFilter || '') ||
                      /blur\(/.test(cs.filter || '');
        if (isFixed && inset0 && hasBlur) {
          // Only nuke if it looks like an overlay (high z-index AND not part
          // of our known topbar / tokens HUD).
          var zi = parseInt(cs.zIndex, 10) || 0;
          var isKnown = el.matches('.twerkhub-topbar, .twerkhub-tokens-hud, nav, header');
          if (zi > 1000 && !isKnown) {
            try { el.remove(); } catch(_){}
          }
        }
      });
      // Always release scroll locks — the site should never be unscrollable.
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    } catch(e) { console.warn('[twerkhub-inject] blur-kill failed', e); }
  }
  killBlurOverlays();
  [300, 800, 1800].forEach(function(ms){
    setTimeout(killBlurOverlays, ms);
  });

  // ── 5 · Go ───────────────────────────────────────────────────────────
  function run(){
    try { purgeLegacyNav(); }  catch(e){ console.warn('[twerkhub-inject] purge failed', e); }
    try { loadAllCss(); }      catch(e){ console.warn('[twerkhub-inject] css failed', e); }
    try { ensureTopbar(); }    catch(e){ console.warn('[twerkhub-inject] topbar failed', e); }
    try { loadAllJs(); }       catch(e){ console.warn('[twerkhub-inject] js failed', e); }
    console.info('[twerkhub-inject] universal topbar ready on', location.pathname);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else {
    run();
  }
  // Re-run once more after 1.5s in case other scripts inject legacy markup late.
  setTimeout(function(){ try { purgeLegacyNav(); markActive(); } catch(_){} }, 1500);
})();
