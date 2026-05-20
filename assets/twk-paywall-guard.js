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
    '/playlist/',                       // individual video pages inside the 5 main playlists
    '/latina-porn/',
    '/gothic-porn/',
    '/massage-porn/',
    '/twerk-porn/',
    '/russian-porn/',
  ];
  // Temporary deny-list (paywall OFF) — Sav playlist + 49 individual Sav videos
  // until Google indexes them. Remove once GSC confirms indexation.
  var PAYWALL_DENY_PREFIXES = ['/sav-twerk-playlist/'];
  var PAYWALL_DENY_PATHS = [
    "/playlist/summertime-twerk-sav-the-booty-queen-jobs-city-girls.html",
    "/playlist/bow-bow-bow-sexyy-red-f-my-baby-dad-maine-twerk-class.html",
    "/playlist/savs-vlog-music-video-bts-simon-jaglom-renegade-thequeenbsav-yzagrxi.html",
    "/playlist/pretty-girls-walk-big-boss-vette-twerk-choreography.html",
    "/playlist/twerk-freestyle-best-on-earth-russ-bia-thequeenbsav.html",
    "/playlist/megan-s-piano-twerk-thequeenbsav-megan-thee-stallion.html",
    "/playlist/the-hype-and-energy-is-magnetic-if-youre-in-maine-come-shake-some-with-us-danceclass-twerk.html",
    "/playlist/twerk-tiktok-compilation-part-3-thequeenbsav-thequeenbsav-5poypl4.html",
    "/playlist/twerk-routine-lick-shenseea-megan-thee-stallion.html",
    "/playlist/kstylis-trampoline-booty-twerk-choreography-maine-dance-convention.html",
    "/playlist/twerk-class-choreo-freestyle-dod-jt-los-angeles.html",
    "/playlist/jt-ran-out-collab-twerk-class-choreography-los-angeles.html",
    "/playlist/twerk-left-right-courtney-sanderson.html",
    "/playlist/jt-dod-twerk-choreography-freestyle-trio-los-angeles.html",
    "/playlist/twerk-choreography-rob49-on-dat-money-cardi-b.html",
    "/playlist/toxic-britney-spears-twerk-choreography.html",
    "/playlist/kali-eat-it-up-twerk-choreography.html",
    "/playlist/drop-yo-gotti-da-baby-twerk-class-thequeenbsav.html",
    "/playlist/twerk-tiktok-compilation-sav-the-booty-queen-thequeenbsav-5uelvea.html",
    "/playlist/up-cardi-b-twerk-choreography-freestyle-savbootyqueen.html",
    "/playlist/freestyle-twerk-2nd-thots-jay-park.html",
    "/playlist/twerk-choreography-lose-my-mind-partynextdoor.html",
    "/playlist/freestyle-twerk-booty-blac-youngsta.html",
    "/playlist/twerk-choreography-ojos-ferrari-karol-g-justin-quiles-angel-dior.html",
    "/playlist/up-cardi-b-winter-snow-day-twerk-sav-the-booty-queen.html",
    "/playlist/twerk-routine-body-megan-thee-stallion-sav-the-booty-queen-ashley-jolly.html",
    "/playlist/kali-mmm-mmm-twerk-routine-sav-the-booty-queen-ashley-jolly.html",
    "/playlist/shake-that-megan-thee-stallion-twerk-class-choreo-thequeenbsav.html",
    "/playlist/twerk-tiktok-compilation-thequeenbsav-thequeenbsav-jfazvws.html",
    "/playlist/twerk-dance-say-my-name-hook-man-rome-david-rush-ganja-killz-sav-the-booty-queen.html",
    "/playlist/psy-ganji-feat-jessi-twerk-freestyle-sav-the-booty-queen.html",
    "/playlist/2025-dance-recap-thequeenbsav-f-wehak.html",
    "/playlist/morado-j-balvin-beach-dance-twerk-sav-the-booty-queen-ashley-jolly.html",
    "/playlist/pretty-girls-walk-twerk-choreography-thequeenbsav.html",
    "/playlist/twerk-freestyle-stormzy-vossi-bop-thequeenbsav.html",
    "/playlist/taki-taki-twerk-dj-snake-thequeenbsav.html",
    "/playlist/toot-it-up-pardison-fontaine-cardi-b-nastya-nass-twerk-class-la.html",
    "/playlist/make-her-water-king-danzz-twerk-choreography.html",
    "/playlist/twerk-girls-thot-sh-t-megan-thee-stallion.html",
    "/playlist/twerk-routine-outside-yvette.html",
    "/playlist/kali-mmm-mmm-twerk-sav-the-booty-queen.html",
    "/playlist/how-it-s-done-kpop-demon-hunters-twerk-freestyle.html",
    "/playlist/ice-spice-deli-thequeenbsav-twerk-choreography-maine-dance-convention.html",
    "/playlist/twerk-class-choreography-pop-dat-thang-dababy-thequeenbsav.html",
    "/playlist/twerk-freestyle-zoom-jessi.html",
    "/playlist/used-2-2-chainz-destiny-vaughan-twerk-choreography.html",
    "/playlist/twerk-choreography-all-dere-glorilla-maine-dance-convention.html",
    "/playlist/twerking-on-the-beach-in-hawaii-walking-joji-jackson-wang-ft-swae-lee-major-lazer.html",
    "/playlist/city-girls-pussy-talk-ft-doja-cat-summertime-twerk.html",
  ];
  var __path = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
  var __denied = PAYWALL_DENY_PREFIXES.some(function (p) { return __path.indexOf(p) === 0; })
              || PAYWALL_DENY_PATHS.indexOf(__path) !== -1;
  var PAYWALL_ENABLED = !__denied && (PAYWALL_GLOBAL || PAYWALL_PATHS.some(function (p) { return __path.indexOf(p) === 0; }));
  if (!PAYWALL_ENABLED) {
    var __why = __denied ? 'temporarily disabled (indexing window for Sav)' : 'off for this path';
    try { console.log('[twk-paywall-guard] paywall ' + __why + ' on ' + __path); } catch (_) {}
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
      'position:absolute;inset:0;background:radial-gradient(900px 600px at 20% 10%,rgba(255,46,99,.18),transparent 55%),linear-gradient(180deg,#0a0a10,#13131c);' +
      'display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;' +
      'color:#fff;z-index:20;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;' +
      'box-sizing:border-box;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);';
    overlay.innerHTML = '<div style="font-size:52px;margin-bottom:10px">&#x1F51E;</div>' + '<div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#e8c880;font-weight:700;margin-bottom:6px">+18 &middot; Locked content</div>' + '<div style="font-size:22px;font-weight:800;margin-bottom:8px;color:#f4f4f8">Private Content</div>' + '<div style="font-size:13px;opacity:.75;margin-bottom:18px;max-width:360px;line-height:1.5;color:rgba(255,255,255,.72)">To unlock, contact Alexia on Discord or Telegram.</div>' + '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">' + '<a href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener nofollow ugc" style="padding:13px 22px;border-radius:14px;color:#fff;font-weight:800;font-size:13px;text-decoration:none;background:linear-gradient(145deg,#5865F2,#3a44b8)">Discord</a>' + '<a href="https://t.me/+0xNr69raiIlmYWRh" target="_blank" rel="noopener nofollow ugc" style="padding:13px 22px;border-radius:14px;color:#fff;font-weight:800;font-size:13px;text-decoration:none;background:linear-gradient(145deg,#2AABEE,#229ED9)">Telegram</a>' + '</div>';
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
    badge.textContent = '🔒 18+';
    el.appendChild(badge);
  }

  // Fetch + cache the classification JSON
  var classificationCache = null;
  function fetchClassifications(callback) {
    if (classificationCache) return callback(classificationCache);
    fetch(CLASSIFICATION_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        classificationCache = data || {};
        callback(classificationCache);
      })
      .catch(function (err) {
        try { console.error('[twk-paywall-guard] classification fetch failed:', err); } catch (_) {}
        callback({});
      });
  }



  function findVideoIdFromElement(el) {
    if (!el) return null;
    var direct = el.getAttribute && (el.getAttribute('data-vid') || el.getAttribute('data-video-id') || el.getAttribute('data-youtube-id'));
    if (direct && /^[\w-]{11}$/.test(direct)) return direct;

    var href = el.getAttribute && (el.getAttribute('href') || el.getAttribute('data-href') || el.getAttribute('data-url'));
    var fromHref = extractVideoId(href);
    if (fromHref) return fromHref;

    var img = (el.tagName && el.tagName.toLowerCase() === 'img') ? el : (el.querySelector && el.querySelector('img'));
    if (img) {
      var src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
      var m = String(src).match(/ytimg\.com\/vi\/([\w-]{11})\//);
      if (m) return m[1];
    }

    var nested = el.querySelector && el.querySelector('[data-vid], [data-video-id], iframe[src*="youtube.com/embed"], img[src*="ytimg.com/vi/"]');
    if (nested && nested !== el) {
      if (nested.tagName && nested.tagName.toLowerCase() === 'iframe') return extractVideoId(nested.getAttribute('src'));
      return findVideoIdFromElement(nested);
    }
    return null;
  }

  function restorePublicStaticLock(box, vid) {
    if (!box || !vid || box.querySelector('iframe')) return;
    box.classList.remove('vd-locked');
    box.classList.add('vd-player');
    box.innerHTML = '<iframe width="100%" height="480" src="https://www.youtube.com/embed/' + vid + '?start=5&rel=0&modestbranding=1&playsinline=1" title="TWERKHUB video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
  }

  function protectStaticLock(box, vid) {
    if (!box || !vid) return;
    if (box.querySelector('.vd-lock-modal')) return;
    box.classList.add('vd-locked');
    box.innerHTML = '<div class="vd-lock-modal"><div class="vd-lock-padlock" aria-hidden="true" style="font-size:54px;margin-bottom:8px">🔞</div><div class="vd-lock-kicker">+18 · Locked content</div><h2 class="vd-lock-title">This video is <em>locked</em>.</h2><p class="vd-lock-body"><strong>To unlock, contact Alexia on Discord or Telegram.</strong> YouTube blocks this video from playing outside their platform because it is age-restricted. The uncensored version comes from Alexia directly, in private.</p><div class="vd-lock-cta"><a class="vd-lock-btn discord" href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener nofollow ugc">Discord</a><a class="vd-lock-btn telegram" href="https://t.me/+0xNr69raiIlmYWRh" target="_blank" rel="noopener nofollow ugc">Telegram</a></div><div class="vd-lock-footer">Free invite · 18+ only · Private</div></div>';
  }

  function reconcileStaticLocks(classifications) {
    // Safety repair: if an old bad build left a public video statically locked,
    // unlock it at runtime. Blocked IDs remain protected.
    document.querySelectorAll('.vd-player[data-vid], .vd-locked[data-vid]').forEach(function (box) {
      var vid = box.getAttribute('data-vid');
      if (!vid) return;
      if (classifications[vid] === 'blocked') protectStaticLock(box, vid);
      else restorePublicStaticLock(box, vid);
    });
  }

  function badgeAllBlockedThumbs(classifications) {
    var selector = [
      '[data-vid]', '[data-video-id]',
      'a[href*="youtube.com/watch"]', 'a[href*="youtu.be/"]',
      'a[href*="/hottest-cosplay-fancam/"]',
      '.vthumb', '.rk-thumb', '.rh-thumb', '.twk-rcard', '.twerkhub-fp-thumb'
    ].join(',');

    document.querySelectorAll(selector).forEach(function (el) {
      var vid = findVideoIdFromElement(el);
      if (vid && classifications[vid] === 'blocked') applyThumbBadge(el);
    });
  }

  // Main init
  function init() {
    if (isMember()) {
      try { console.log('[twk-paywall-guard] member detected — paywall bypassed'); } catch (_) {}
      return;
    }

    fetchClassifications(function (classifications) {
      // Find all YouTube embeds
      var iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
      iframes.forEach(function (iframe) {
        var vid = extractVideoId(iframe.getAttribute('src'));
        if (vid && classifications[vid] === 'blocked') {
          applyIframePaywall(iframe, vid);
        }
      });

      // Safety repair for individual pages + robust thumbnail locks.
      // Only IDs marked "blocked" in youtube-age-classification.json get +18 lock/badge.
      reconcileStaticLocks(classifications);
      badgeAllBlockedThumbs(classifications);
      if (!window.__twkPaywallObserver && typeof MutationObserver !== 'undefined') {
        window.__twkPaywallObserver = true;
        new MutationObserver(function () {
          badgeAllBlockedThumbs(classifications);
        }).observe(document.documentElement, { childList: true, subtree: true });
      }
    });
  }

  // On DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
// Cache bust: 20260513-223948
