/* ═══ TWERKHUB · CHATURBATE AFFILIATE WIDGET v3 — REAL LIVE TOP MODEL ═══
 * v20260506-p3
 *
 * Floating bottom-right STICKY widget that embeds a REAL live cam from
 * one of the top 10 Chaturbate models (sorted by viewer count). Pulls
 * data through our Vercel serverless function /api/cb-top which proxies
 * Chaturbate's affiliate API (the API doesn't have CORS — proxy fixes it).
 *
 * - Iframe to /in/?tour=Jrvi&campaign=Re5nr&track=embed&room=USERNAME
 *   (Jrvi is the embed-allowed tour code Chaturbate explicitly provides
 *   for affiliate iframes).
 * - Transparent click overlay on top of iframe → opens revshare URL
 *   (tour=LQps) in new tab with your campaign code. Best commission +
 *   guaranteed attribution.
 * - Top row: 3 OTHER models from the top 10 (real avatars, real names).
 * - Auto-rotates featured model every 60 seconds.
 * - Sticky: no close button. Always visible.
 * - Mobile responsive.
 */
(function () {
  'use strict';
  if (window.__twkCbPromoInit) return;
  window.__twkCbPromoInit = true;

  var DELAY_MS = 4000;
  var ROTATE_MS = 60000;
  var API_PATH = '/api/cb-top';
  var AFF_CODE = 'Re5nr';

  var rooms = null;     // populated after fetch
  var currentIdx = 0;

  // ── CSS ──────────────────────────────────────────────────────────────────
  var css = [
    '.twk-cb-promo{',
      'position:fixed;bottom:16px;right:16px;width:340px;max-width:calc(100vw - 24px);',
      'background:#0a0a14;',
      'border:1px solid rgba(255,144,0,.4);',
      'border-radius:14px;overflow:hidden;',
      'box-shadow:0 16px 44px rgba(255,46,135,.28),0 6px 18px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06);',
      'font-family:"Inter",ui-sans-serif,system-ui,sans-serif;',
      'color:#fff;z-index:9999;',
      'opacity:0;transform:translateY(24px);',
      'transition:opacity .4s ease,transform .4s ease;',
    '}',
    '.twk-cb-promo.is-visible{opacity:1;transform:translateY(0)}',

    '.twk-cb-promo__models{',
      'display:flex;gap:6px;padding:8px 10px 6px;background:#070710;align-items:center;',
    '}',
    '.twk-cb-promo__model{',
      'flex:1;display:flex;align-items:center;gap:5px;',
      'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);',
      'border-radius:24px;padding:3px 8px 3px 3px;min-width:0;',
      'cursor:pointer;text-decoration:none;color:inherit;',
      'transition:background .2s,border-color .2s;',
    '}',
    '.twk-cb-promo__model:hover{background:rgba(255,46,135,.12);border-color:rgba(255,46,135,.4);}',
    '.twk-cb-promo__avatar{',
      'width:22px;height:22px;border-radius:50%;flex-shrink:0;',
      'background-size:cover;background-position:center;',
      'box-shadow:0 0 0 1.5px #ff2d87;',
    '}',
    '.twk-cb-promo__model-name{',
      'font-size:9.5px;font-weight:700;color:rgba(230,230,240,.85);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.02em;',
    '}',
    '.twk-cb-promo__model-viewers{',
      'font-size:8.5px;color:#1ee08f;font-weight:800;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
    '}',

    '.twk-cb-promo__header{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:10px 12px 8px;background:#0f0f1c;',
    '}',
    '.twk-cb-promo__live-badge{',
      'display:inline-flex;align-items:center;gap:6px;',
      'background:linear-gradient(90deg,#ff3d3d 0%,#ff2d87 100%);',
      'color:#fff;padding:5px 11px 5px 9px;border-radius:14px;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
      'font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;',
      'box-shadow:0 4px 14px rgba(255,61,61,.4);',
    '}',
    '.twk-cb-promo__live-dot{',
      'width:7px;height:7px;border-radius:50%;background:#fff;',
      'box-shadow:0 0 6px rgba(255,255,255,.9);',
      'animation:twkCbPulse 1.4s ease-in-out infinite;',
    '}',
    '@keyframes twkCbPulse{0%,100%{opacity:1}50%{opacity:.4}}',
    '.twk-cb-promo__brand{',
      'display:inline-flex;align-items:center;gap:5px;',
      'font-family:"Anton","Bebas Neue",sans-serif;',
      'font-size:14px;font-weight:400;letter-spacing:.04em;',
      'color:#ffd34a;text-transform:uppercase;',
    '}',
    '.twk-cb-promo__ad-tag{',
      'background:rgba(255,255,255,.12);color:rgba(255,255,255,.7);',
      'font-family:"Inter",sans-serif;font-size:8.5px;font-weight:800;',
      'padding:2px 5px;border-radius:3px;letter-spacing:.04em;',
    '}',

    // The iframe wrapper — keeps aspect ratio + click overlay
    '.twk-cb-promo__cam{',
      'position:relative;display:block;width:100%;aspect-ratio:16/11;',
      'background:#000;cursor:pointer;overflow:hidden;',
    '}',
    '.twk-cb-promo__iframe{',
      'position:absolute;inset:0;width:100%;height:100%;border:0;',
      'pointer-events:none;', // clicks go to overlay, not iframe
    '}',
    '.twk-cb-promo__overlay{',
      'position:absolute;inset:0;z-index:3;cursor:pointer;',
      'background:transparent;text-decoration:none;color:inherit;',
    '}',
    '.twk-cb-promo__placeholder{',
      'position:absolute;inset:0;z-index:1;',
      'background:radial-gradient(circle at 30% 40%,rgba(255,46,135,.45) 0%,transparent 55%),',
                  'radial-gradient(circle at 70% 60%,rgba(255,144,0,.35) 0%,transparent 50%),',
                  'linear-gradient(135deg,#1a0a1f 0%,#0a0a14 100%);',
      'animation:twkCbShift 6s ease-in-out infinite alternate;',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:36px;color:rgba(255,255,255,.55);',
    '}',
    '@keyframes twkCbShift{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(20deg)}}',

    // Featured model info bar overlay (bottom of cam)
    '.twk-cb-promo__featured-bar{',
      'position:absolute;left:0;right:0;bottom:0;z-index:4;',
      'display:flex;justify-content:space-between;align-items:center;gap:8px;',
      'padding:8px 12px 9px;',
      'background:linear-gradient(0deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,0) 100%);',
      'pointer-events:none;',
    '}',
    '.twk-cb-promo__featured-name{',
      'font-size:11.5px;font-weight:800;color:#fff;letter-spacing:.02em;',
      'text-shadow:0 1px 2px rgba(0,0,0,.8);',
    '}',
    '.twk-cb-promo__featured-viewers{',
      'display:inline-flex;align-items:center;gap:4px;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
      'font-size:10px;font-weight:800;color:#1ee08f;',
      'background:rgba(0,0,0,.55);backdrop-filter:blur(4px);',
      'padding:3px 8px;border-radius:10px;',
    '}',

    // Brand watermark on cam
    '.twk-cb-promo__brand-overlay{',
      'position:absolute;top:8px;right:8px;z-index:2;',
      'background:rgba(0,0,0,.55);backdrop-filter:blur(4px);',
      'padding:4px 8px;border-radius:6px;',
      'font-family:"Anton","Bebas Neue",sans-serif;',
      'font-size:11px;color:#ffd34a;letter-spacing:.04em;',
      'pointer-events:none;',
    '}',

    '.twk-cb-promo__cta-bar{padding:10px 12px 12px;background:#0f0f1c;}',
    '.twk-cb-promo__cta{',
      'display:block;width:100%;text-align:center;',
      'padding:11px 14px;',
      'background:linear-gradient(90deg,#ff3d6e 0%,#ff9000 100%);',
      'color:#000;text-decoration:none;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
      'font-size:11.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;',
      'border-radius:8px;',
      'box-shadow:0 4px 14px rgba(255,61,110,.45);',
      'transition:transform .2s,filter .2s,box-shadow .2s;',
    '}',
    '.twk-cb-promo__cta:hover{',
      'transform:translateY(-1px);filter:brightness(1.1);',
      'box-shadow:0 6px 22px rgba(255,61,110,.6);',
    '}',
    '.twk-cb-promo__total{',
      'margin-top:6px;text-align:center;font-size:10px;',
      'color:rgba(230,230,240,.55);letter-spacing:.05em;',
    '}',
    '.twk-cb-promo__total strong{color:#1ee08f;font-weight:800;}',

    '@media(max-width:540px){',
      '.twk-cb-promo{width:calc(100vw - 20px);right:10px;left:10px;bottom:10px;}',
    '}',
  ].join('');

  function injectCss() {
    if (document.getElementById('twk-cb-promo-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-cb-promo-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── DOM build ────────────────────────────────────────────────────────────
  function buildSkeleton() {
    if (document.querySelector('.twk-cb-promo')) return null;
    var box = document.createElement('div');
    box.className = 'twk-cb-promo';
    box.setAttribute('role', 'complementary');
    box.setAttribute('aria-label', 'Live cams');
    box.innerHTML =
      '<div class="twk-cb-promo__models" id="twk-cb-models"></div>' +
      '<div class="twk-cb-promo__header">' +
        '<span class="twk-cb-promo__live-badge">' +
          '<span class="twk-cb-promo__live-dot"></span>EN DIRECTO' +
        '</span>' +
        '<span class="twk-cb-promo__brand">CHATURBATE<span class="twk-cb-promo__ad-tag">Ad</span></span>' +
      '</div>' +
      '<div class="twk-cb-promo__cam" id="twk-cb-cam">' +
        '<div class="twk-cb-promo__placeholder" id="twk-cb-placeholder">▶</div>' +
        '<iframe class="twk-cb-promo__iframe" id="twk-cb-iframe" allow="autoplay" loading="lazy" frameborder="0" scrolling="no"></iframe>' +
        '<div class="twk-cb-promo__brand-overlay">CHATURBATE</div>' +
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
    document.body.appendChild(box);
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
          '<div style="overflow:hidden;display:flex;flex-direction:column;line-height:1.05;">' +
            '<span class="twk-cb-promo__model-name">' + (r.display_name || r.username) + '</span>' +
            '<span class="twk-cb-promo__model-viewers">● ' + (r.num_users || 0).toLocaleString() + '</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  function renderFeatured(idx) {
    if (!rooms || !rooms.length) return;
    var r = rooms[idx % rooms.length];
    var iframe = document.getElementById('twk-cb-iframe');
    var overlay = document.getElementById('twk-cb-overlay');
    var cta = document.getElementById('twk-cb-cta');
    var fname = document.getElementById('twk-cb-feat-name');
    var fviewers = document.getElementById('twk-cb-feat-viewers');
    var ph = document.getElementById('twk-cb-placeholder');
    if (iframe) iframe.src = r.iframe_url;
    if (overlay) overlay.href = r.chat_room_url;
    if (cta) cta.href = r.chat_room_url;
    if (fname) fname.textContent = r.display_name || r.username;
    if (fviewers) fviewers.textContent = '● ' + (r.num_users || 0).toLocaleString();
    if (ph) {
      // Hide placeholder when iframe likely loaded
      setTimeout(function () { ph.style.display = 'none'; }, 1500);
    }
  }

  function bindClickTracking(box) {
    box.querySelectorAll('[data-twk-cb-cta]').forEach(function (el) {
      el.addEventListener('click', function () {
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

      // Featured = top model (index 0). Top bar shows next 3 (idx 1..3).
      currentIdx = 0;
      renderFeatured(currentIdx);
      renderTopBar(rooms.slice(1, 4));

      // Rotate featured every ROTATE_MS
      setInterval(function () {
        currentIdx = (currentIdx + 1) % Math.min(rooms.length, 5);
        renderFeatured(currentIdx);
      }, ROTATE_MS);
    }).catch(function (err) {
      // Fallback: show generic CTA, no live cam (placeholder stays)
      var cta = document.getElementById('twk-cb-cta');
      if (cta) {
        cta.href = 'https://chaturbate.com/in/?tour=Limj&campaign=' + AFF_CODE + '&track=default';
      }
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
