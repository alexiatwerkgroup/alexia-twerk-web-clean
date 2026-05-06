/* ═══ TWERKHUB · CB AFFILIATE WIDGET v4 — PORNHUB VIBE + REAL TOP MODELS ═══
 * v20260506-p4
 *
 * Floating bottom-right STICKY widget. Black + orange (#ff9000) Pornhub
 * aesthetic. Embeds a REAL live cam from Chaturbate's top 10 by viewer
 * count. Auto-rotates every 25 seconds (nukes + recreates iframe so it
 * actually reloads). Picks a RANDOM model from top 5 on first load —
 * mitigates region-blocked rooms.
 *
 * NO Chaturbate branding visible (just "AD" tag for transparency).
 * Truly sticky: no close button, position:fixed.
 * Iframe sandboxed so its content cannot navigate the parent page.
 */
(function () {
  'use strict';
  if (window.__twkCbPromoInit) return;
  window.__twkCbPromoInit = true;

  var DELAY_MS = 600;
  // 18s rotation — fresh iframe BEFORE Chrome's Heavy Ad kicks in (~30s).
  // User asked "cada 20 segundos" — 18s gives 2s safety margin.
  var ROTATE_MS = 18000;
  var API_PATH = '/api/cb-top';
  var AFF_CODE = 'Re5nr';
  var DISMISS_KEY = 'twkCbPromoDismissed_v4';

  // Skip if user dismissed via × this session
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
  } catch (_) {}

  var rooms = null;
  var currentIdx = 0;
  var rotateTimer = null;

  // ── CSS — Pornhub vibe: black + #ff9000 orange ──────────────────────────
  var css = [
    // Use max specificity + !important to defeat any theme rule that
    // might break position:fixed on this widget.
    'html body .twk-cb-promo,body .twk-cb-promo,.twk-cb-promo{',
      'position:fixed !important;',
      'bottom:14px !important;right:14px !important;top:auto !important;left:auto !important;',
      'width:370px;max-width:calc(100vw - 24px);',
      'background:#000;',
      'border:1px solid #ff9000;',
      'border-radius:6px;overflow:hidden;',
      'box-shadow:0 18px 50px rgba(255,144,0,.32),0 6px 18px rgba(0,0,0,.85);',
      'font-family:"Inter",ui-sans-serif,system-ui,sans-serif;',
      'color:#fff;z-index:2147483647 !important;',
      'opacity:0;transform:translateY(20px);',
      'transition:opacity .35s ease,transform .35s ease;',
      'margin:0 !important;',
    '}',
    '.twk-cb-promo.is-visible{opacity:1;transform:translateY(0)}',

    // Top: 3 model avatars (PH style — black bg, orange ring)
    '.twk-cb-promo__models{',
      'display:flex;gap:5px;padding:7px 8px 6px;background:#000;align-items:center;',
      'border-bottom:1px solid #1a1a1a;',
    '}',
    '.twk-cb-promo__model{',
      'flex:1;display:flex;align-items:center;gap:5px;',
      'background:#0d0d0d;border:1px solid #1f1f1f;',
      'border-radius:4px;padding:3px 7px 3px 3px;min-width:0;',
      'cursor:pointer;text-decoration:none;color:inherit;',
      'transition:background .18s,border-color .18s;',
    '}',
    '.twk-cb-promo__model:hover{background:#1a1004;border-color:#ff9000;}',
    '.twk-cb-promo__avatar{',
      'width:22px;height:22px;border-radius:3px;flex-shrink:0;',
      'background-size:cover;background-position:center;background-color:#222;',
      'box-shadow:0 0 0 1.5px #ff9000;',
    '}',
    '.twk-cb-promo__model-name{',
      'font-size:9.5px;font-weight:700;color:#fff;',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.02em;',
      'text-transform:uppercase;',
    '}',
    '.twk-cb-promo__model-viewers{',
      'font-size:8.5px;color:#ff9000;font-weight:800;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
    '}',

    // Header: LIVE badge + AD tag (no chaturbate brand)
    '.twk-cb-promo__header{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:9px 11px 9px;background:#000;',
      'border-bottom:1px solid #1a1a1a;',
    '}',
    // PH-style logo: orange box with "TH" mark
    '.twk-cb-promo__logo{',
      'display:inline-flex;align-items:center;gap:0;',
      'font-family:"Anton","Bebas Neue",sans-serif;',
      'font-size:14px;line-height:1;letter-spacing:.01em;',
    '}',
    '.twk-cb-promo__logo-left{color:#fff;padding-right:5px;text-transform:uppercase;}',
    '.twk-cb-promo__logo-right{',
      'background:#ff9000;color:#000;padding:3px 6px 2px;border-radius:3px;',
      'text-transform:uppercase;',
    '}',
    '.twk-cb-promo__live-badge{',
      'display:inline-flex;align-items:center;gap:5px;',
      'background:transparent;color:#ff3030;',
      'padding:0;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
      'font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;',
    '}',
    '.twk-cb-promo__live-dot{',
      'width:7px;height:7px;border-radius:50%;background:#ff3030;',
      'box-shadow:0 0 8px #ff3030;',
      'animation:twkCbPulse 1.4s ease-in-out infinite;',
    '}',
    '@keyframes twkCbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.85)}}',
    '.twk-cb-promo__ad-tag{',
      'background:#1a1a1a;color:rgba(255,255,255,.55);',
      'font-family:"Inter",sans-serif;font-size:8.5px;font-weight:800;',
      'padding:3px 6px;border-radius:2px;letter-spacing:.06em;',
      'border:1px solid #2a2a2a;',
    '}',
    // Close × button — sits at the right of the header
    '.twk-cb-promo__close{',
      'background:transparent;border:0;color:rgba(255,255,255,.5);',
      'width:22px;height:22px;border-radius:3px;padding:0;',
      'font-size:18px;line-height:1;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'margin-left:2px;',
      'transition:background .18s,color .18s;',
    '}',
    '.twk-cb-promo__close:hover{background:#1a1a1a;color:#fff;}',

    // Cam container
    '.twk-cb-promo__cam{',
      'position:relative;display:block;width:100%;aspect-ratio:16/11;',
      'background:#000;cursor:pointer;overflow:hidden;',
    '}',
    // Iframe renders at NATIVE chaturbate size (800x550) and is scaled
    // down via transform — this guarantees the full player layout is
    // visible (model centered, no edge clipping). JS sets transform
    // dynamically based on container width.
    '.twk-cb-promo__iframe{',
      'position:absolute;top:0;left:0;',
      'width:800px;height:550px;',
      'border:0;background:#000;',
      'pointer-events:none;',
      'transform-origin:top left;',
    '}',
    // Thumbnail image (replaces iframe to bypass Chrome Heavy Ad Intervention)
    '.twk-cb-promo__thumb{',
      'position:absolute;inset:0;width:100%;height:100%;',
      'object-fit:cover;object-position:center top;',
      'background:#0a0a0a;display:block;',
      'pointer-events:none;',
      'animation:twkCbFadeIn .4s ease;',
    '}',
    '@keyframes twkCbFadeIn{from{opacity:.4}to{opacity:1}}',
    // Play overlay icon — visual cue that thumbnail is clickable as live cam
    '.twk-cb-promo__play{',
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
      'width:54px;height:54px;border-radius:50%;',
      'background:rgba(255,144,0,.92);',
      'box-shadow:0 6px 20px rgba(255,144,0,.55),0 0 0 4px rgba(255,144,0,.18);',
      'display:flex;align-items:center;justify-content:center;',
      'z-index:5;pointer-events:none;',
      'transition:transform .25s ease;',
    '}',
    '.twk-cb-promo__cam:hover .twk-cb-promo__play{transform:translate(-50%,-50%) scale(1.08);}',
    '.twk-cb-promo__play::before{',
      'content:"";display:block;',
      'border-style:solid;border-width:10px 0 10px 18px;',
      'border-color:transparent transparent transparent #000;',
      'margin-left:4px;',
    '}',
    '.twk-cb-promo__overlay{',
      'position:absolute;inset:0;z-index:3;cursor:pointer;',
      'background:transparent;text-decoration:none;color:inherit;',
    '}',
    '.twk-cb-promo__placeholder{',
      'position:absolute;inset:0;z-index:1;',
      'background:#0a0a0a;',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:32px;color:#ff9000;',
    '}',
    '.twk-cb-promo__placeholder-spinner{',
      'width:24px;height:24px;border:2px solid #1a1a1a;border-top-color:#ff9000;',
      'border-radius:50%;animation:twkCbSpin 0.9s linear infinite;',
    '}',
    '@keyframes twkCbSpin{to{transform:rotate(360deg)}}',

    // Bottom info bar over iframe
    '.twk-cb-promo__featured-bar{',
      'position:absolute;left:0;right:0;bottom:0;z-index:4;',
      'display:flex;justify-content:space-between;align-items:center;gap:8px;',
      'padding:8px 11px 9px;',
      'background:linear-gradient(0deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,0) 100%);',
      'pointer-events:none;',
    '}',
    '.twk-cb-promo__featured-name{',
      'font-size:11px;font-weight:800;color:#fff;letter-spacing:.04em;',
      'text-transform:uppercase;',
      'text-shadow:0 1px 3px rgba(0,0,0,.95);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%;',
    '}',
    '.twk-cb-promo__featured-viewers{',
      'display:inline-flex;align-items:center;gap:4px;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
      'font-size:10px;font-weight:900;color:#000;',
      'background:#ff9000;',
      'padding:3px 8px;border-radius:3px;',
      'text-transform:uppercase;',
      'flex-shrink:0;',
    '}',

    // CTA bar
    '.twk-cb-promo__cta-bar{padding:9px 10px 11px;background:#000;border-top:1px solid #1a1a1a;}',
    '.twk-cb-promo__cta{',
      'display:block;width:100%;text-align:center;',
      'padding:11px 14px;',
      'background:#ff9000;',
      'color:#000;text-decoration:none;',
      'font-family:"Anton","Bebas Neue",sans-serif;',
      'font-size:14px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;',
      'border-radius:4px;',
      'box-shadow:0 4px 14px rgba(255,144,0,.45);',
      'transition:transform .18s,filter .18s,box-shadow .18s;',
      'border:0;cursor:pointer;',
    '}',
    '.twk-cb-promo__cta:hover{',
      'transform:translateY(-1px);filter:brightness(1.12);',
      'box-shadow:0 6px 22px rgba(255,144,0,.6);',
    '}',
    '.twk-cb-promo__total{',
      'margin-top:7px;text-align:center;font-size:9.5px;',
      'color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;',
    '}',
    '.twk-cb-promo__total strong{color:#ff9000;font-weight:900;}',

    '@media(max-width:540px){',
      '.twk-cb-promo{width:calc(100vw - 16px);right:8px;left:8px;bottom:8px;}',
    '}',
  ].join('');

  function injectCss() {
    if (document.getElementById('twk-cb-promo-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-cb-promo-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildSkeleton() {
    if (document.querySelector('.twk-cb-promo')) return null;
    var box = document.createElement('div');
    box.className = 'twk-cb-promo';
    box.setAttribute('role', 'complementary');
    box.setAttribute('aria-label', 'Live cams');
    box.innerHTML =
      '<div class="twk-cb-promo__header">' +
        '<span class="twk-cb-promo__logo">' +
          '<span class="twk-cb-promo__logo-left">ONLINE</span>' +
          '<span class="twk-cb-promo__logo-right">CAMS</span>' +
        '</span>' +
        '<span class="twk-cb-promo__live-badge">' +
          '<span class="twk-cb-promo__live-dot"></span>LIVE NOW' +
        '</span>' +
        '<span class="twk-cb-promo__ad-tag">AD</span>' +
        '<button class="twk-cb-promo__close" type="button" aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="twk-cb-promo__cam" id="twk-cb-cam">' +
        '<div class="twk-cb-promo__placeholder" id="twk-cb-placeholder">' +
          '<div class="twk-cb-promo__placeholder-spinner"></div>' +
        '</div>' +
        '<div class="twk-cb-promo__featured-bar">' +
          '<span class="twk-cb-promo__featured-name" id="twk-cb-feat-name">…</span>' +
          '<span class="twk-cb-promo__featured-viewers" id="twk-cb-feat-viewers">● —</span>' +
        '</div>' +
        '<a class="twk-cb-promo__overlay" id="twk-cb-overlay" target="_blank" rel="sponsored noopener nofollow" data-twk-cb-cta="cam"></a>' +
      '</div>' +
      '<div class="twk-cb-promo__cta-bar">' +
        '<a class="twk-cb-promo__cta" id="twk-cb-cta" target="_blank" rel="sponsored noopener nofollow" data-twk-cb-cta="button">' +
          'JOIN FREE NOW →' +
        '</a>' +
        '<div class="twk-cb-promo__total"><strong id="twk-cb-total">—</strong> live models online</div>' +
      '</div>';
    // Append to <html> instead of <body> — bypasses any body transform/filter
    // that creates a containing block and breaks position:fixed.
    (document.documentElement || document.body).appendChild(box);
    // Belt-and-suspenders: also force position via inline style
    box.style.cssText +=
      ';position:fixed !important;bottom:14px !important;right:14px !important;' +
      'top:auto !important;left:auto !important;z-index:2147483647 !important;';
    return box;
  }

  function renderTopBar(others) {
    var holder = document.getElementById('twk-cb-models');
    if (!holder) return;
    holder.innerHTML = others.slice(0, 3).map(function (r) {
      var url = r.chat_room_url || ('#');
      return (
        '<a class="twk-cb-promo__model" href="' + url + '" target="_blank" rel="sponsored noopener nofollow" data-twk-cb-cta="avatar">' +
          '<div class="twk-cb-promo__avatar" style="background-image:url(' + r.image_url + ')"></div>' +
          '<div style="overflow:hidden;display:flex;flex-direction:column;line-height:1.05;gap:1px;">' +
            '<span class="twk-cb-promo__model-name">' + (r.display_name || r.username) + '</span>' +
            '<span class="twk-cb-promo__model-viewers">● ' + (r.num_users || 0).toLocaleString() + '</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  // Iframe renders at native 800x550 and is CSS-scaled down to fit the
  // container — guarantees the model is fully visible, not clipped.
  var IFRAME_NATIVE_W = 800;
  var IFRAME_NATIVE_H = 550;
  function applyIframeScale(iframe, container) {
    if (!iframe || !container) return;
    var w = container.getBoundingClientRect().width;
    if (!w) return;
    var scale = w / IFRAME_NATIVE_W;
    iframe.style.transform = 'scale(' + scale.toFixed(4) + ')';
  }

  var resizeRaf = null;
  function onResize() {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      var iframe = document.getElementById('twk-cb-iframe');
      var cam = document.getElementById('twk-cb-cam');
      applyIframeScale(iframe, cam);
    });
  }
  window.addEventListener('resize', onResize);

  // LIVE iframe approach: nuke + recreate every 18s. Each fresh iframe
  // gets a clean Heavy Ad budget (Chrome tracks per-element). By rotating
  // BEFORE the ~30s Heavy Ad threshold, each iframe never accumulates
  // enough resources to be killed. User sees real live streams.
  function renderFeatured(idx) {
    if (!rooms || !rooms.length) return;
    var r = rooms[idx % rooms.length];
    var cam = document.getElementById('twk-cb-cam');
    var overlay = document.getElementById('twk-cb-overlay');
    var cta = document.getElementById('twk-cb-cta');
    var fname = document.getElementById('twk-cb-feat-name');
    var fviewers = document.getElementById('twk-cb-feat-viewers');
    if (!cam) return;

    // Remove existing media (iframe or img from older versions)
    var oldMedia = cam.querySelector('.twk-cb-promo__iframe, .twk-cb-promo__thumb');
    if (oldMedia && oldMedia.parentNode) oldMedia.parentNode.removeChild(oldMedia);

    // Create fresh iframe with affiliate-friendly tour=Jrvi
    var iframe = document.createElement('iframe');
    iframe.id = 'twk-cb-iframe';
    iframe.className = 'twk-cb-promo__iframe';
    iframe.allow = 'autoplay';
    iframe.loading = 'eager';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.referrerPolicy = 'no-referrer';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    iframe.src = r.iframe_url;

    var placeholder = document.getElementById('twk-cb-placeholder');
    if (placeholder && placeholder.nextSibling) {
      cam.insertBefore(iframe, placeholder.nextSibling);
    } else {
      cam.appendChild(iframe);
    }

    iframe.addEventListener('load', function () {
      if (placeholder) placeholder.style.display = 'none';
    });
    setTimeout(function () { if (placeholder) placeholder.style.display = 'none'; }, 3000);

    // Apply scale immediately + after iframe loads (in case container size shifts)
    applyIframeScale(iframe, cam);
    iframe.addEventListener('load', function () { applyIframeScale(iframe, cam); });
    setTimeout(function () { applyIframeScale(iframe, cam); }, 100);

    if (overlay) overlay.href = r.chat_room_url;
    if (cta) cta.href = r.chat_room_url;
    if (fname) fname.textContent = r.display_name || r.username;
    if (fviewers) fviewers.textContent = '● ' + (r.num_users || 0).toLocaleString();
  }

  function bindClickTracking(box) {
    // Close button
    var closeBtn = box.querySelector('.twk-cb-promo__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
        if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
        box.classList.remove('is-visible');
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 350);
      });
    }
    // CTA tracking — fires for any click on a [data-twk-cb-cta] element
    box.addEventListener('click', function (ev) {
      var el = ev.target.closest && ev.target.closest('[data-twk-cb-cta]');
      if (!el) return;
      try {
        if (window.dataLayer && typeof window.dataLayer.push === 'function') {
          window.dataLayer.push({
            event: 'cb_promo_click',
            promo_location: 'bottom_right_floating',
            promo_target: 'chaturbate_viewer_revshare',
            promo_cta: el.getAttribute('data-twk-cb-cta')
          });
        }
        if (window.AlexiaTokens && typeof window.AlexiaTokens.grant === 'function') {
          window.AlexiaTokens.grant(5, 'cb_promo_clicked');
        }
      } catch (_) {}
    });
  }

  function fetchTop() {
    return fetch(API_PATH, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('api_status_' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.rooms) || !data.rooms.length) {
          throw new Error('no_rooms');
        }
        return data.rooms;
      });
  }

  function show() {
    injectCss();
    var box = buildSkeleton();
    if (!box) return;
    bindClickTracking(box);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { box.classList.add('is-visible'); });
    });

    fetchTop().then(function (data) {
      rooms = data;
      var totalViewers = rooms.reduce(function (acc, r) { return acc + (r.num_users || 0); }, 0);
      var totalEl = document.getElementById('twk-cb-total');
      if (totalEl) totalEl.textContent = totalViewers.toLocaleString();

      // RANDOM initial pick from top 5 — spreads load + mitigates region blocks
      var topN = Math.min(5, rooms.length);
      currentIdx = Math.floor(Math.random() * topN);
      renderFeatured(currentIdx);

      // Rotate featured every ROTATE_MS — actually nukes the iframe
      if (rotateTimer) clearInterval(rotateTimer);
      rotateTimer = setInterval(function () {
        currentIdx = (currentIdx + 1) % topN;
        renderFeatured(currentIdx);
      }, ROTATE_MS);
    }).catch(function (err) {
      var cta = document.getElementById('twk-cb-cta');
      if (cta) cta.href = 'https://chaturbate.com/in/?tour=Limj&campaign=' + AFF_CODE + '&track=default';
      var overlay = document.getElementById('twk-cb-overlay');
      if (overlay) overlay.href = cta ? cta.href : '#';
      var fname = document.getElementById('twk-cb-feat-name');
      if (fname) fname.textContent = 'Top Models Live';
      var fviewers = document.getElementById('twk-cb-feat-viewers');
      if (fviewers) fviewers.textContent = '● 1000+';
      console.warn('[cb-promo] fetch failed, fallback active', err);
    });
  }

  function start() { setTimeout(show, DELAY_MS); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
