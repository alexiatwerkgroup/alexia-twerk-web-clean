/* twk-thumb-to-video v5 - blindaje completo + auto-hero + clean badges
   Cache buster: 20260513-blindaje-v5
   - Mismos params blindados (controls=0, disablekb=1, fs=0, iv_load_policy=3, showinfo=0, modestbranding=1, rel=0, playsinline=1, autoplay=1, mute=1, enablejsapi=1)
   - Forza playVideo via postMessage al onload del iframe (resuelve botón YT play residual)
   - Quita badges/overlays cuando hace swap
   - Auto-expande el primer creator-card de listings como hero (igual que /playlist/)
   - Sweep continuo: cualquier iframe YT no-blindado se reescribe in-place
*/
(function () {
  if (window.__twkThumbToVideoV5) return;
  window.__twkThumbToVideoV5 = true;

  // auto-inject CSS blindaje
  (function injectCss() {
    if (document.getElementById('twk-blindaje-style-link')) return;
    var link = document.createElement('link');
    link.id = 'twk-blindaje-style-link';
    link.rel = 'stylesheet';
    link.href = '/assets/twk-blindaje-style.css?v=20260513-blindaje-v5';
    (document.head || document.documentElement).appendChild(link);
  })();

  var ORIGIN = "https://alexiatwerkgroup.com";
  function buildBlindaje(vid) {
    return [
      "autoplay=1",
      "mute=1",
      "controls=0",
      "rel=0",
      "modestbranding=1",
      "playsinline=1",
      "enablejsapi=1",
      "disablekb=1",
      "fs=0",
      "iv_load_policy=3",
      "showinfo=0",
      "widget_referrer=" + encodeURIComponent(ORIGIN),
      "origin=" + encodeURIComponent(ORIGIN)
    ].join("&");
  }
  var BLINDAJE_NO_VID = [
    "autoplay=1","mute=1","controls=0","rel=0","modestbranding=1","playsinline=1",
    "enablejsapi=1","disablekb=1","fs=0","iv_load_policy=3","showinfo=0",
    "widget_referrer=" + encodeURIComponent(ORIGIN),"origin=" + encodeURIComponent(ORIGIN)
  ].join("&");

  // Listener global de YT API postMessage: detecta state=0 (ended) y reinicia el video
  window.addEventListener('message', function (e) {
    if (!e.data) return;
    var data = e.data;
    try {
      if (typeof data === 'string' && data.indexOf('"event":"infoDelivery"') === -1) data = JSON.parse(data);
    } catch (_) { return; }
    if (!data || typeof data !== 'object') return;
    // YT manda { event: "onStateChange", info: 0 } cuando termina
    if (data.event === 'onStateChange' && data.info === 0) {
      // buscar el iframe de origen via source
      var ifrs = document.querySelectorAll('iframe[data-blindaje="v5"]');
      Array.prototype.forEach.call(ifrs, function (ifr) {
        if (ifr.contentWindow === e.source) {
          try {
            ifr.contentWindow.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }), "*");
            ifr.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: "" }), "*");
          } catch (_) {}
        }
      });
    }
  });

  var classification = null, classReady = false;
  fetch('/assets/youtube-age-classification.json')
    .then(function (r) { return r.json(); })
    .then(function (j) { classification = j; classReady = true; })
    .catch(function () {});

  function isBlocked(vid) { return classReady && classification && classification[vid] === 'blocked'; }

  function extractVid(src) {
    if (!src) return null;
    var m = src.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,15})/);
    if (m) return m[1];
    m = src.match(/[?&]v=([A-Za-z0-9_-]{6,15})/);
    if (m) return m[1];
    m = src.match(/youtu\.be\/([A-Za-z0-9_-]{6,15})/);
    if (m) return m[1];
    m = src.match(/ytimg\.com\/vi\/([A-Za-z0-9_-]{6,15})/);
    if (m) return m[1];
    m = src.match(/img\.youtube\.com\/vi\/([A-Za-z0-9_-]{6,15})/);
    if (m) return m[1];
    return null;
  }

  function lockedHTML(vid) {
    return '<div class="vd-player vd-locked" data-vid="' + vid + '" style="position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#fff;"><div><div style="font-size:64px;line-height:1;">&#128286;</div><div style="font-size:22px;font-weight:900;margin:12px 0 8px;letter-spacing:0.5px;">+18 LOCKED</div><div style="font-size:13px;opacity:.85;margin-bottom:14px;">Contact Alexia on Discord or Telegram for invite.</div><a href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#5865F2,#7289DA);color:#fff;padding:10px 22px;border-radius:24px;text-decoration:none;font-weight:800;font-size:12px;letter-spacing:0.5px;display:inline-block;margin:4px;">DISCORD</a><a href="https://t.me/+0xNr69raiIlmYWRh" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#0088cc,#33b5e5);color:#fff;padding:10px 22px;border-radius:24px;text-decoration:none;font-weight:800;font-size:12px;letter-spacing:0.5px;display:inline-block;margin:4px;">TELEGRAM</a></div></div>';
  }

  function iframeHTML(vid) {
    return '<iframe id="twkVidIframe_' + vid + '" data-vid="' + vid + '" data-blindaje="v5" src="https://www.youtube.com/embed/' + vid + '?' + buildBlindaje(vid) + '" title="Twerkhub" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;pointer-events:auto;"></iframe>' +
      '<button class="twk-unmute-btn" type="button" aria-label="Unmute" style="position:absolute;bottom:14px;right:14px;z-index:20;width:44px;height:44px;border-radius:50%;background:rgba(255,28,142,0.92);border:0;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.5);" onclick="var f=this.parentNode.querySelector(\'iframe\');try{f.contentWindow.postMessage(JSON.stringify({event:\'command\',func:\'unMute\'}),\'*\');f.contentWindow.postMessage(JSON.stringify({event:\'command\',func:\'setVolume\',args:[80]}),\'*\');this.style.display=\'none\';}catch(e){}"><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>';
  }

  function forcePlay(iframe) {
    if (!iframe) return;
    try {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: "" }), "*");
    } catch (e) {}
  }

  function attachLoadPlay(wrap) {
    var iframe = wrap.querySelector("iframe");
    if (!iframe) return;
    iframe.addEventListener("load", function () {
      // suscribirse a eventos de YT para detectar end y reiniciar
      try {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: iframe.id || "twkVid" }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }), "*");
      } catch (_) {}
      // varios intentos para vencer el bloqueo de autoplay
      forcePlay(iframe);
      setTimeout(function () { forcePlay(iframe); }, 250);
      setTimeout(function () { forcePlay(iframe); }, 800);
      setTimeout(function () { forcePlay(iframe); }, 2000);
    });
  }

  function cleanBadges(card) {
    // mata todos los play-badges, overlays, etc. que pudieron quedar
    var badges = card.querySelectorAll(".twk-play-badge, .play-badge, .twk-overlay");
    Array.prototype.forEach.call(badges, function (b) { b.remove(); });
  }

  function getVidFromCard(el) {
    if (el.dataset && el.dataset.vid) return el.dataset.vid;
    var img = el.querySelector ? el.querySelector('img[src*="ytimg.com"], img[src*="img.youtube"]') : null;
    if (img) {
      var m = extractVid(img.src);
      if (m) return m;
    }
    if (el.tagName === 'IMG' && el.src) return extractVid(el.src);
    if (el.href) {
      // /creator/labarbie.html → no tiene VID directo, salir
      var href = el.href;
      var m2 = href.match(/\/vi\/([A-Za-z0-9_-]{6,15})/);
      if (m2) return m2[1];
    }
    return null;
  }

  function findContainer(el) {
    var p = el;
    while (p && p !== document.body) {
      if (p.matches && p.matches('a[data-vid],.vcard,.rk-item,.creator-card,[data-vid]')) return p;
      p = p.parentElement;
    }
    return null;
  }

  function buildWrap(vid, isHero) {
    var wrap = document.createElement('div');
    wrap.className = 'twk-vid-wrap vd-player twk-creator-hero';
    wrap.setAttribute('data-vid', vid);
    wrap.setAttribute('data-protected', '1');
    var maxW = isHero ? '1100px' : '900px';
    wrap.style.cssText = 'position:relative;width:100%;max-width:' + maxW + ';aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:24px auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
    wrap.addEventListener('contextmenu', function (e) { e.preventDefault(); return false; });
    wrap.innerHTML = isBlocked(vid) ? lockedHTML(vid) : iframeHTML(vid);
    return wrap;
  }

  function swapToVideo(card, opts) {
    opts = opts || {};
    if (card.dataset.twkPlayed) return;
    var vid = getVidFromCard(card);
    if (!vid) return;
    card.dataset.twkPlayed = '1';

    var imgs = card.querySelectorAll('img');
    var target = null;
    for (var i = 0; i < imgs.length; i++) {
      var rect = imgs[i].getBoundingClientRect();
      if (rect.width > 80 && rect.height > 80) { target = imgs[i]; break; }
    }
    // fallback: si no hay img grande visible (ej hero placeholder), usar el primer img
    if (!target && imgs.length) target = imgs[0];
    if (!target) return;

    var wrap = buildWrap(vid, opts.hero);
    target.parentNode.replaceChild(wrap, target);

    // mata cualquier badge del card padre
    cleanBadges(card);

    // forza play despues del load
    attachLoadPlay(wrap);
  }

  // ============================================================
  // 1) AUTO-HERO en listing pages (creators-*.html, /pt/piranhas, etc.)
  //    Si la pagina tiene .creators-grid pero NO un iframe hero, expandir
  //    el primer .creator-card como hero.
  //    EXCLUYE /playlist/ que ya tiene su propio hero.
  // ============================================================
  function autoHero() {
    var path = location.pathname || '';
    if (path.indexOf('/playlist') === 0) return; // /playlist/ ya tiene hero propio
    if (document.getElementById('twkHeroIframe')) return; // ya hay hero hardcoded
    if (document.querySelector('iframe[data-blindaje]')) return; // ya hay un iframe blindado

    // buscar primer creator-card con ytimg
    var firstCard = document.querySelector('.creator-card img[src*="ytimg"], .vcard img[src*="ytimg"], .rk-item img[src*="ytimg"]');
    if (!firstCard) return;
    var card = findContainer(firstCard) || firstCard.closest('.creator-card, .vcard, .rk-item');
    if (!card) return;
    var vid = getVidFromCard(card);
    if (!vid) return;

    // crear hero wrap antes del grid
    var grid = card.closest('.creators-grid, .vgrid, .ranking');
    if (!grid) return;

    var heroWrap = buildWrap(vid, true);
    var heroBox = document.createElement('div');
    heroBox.className = 'twk-auto-hero';
    heroBox.style.cssText = 'margin:30px auto 36px;max-width:1100px;padding:0 16px;';
    heroBox.appendChild(heroWrap);
    grid.parentNode.insertBefore(heroBox, grid);

    attachLoadPlay(heroWrap);
  }

  // ============================================================
  // 2) SWEEP global: cualquier iframe YT no-blindado → reescribe src
  // ============================================================
  function sweepIframes(root) {
    root = root || document;
    var iframes = root.querySelectorAll("iframe");
    Array.prototype.forEach.call(iframes, function (ifr) {
      if (ifr.getAttribute("data-blindaje") === "v5") return;
      var src = ifr.getAttribute("src") || "";
      if (!/youtube\.com|youtu\.be|ytimg\.com/.test(src)) return;
      var vid = extractVid(src) || ifr.getAttribute("data-vid");
      if (!vid) return;
      // si ya tiene controls=0 + iv_load_policy=3 lo marca y lo deja
      if (src.indexOf("controls=0") !== -1 && src.indexOf("iv_load_policy=3") !== -1) {
        ifr.setAttribute("data-blindaje", "v5");
        return;
      }
      // reescribir
      ifr.src = "https://www.youtube.com/embed/" + vid + "?" + buildBlindaje(vid);
      ifr.setAttribute("data-blindaje", "v5");
      ifr.setAttribute("data-vid", vid);
      ifr.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
      ifr.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      ifr.setAttribute("allowfullscreen", "");
      var parent = ifr.parentElement;
      if (parent && !parent.hasAttribute("data-protected")) {
        parent.setAttribute("data-protected", "1");
        parent.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      }
      forcePlay(ifr);
      ifr.addEventListener("load", function () { forcePlay(ifr); });
    });
  }

  // ============================================================
  // 3) Sweep thumbnails sueltos: <img> con ytimg fuera de cards
  // ============================================================
  function sweepThumbs(root) {
    root = root || document;
    var imgs = root.querySelectorAll('img[src*="ytimg.com"], img[src*="img.youtube"]');
    Array.prototype.forEach.call(imgs, function (img) {
      // si esta dentro de un creator-card / vcard / rk-item, lo maneja el click handler
      if (img.closest('.creator-card, .vcard, .rk-item, a[data-vid], [data-twk-keepthumb]')) return;
      // si tiene data-twk-keepthumb explicito, no tocar
      if (img.hasAttribute('data-twk-keepthumb')) return;
      var vid = extractVid(img.src);
      if (!vid) return;
      // reemplazar img por wrap con iframe blindado
      var wrap = buildWrap(vid, false);
      img.parentNode.replaceChild(wrap, img);
      attachLoadPlay(wrap);
    });
  }

  // ============================================================
  // 4) Click handler para cards en grids (igual que antes)
  // ============================================================
  function attachClickHandler() {
    document.addEventListener('click', function (e) {
      var card = findContainer(e.target);
      if (!card) return;
      var vid = getVidFromCard(card);
      if (!vid) return;
      if (card.dataset.twkPlayed) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      swapToVideo(card);
    }, true);
  }

  function addPlayBadge() {
    document.querySelectorAll('a[data-vid],.vcard,.rk-item,.creator-card,[data-vid]').forEach(function (card) {
      if (card.dataset.twkBadge) return;
      if (card.dataset.twkPlayed) return;
      var vid = getVidFromCard(card);
      if (!vid) return;
      card.dataset.twkBadge = '1';
      card.style.cursor = 'pointer';
      var imgs = card.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        var rect = imgs[i].getBoundingClientRect();
        if (rect.width > 80 && rect.height > 80) {
          var wrap = imgs[i].parentElement;
          if (!wrap || wrap.querySelector('.twk-play-badge')) break;
          if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
          var badge = document.createElement('div');
          badge.className = 'twk-play-badge';
          badge.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,28,142,0.9);display:flex;align-items:center;justify-content:center;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.5);z-index:5;';
          badge.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
          wrap.appendChild(badge);
          break;
        }
      }
    });
  }

  // anti-contextmenu global como ultima linea de defensa
  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      if (t.classList && (t.classList.contains('vd-player') || t.classList.contains('twk-creator-hero') || t.classList.contains('twk-vid-wrap'))) {
        e.preventDefault(); return false;
      }
      if (t.tagName === 'IFRAME') { e.preventDefault(); return false; }
      t = t.parentElement;
    }
  });

  function init() {
    attachClickHandler();
    addPlayBadge();
    sweepIframes(document);
    sweepThumbs(document);
    autoHero();

    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        sweepIframes(document);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    setTimeout(function () { addPlayBadge(); sweepIframes(document); }, 1500);
    setTimeout(function () { addPlayBadge(); sweepIframes(document); }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TWK_BLINDAJE_V5 = { sweep: sweepIframes, params: BLINDAJE_NO_VID, force: forcePlay };
})();
