/* thumb-fallback.js v2.1 (2026-04-30)
   ---
   Strict YouTube thumbnail recovery + dead-video gate.
   - Cascade: maxresdefault -> hqdefault -> mqdefault -> default
   - Only marks DEAD when EVERY variant returns a 120x90 placeholder
     (alive videos always have at least one real variant).
   - On dead: swap thumbnail to /assets/thumb-unavailable.svg AND
     intercept click on the card to open a small "Video unavailable"
     modal with a Discord CTA. Cards with alive videos are never
     touched.
   - v2.1: cards with [data-no-dead] (e.g. homepage hub feature cards
     navigating to /try-on-hot-leaks/, /korean-girls-kpop-twerk/, etc.)
     are now exempt from the dead modal — they're navigation cards,
     not video cards, so blocking their click was a regression.
*/
(function () {
  "use strict";
  if (window.__twerkhubThumbFallback) return;
  window.__twerkhubThumbFallback = true;

  // 2026-05-09 v5 NUKE: clean up stale dead-state AND force-eager-load
  // every YouTube thumbnail. Lazy loading was unreliable on /recent and
  // playlist pages — many cards stayed black below the fold. We now:
  //   1. Remove `loading="lazy"` from every i.ytimg.com img
  //   2. If src was hijacked to thumb-unavailable.svg, recover via data-vid
  //      (if available) or the closest <a href> URL pattern
  //   3. Strip stale .twk-thumb-dead classes and restore original hrefs
  //   4. NEVER hide any image — broken thumb is better than black void
  function recoverYouTubeId(img) {
    // Try data-vid on closest ancestor
    var card = img.closest && img.closest('[data-vid]');
    if (card) {
      var v = card.getAttribute('data-vid');
      if (v) return v;
    }
    // Try a stored original
    if (img.dataset && img.dataset.twkOriginalVid) return img.dataset.twkOriginalVid;
    // Try parent <a href> — extract from /playlist/, /korean-girls.../, etc.
    var anchor = img.closest && img.closest('a[href]');
    if (anchor) {
      var h = anchor.getAttribute('href') || '';
      // Match a known YouTube-id-like substring at end of URL
      var m = h.match(/\/([A-Za-z0-9_-]{11})(?:[/.]|$)/);
      if (m) return m[1];
    }
    return null;
  }
  // Preserve original src on first observation (so if hijacked later we recover).
  function preserveOriginal() {
    try {
      var fresh = document.querySelectorAll('img[src*="i.ytimg.com"]:not([data-twk-orig-src])');
      for (var i = 0; i < fresh.length; i++) {
        var img = fresh[i];
        img.dataset.twkOrigSrc = img.getAttribute('src') || '';
        var m = (img.dataset.twkOrigSrc || '').match(/\/vi\/([^\/]+)\//);
        if (m) img.dataset.twkOriginalVid = m[1];
      }
    } catch (_) {}
  }
  function unmarkDead() {
    try {
      preserveOriginal();
      // 1. Recover any imgs that got hijacked to the dead-poster SVG.
      var bad = document.querySelectorAll('img[src*="thumb-unavailable"]');
      for (var i = 0; i < bad.length; i++) {
        var img = bad[i];
        // Try original-src snapshot first (most reliable)
        if (img.dataset.twkOrigSrc) {
          img.src = img.dataset.twkOrigSrc;
          delete img.dataset.twkDead;
          continue;
        }
        var vid = recoverYouTubeId(img);
        if (vid) {
          img.src = 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg';
          delete img.dataset.twkDead;
        }
        // No fallback to opacity:0 — leave broken-img marker if no recovery.
      }
      // 2. Strip stale dead classes + restore original hrefs.
      var dead = document.querySelectorAll('.twk-thumb-dead, .twk-thumb-maybe-dead');
      for (var j = 0; j < dead.length; j++) {
        dead[j].classList.remove('twk-thumb-dead');
        dead[j].classList.remove('twk-thumb-maybe-dead');
        if (dead[j].tagName === 'A' && dead[j].dataset.twkDeadHref) {
          dead[j].setAttribute('href', dead[j].dataset.twkDeadHref);
        }
      }
      // 3. Force every YouTube thumbnail to eager-load. Lazy below-fold
      //    cards were staying black on scroll-fast.
      var lazy = document.querySelectorAll('img[loading="lazy"][src*="i.ytimg.com"]');
      for (var k = 0; k < lazy.length; k++) {
        lazy[k].setAttribute('loading', 'eager');
        // Re-trigger fetch by reassigning src (forces network).
        var src = lazy[k].getAttribute('src');
        if (src) lazy[k].src = src;
      }
    } catch (_) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', unmarkDead);
  } else {
    unmarkDead();
  }
  setTimeout(unmarkDead, 500);
  setTimeout(unmarkDead, 2000);

  // 2026-05-09 v3: full cascade to ALL frame snapshots. For age-restricted
  // YouTube videos i.ytimg.com sometimes returns 120x90 for hqdefault even
  // though the video is alive. The /N.jpg endpoints (0,1,2,3) are
  // auto-generated keyframes that exist for every public-but-restricted
  // video. We try every variant before giving up.
  var FB = ["maxresdefault", "sddefault", "hqdefault", "mqdefault", "default", "0", "1", "2", "3"];
  var DEAD_POSTER = "/assets/thumb-unavailable.svg";
  var DISCORD_URL = "https://discord.gg/WWn8ZgQMjn";
  var STYLE_ID = "twerkhub-dead-style";
  var MODAL_ID = "twerkhub-dead-modal";

  function isPh(img) {
    return (
      img.complete && img.naturalWidth === 120 && img.naturalHeight === 90
    );
  }
  function getInfo(src) {
    if (!src) return null;
    var m = src.match(/i\.ytimg\.com\/vi\/([^\/]+)\/(\w+)\.jpg/);
    return m ? { id: m[1], variant: m[2] } : null;
  }
  function findCard(img) {
    return (
      img.closest(
        "a, article, .card, .video-card, .rh-thumb, .video-item, .vcard, [data-vid]"
      ) || img.parentElement
    );
  }

  function tryNext(img) {
    var info = getInfo(img.currentSrc || img.src);
    if (!info) return markDead(img);
    var idx = FB.indexOf(info.variant);
    if (idx === -1 || idx >= FB.length - 1) return markDead(img);
    var nextV = FB[idx + 1];
    var newSrc =
      "https://i.ytimg.com/vi/" + info.id + "/" + nextV + ".jpg";

    function onLoad() {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      if (isPh(img)) tryNext(img);
    }
    function onError() {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      tryNext(img);
    }
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = newSrc;
  }

  // 2026-05-09: drastically softened. Old behavior: swap thumb to dead-poster
  // SVG, replace href with javascript:void(0), block click, open modal.
  // Problem: false positives on alive videos with quirky thumbnail availability
  // (notably VR180 3D and some Korean fancams) made entire cards unclickable.
  // New behavior: do NOTHING. Leave the broken/placeholder thumb visible —
  // YouTube returns its own placeholder which is fine. The click still works
  // and goes to the actual video. If the video IS dead, YouTube shows its
  // own "Video unavailable" page, which is honest and accurate.
  function markDead(img) {
    // 2026-05-09 v4: literally do nothing. The whole "mark dead" concept
    // produced false positives on alive videos with quirky thumbnail
    // availability, so we kill it completely. The browser will show
    // YouTube's own placeholder for genuinely-broken thumbs, which is
    // honest and clickable.
    if (img && img.dataset) img.dataset.twkDead = "1";
    return;
  }

  function deadClickHandler(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    openDeadModal();
  }

  function check(img) {
    if (!img || !img.src || img.src.indexOf("i.ytimg.com") === -1) return;
    if (img.dataset.twkDead) return;
    // EXEMPTION: hub-navigation cards (homepage feature cards, etc.) opt out
    // of the dead-video gate via [data-no-dead]. They link to a hub index,
    // not to a single video, so blocking the click is incorrect.
    var card0 = img.closest && img.closest("[data-no-dead]");
    if (card0) return;
    if (img.complete) {
      if (isPh(img)) tryNext(img);
      return;
    }
    function onLoad() {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      if (isPh(img)) tryNext(img);
    }
    function onError() {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      tryNext(img);
    }
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      ".twk-thumb-dead{position:relative;cursor:pointer}",
      ".twk-thumb-dead img{filter:saturate(.85)}",
      ".twk-thumb-dead::after{content:'UNAVAILABLE';position:absolute;top:8px;right:8px;background:linear-gradient(135deg,#ff2d87,#9d4edd);color:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;font-weight:800;letter-spacing:.16em;padding:4px 8px;border-radius:4px;pointer-events:none;z-index:2;box-shadow:0 4px 12px rgba(255,45,135,.35)}",
      ".twk-dead-back{position:fixed;inset:0;z-index:10002;background:rgba(3,3,8,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s}",
      ".twk-dead-back.is-open{display:flex;opacity:1}",
      ".twk-dead-card{width:min(460px,100%);background:linear-gradient(180deg,rgba(20,20,32,.98),rgba(10,10,20,.98));border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:30px 28px;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 60px rgba(255,45,135,.22);position:relative;color:#f5f5fb;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;text-align:center}",
      ".twk-dead-card::before{content:'';position:absolute;top:-1px;left:-1px;right:-1px;height:3px;border-radius:22px 22px 0 0;background:linear-gradient(90deg,#ff2d87,#9d4edd,#ffb454)}",
      ".twk-dead-kicker{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#ff6fa8;margin-bottom:14px}",
      ".twk-dead-card h3{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:900;line-height:1.15;letter-spacing:-.01em;margin:0 0 12px}",
      ".twk-dead-card h3 em{font-style:italic;background:linear-gradient(135deg,#ff2d87,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent}",
      ".twk-dead-card p{color:#c7c7d3;font-size:14.5px;line-height:1.6;margin:0 0 22px}",
      ".twk-dead-actions{display:flex;flex-direction:column;gap:10px}",
      ".twk-dead-actions a,.twk-dead-actions button{display:flex;align-items:center;justify-content:center;padding:13px 18px;border-radius:999px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;border:1px solid transparent;cursor:pointer;transition:transform .25s,background .25s,border-color .25s}",
      ".twk-dead-primary{background:linear-gradient(135deg,#5865F2,#7289DA);color:#fff}",
      ".twk-dead-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(88,101,242,.4)}",
      ".twk-dead-ghost{background:transparent;color:#c7c7d3;border-color:rgba(255,255,255,.14)}",
      ".twk-dead-ghost:hover{background:rgba(255,255,255,.05);color:#fff;border-color:rgba(255,255,255,.28)}",
      ".twk-dead-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}",
      ".twk-dead-close:hover{background:rgba(255,45,135,.18);border-color:rgba(255,111,168,.55)}",
    ].join("");
    document.head.appendChild(s);
  }

  function ensureModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;
    ensureStyles();
    var back = document.createElement("div");
    back.id = MODAL_ID;
    back.className = "twk-dead-back";
    back.setAttribute("role", "dialog");
    back.setAttribute("aria-modal", "true");
    back.setAttribute("aria-label", "Video unavailable");
    back.innerHTML =
      '<div class="twk-dead-card">' +
      '<button class="twk-dead-close" type="button" aria-label="Close">' +
      "×" +
      "</button>" +
      '<div class="twk-dead-kicker">archive note</div>' +
      "<h3>This cut is <em>no longer</em> on YouTube.</h3>" +
      "<p>The original creator removed or privated this video. The cut is preserved in our archive notes — if you want the file, ask Alexia on Discord and she'll send it directly.</p>" +
      '<div class="twk-dead-actions">' +
      '<a class="twk-dead-primary" href="' +
      DISCORD_URL +
      '" target="_blank" rel="noopener">Ask Alexia on Discord</a>' +
      '<button class="twk-dead-ghost" type="button" data-action="close">Close</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(back);
    function close() {
      back.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    back.addEventListener("click", function (e) {
      if (e.target === back) close();
    });
    back.querySelector(".twk-dead-close").addEventListener("click", close);
    back
      .querySelector('[data-action="close"]')
      .addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && back.classList.contains("is-open")) close();
    });
    return back;
  }

  function openDeadModal() {
    var m = ensureModal();
    m.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function scan() {
    var imgs = document.querySelectorAll('img[src*="i.ytimg.com"]');
    for (var i = 0; i < imgs.length; i++) check(imgs[i]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === "IMG") check(n);
        else if (n.querySelectorAll)
          n.querySelectorAll('img[src*="i.ytimg.com"]').forEach(check);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();


/* 2026-05-20 TWERKHUB GRAY THUMB FIX
   Purpose: recover gray/hidden YouTube thumbnails without touching playlist data,
   paywall, locks, Top 5, layout, or video order.
   Rules:
   - never hide a thumbnail
   - never mark alive cards as dead
   - force visible/eager images
   - retry safe YouTube thumbnail variants until a non-120x90 image appears
*/
(function () {
  "use strict";
  if (window.__twkGrayThumbFix20260520) return;
  window.__twkGrayThumbFix20260520 = true;

  var VARIANTS = ["hqdefault", "mqdefault", "sddefault", "maxresdefault", "0", "1", "2", "3", "default"];

  function getVid(img) {
    if (!img) return null;
    if (img.dataset && img.dataset.vid && /^[A-Za-z0-9_-]{11}$/.test(img.dataset.vid)) return img.dataset.vid;
    var src = img.currentSrc || img.src || img.getAttribute("src") || "";
    var m = src.match(/ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\//);
    if (m) return m[1];
    var card = img.closest && img.closest("[data-vid]");
    if (card) {
      var v = card.getAttribute("data-vid");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    }
    return null;
  }

  function getVariant(img) {
    var src = img.currentSrc || img.src || img.getAttribute("src") || "";
    var m = src.match(/\/([^\/]+)\.jpg(?:\?|$)/);
    return m ? m[1] : "";
  }

  function isGrayOrBroken(img) {
    if (!img) return true;
    var src = img.currentSrc || img.src || img.getAttribute("src") || "";
    if (!src || src.indexOf("thumb-unavailable") !== -1) return true;
    if (img.style && img.style.display === "none") return true;
    if (!img.complete) return false;
    if (!img.naturalWidth || !img.naturalHeight) return true;
    return img.naturalWidth <= 120 && img.naturalHeight <= 90;
  }

  function forceVisible(img) {
    try {
      img.loading = "eager";
      img.decoding = "async";
      img.removeAttribute("hidden");
      img.style.display = "block";
      img.style.opacity = "1";
      img.style.visibility = "visible";
      img.style.objectFit = "cover";
      img.dataset.twkDead = "";
      img.classList.remove("twk-thumb-dead", "twk-thumb-maybe-dead");
      var wrap = img.closest && img.closest(".twk-thumb-dead,.twk-thumb-maybe-dead");
      if (wrap) wrap.classList.remove("twk-thumb-dead", "twk-thumb-maybe-dead");
    } catch (_) {}
  }

  function setVariant(img, vid, variant) {
    var next = "https://i.ytimg.com/vi/" + vid + "/" + variant + ".jpg";
    if ((img.getAttribute("src") || "") !== next) img.src = next;
  }

  function recover(img) {
    if (!img || !((img.src || "").indexOf("ytimg.com") !== -1 || (img.src || "").indexOf("thumb-unavailable") !== -1)) return;
    var vid = getVid(img);
    if (!vid) return;
    forceVisible(img);

    if (!isGrayOrBroken(img)) return;

    var current = getVariant(img);
    var idx = VARIANTS.indexOf(current);
    if (idx < 0) idx = -1;
    var triedKey = "twkTried" + vid;
    var tried = (img.dataset && img.dataset[triedKey] ? img.dataset[triedKey].split(",") : []);

    function tryAt(i) {
      if (i >= VARIANTS.length) {
        // Final fallback: keep card visible/clickable, but remove ugly gray box.
        img.style.background = "linear-gradient(135deg,#15151f,#2a1730)";
        img.style.objectFit = "cover";
        img.style.opacity = "1";
        return;
      }
      var v = VARIANTS[i];
      if (tried.indexOf(v) !== -1 && i !== idx + 1) return tryAt(i + 1);
      tried.push(v);
      if (img.dataset) img.dataset[triedKey] = tried.join(",");
      img.onload = function () {
        forceVisible(img);
        if (isGrayOrBroken(img)) tryAt(i + 1);
      };
      img.onerror = function () {
        forceVisible(img);
        tryAt(i + 1);
      };
      setVariant(img, vid, v);
    }

    tryAt(Math.max(0, idx + 1));
  }

  function scan() {
    var imgs = document.querySelectorAll('img[src*="ytimg.com"], img[src*="thumb-unavailable"]');
    for (var i = 0; i < imgs.length; i++) recover(imgs[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  [250, 800, 1600, 3200, 6000].forEach(function (t) { setTimeout(scan, t); });
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "style", "class"] });
})();
