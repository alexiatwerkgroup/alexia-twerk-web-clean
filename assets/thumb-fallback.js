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

  var FB = ["maxresdefault", "hqdefault", "mqdefault", "default"];
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

  function markDead(img) {
    if (img.dataset.twkDead) return;
    img.dataset.twkDead = "1";
    img.removeAttribute("srcset");
    img.src = DEAD_POSTER;
    img.alt = "video unavailable";
    var card = findCard(img);
    if (!card) return;
    card.classList.add("twk-thumb-dead");
    if (card.tagName === "A") {
      card.dataset.twkDeadHref = card.getAttribute("href") || "";
      card.setAttribute("href", "javascript:void(0)");
      card.setAttribute("data-twk-dead-card", "1");
    }
    card.addEventListener("click", deadClickHandler, true);
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
