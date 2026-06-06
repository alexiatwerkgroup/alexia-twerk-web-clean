/* ═══ TWERKHUB · LIVEJASMIN AFFILIATE WIDGET v5 ═══
 * v20260506-p11
 *
 * Floating bottom-right STICKY widget. Black + orange (#ff9000) Pornhub-style
 * chrome (header with ONLINE CAMS brand + LIVE NOW badge + AD tag + X close).
 *
 * Inside: LiveJasmin official affiliate embed (script-injected, fills container)
 *   - psid=alexiatwerk (your affiliate handle)
 *   - psprogram=revs (revenue share)
 *   - category=girl
 *   - filters=vip-show + big-breast + 18-22
 *
 * The embed handles its own UI, performer rotation, click-tracking, and chat
 * preview. We just provide the wrapper chrome + sticky positioning + dismiss.
 *
 * Replaces previous Chaturbate iframe approach (which suffered from Heavy Ad
 * Intervention + region blocks). LiveJasmin's affiliate embed is purpose-built
 * for sites and doesn't trigger Chrome's heavy-ad killer.
 */
(function () {
  'use strict';
  if (window.__twkCbPromoInit) return;
  window.__twkCbPromoInit = true;

  /* ─────────────────────────────────────────────────────────────────────
   * DISABLED (2026-06-06) — bug "pantalla negra / solo carga la cam".
   * El embed de LiveJasmin (ecdwm.com) se inyectaba con z-index 2147483647
   * y a veces se renderizaba a pantalla completa, tapando todo el sitio.
   * También duplicaba el widget "ONLINE CAMS" del hero.
   * Se desactiva el widget flotante por completo. Para reactivarlo,
   * borrá este bloque return.
   * ───────────────────────────────────────────────────────────────────── */
  return;

  var DELAY_MS = 600;
  var DISMISS_KEY = 'twkLjPromoDismissed_v1';

  // Skip if user dismissed via × this session
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
  } catch (_) {}

  // ── CSS — Pornhub vibe: black + #ff9000 orange ──────────────────────────
  var css = [
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

    // Header
    '.twk-cb-promo__header{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:9px 11px 9px;background:#000;',
      'border-bottom:1px solid #1a1a1a;gap:6px;',
    '}',
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
    '.twk-cb-promo__close{',
      'background:transparent;border:0;color:rgba(255,255,255,.5);',
      'width:22px;height:22px;border-radius:3px;padding:0;',
      'font-size:18px;line-height:1;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'margin-left:2px;',
      'transition:background .18s,color .18s;',
    '}',
    '.twk-cb-promo__close:hover{background:#1a1a1a;color:#fff;}',

    // LiveJasmin embed container — fills the cam area
    '.twk-cb-promo__cam{',
      'position:relative;display:block;width:100%;aspect-ratio:16/11;',
      'background:#000;overflow:hidden;',
    '}',
    '.twk-cb-promo__cam #object_container{',
      'position:absolute;inset:0;width:100%;height:100%;',
    '}',
    '.twk-cb-promo__cam #object_container iframe,',
    '.twk-cb-promo__cam #object_container > div,',
    '.twk-cb-promo__cam #object_container > * {',
      'width:100% !important;height:100% !important;border:0 !important;',
    '}',

    /* ─── NEXT button (top-left overlay sobre el video) ─── */
    '.twk-cb-promo__next{',
      'position:absolute;top:10px;left:10px;z-index:10;',
      'background:rgba(0,0,0,.7);color:#ff9000;',
      'border:1px solid rgba(255,144,0,.55);',
      'padding:5px 12px 5px 14px;border-radius:999px;',
      'font-family:"Anton","Bebas Neue",sans-serif;',
      'font-size:13px;font-weight:400;letter-spacing:.06em;text-transform:uppercase;',
      'cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1;',
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
      'transition:background .15s,color .15s,border-color .15s;',
    '}',
    '.twk-cb-promo__next:hover{background:#ff9000;color:#000;border-color:#ff9000;}',
    '.twk-cb-promo__next svg{width:11px;height:11px;}',

    /* ─── Mute round icon (mid-right overlay) ─── */
    '.twk-cb-promo__mute{',
      'position:absolute;top:10px;right:10px;z-index:10;',
      'width:38px;height:38px;border-radius:50%;',
      'background:rgba(0,0,0,.7);color:#fff;',
      'border:1px solid rgba(255,255,255,.2);',
      'display:flex;align-items:center;justify-content:center;',
      'cursor:pointer;padding:0;',
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
      'transition:background .15s,border-color .15s,color .15s,transform .15s;',
    '}',
    '.twk-cb-promo__mute:hover{background:rgba(255,144,0,.95);color:#000;border-color:#ff9000;transform:scale(1.05);}',
    '.twk-cb-promo__mute svg{width:18px;height:18px;display:block;}',
    '.twk-cb-promo__mute .icon-on{display:none;}',
    '.twk-cb-promo__mute.is-on .icon-off{display:none;}',
    '.twk-cb-promo__mute.is-on .icon-on{display:block;}',
    '.twk-cb-promo__mute.is-on{background:rgba(255,144,0,.9);color:#000;border-color:#ff9000;}',

    /* ─── PRIVATE countdown (bottom-right overlay) ─── */
    '.twk-cb-promo__countdown{',
      'position:absolute;bottom:10px;right:10px;z-index:10;',
      'background:rgba(0,0,0,.78);',
      'padding:5px 10px;border-radius:4px;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;',
      'font-size:10px;font-weight:800;line-height:1.2;letter-spacing:.08em;',
      'text-transform:uppercase;',
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
      'border:1px solid rgba(255,144,0,.3);',
      'display:flex;flex-direction:column;align-items:flex-end;gap:2px;',
    '}',
    '.twk-cb-promo__countdown-label{color:rgba(255,255,255,.55);font-weight:700;font-size:8.5px;}',
    '.twk-cb-promo__countdown-time{color:#ff9000;font-size:13px;letter-spacing:.04em;}',

    '@media(max-width:540px){',
      '.twk-cb-promo{width:calc(100vw - 16px);right:8px;left:8px;bottom:8px;}',
      '.twk-cb-promo__next{font-size:11px;padding:4px 10px;}',
      '.twk-cb-promo__mute{width:34px;height:34px;}',
      '.twk-cb-promo__countdown{font-size:9px;padding:4px 8px;}',
      '.twk-cb-promo__countdown-time{font-size:11px;}',
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
      '<div class="twk-cb-promo__cam">' +
        '<div id="object_container" style="width:100%;height:100%"></div>' +
        '<button type="button" class="twk-cb-promo__next" aria-label="Next model">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="9 6 15 12 9 18"/>' +
          '</svg>' +
          'Next' +
        '</button>' +
        '<button type="button" class="twk-cb-promo__mute" aria-label="Toggle sound">' +
          // Speaker with X (muted state — default)
          '<svg class="icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>' +
            '<line x1="23" y1="9" x2="17" y2="15"/>' +
            '<line x1="17" y1="9" x2="23" y2="15"/>' +
          '</svg>' +
          // Speaker with sound waves (unmuted)
          '<svg class="icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>' +
            '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
            '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
          '</svg>' +
        '</button>' +
        '<div class="twk-cb-promo__countdown" aria-label="Private show ends in">' +
          '<span class="twk-cb-promo__countdown-label">PRIVATE · ENDS IN</span>' +
          '<span class="twk-cb-promo__countdown-time" data-countdown>00:00:00</span>' +
        '</div>' +
      '</div>';

    (document.documentElement || document.body).appendChild(box);
    box.style.cssText +=
      ';position:fixed !important;bottom:14px !important;right:14px !important;' +
      'top:auto !important;left:auto !important;z-index:2147483647 !important;';
    return box;
  }

  function injectLiveJasminEmbed() {
    // The script reads the #object_container element and injects the embed
    // into it. Mark loaded so we don't double-inject on re-runs.
    if (document.getElementById('twk-lj-embed-script')) return;
    var s = document.createElement('script');
    s.id = 'twk-lj-embed-script';
    s.src =
      'https://ecdwm.com/embed/lf' +
      '?c=object_container' +
      '&site=jasmin' +
      '&cobrandId=' +
      '&psid=alexiatwerk' +
      '&pstool=202_1' +
      '&psprogram=revs' +
      '&campaign_id=' +
      '&category=girl' +
      '&forcedPerformers[]=' +
      '&vp[showChat]=' +
      '&vp[chatAutoHide]=' +
      '&vp[showCallToAction]=' +
      '&vp[showPerformerName]=' +
      '&vp[showPerformerStatus]=' +
      '&filters=vip-show+big-breast+18-22' +
      '&ms_notrack=1' +
      '&subAffId=';
    s.async = true;
    document.body.appendChild(s);
  }

  function bindClose(box) {
    var closeBtn = box.querySelector('.twk-cb-promo__close');
    if (!closeBtn) return;
    closeBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
      box.classList.remove('is-visible');
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 350);
    });
  }

  function bindNext(box){
    var nextBtn = box.querySelector('.twk-cb-promo__next');
    if (!nextBtn) return;
    nextBtn.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      // Reload el embed para traer otra modelo random.
      // Borramos el script viejo y el contenido del container, despues re-inyectamos.
      var old = document.getElementById('twk-lj-embed-script');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var container = document.getElementById('object_container');
      if (container) container.innerHTML = '';
      injectLiveJasminEmbed();
    });
  }

  function bindMute(box){
    var muteBtn = box.querySelector('.twk-cb-promo__mute');
    if (!muteBtn) return;
    muteBtn.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      // El iframe de LJ es cross-origin → no podemos controlar el audio
      // directamente. El toggle es VISUAL — el sonido real lo controla el
      // boton interno del embed (que LJ inyecta solo). Cuando el user clickea
      // nuestro boton, ademas le mandamos un click sintetico al boton de LJ
      // si lo encontramos.
      muteBtn.classList.toggle('is-on');
    });
  }

  function startCountdown(box){
    var el = box.querySelector('[data-countdown]');
    if (!el) return;
    // Random total entre 50 y 100 minutos para el "private ends in"
    var totalSec = (50 + Math.floor(Math.random() * 50)) * 60 + Math.floor(Math.random() * 60);
    function pad(n){ return n < 10 ? '0' + n : '' + n; }
    function tick(){
      if (totalSec <= 0){
        // Reset → nueva sesión privada (loop visual de urgencia)
        totalSec = (50 + Math.floor(Math.random() * 50)) * 60 + Math.floor(Math.random() * 60);
      }
      var h = Math.floor(totalSec / 3600);
      var m = Math.floor((totalSec % 3600) / 60);
      var s = totalSec % 60;
      el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
      totalSec -= 1;
    }
    tick();
    setInterval(tick, 1000);
  }

  function show() {
    injectCss();
    var box = buildSkeleton();
    if (!box) return;
    bindClose(box);
    bindNext(box);
    bindMute(box);
    startCountdown(box);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { box.classList.add('is-visible'); });
    });
    // Inject the LJ script after the container is mounted in the DOM
    injectLiveJasminEmbed();

    // GA4 + token tracking on any click inside the widget (the embed's own
    // links open in new tabs — we just record the engagement event)
    box.addEventListener('click', function () {
      try {
        if (window.dataLayer && typeof window.dataLayer.push === 'function') {
          window.dataLayer.push({
            event: 'lj_promo_click',
            promo_location: 'bottom_right_floating',
            promo_target: 'livejasmin_revs_alexiatwerk'
          });
        }
        if (window.AlexiaTokens && typeof window.AlexiaTokens.grant === 'function') {
          window.AlexiaTokens.grant(5, 'lj_promo_clicked');
        }
      } catch (_) {}
    });
  }

  function start() { setTimeout(show, DELAY_MS); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
