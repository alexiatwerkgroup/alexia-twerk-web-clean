/* ═══ TWERKHUB · CHATURBATE AFFILIATE PROMO WIDGET ═══
 * v20260506-p1
 *
 * Floating bottom-right CTA banner that drives traffic through
 * Alexia's Chaturbate broadcaster affiliate link to earn tokens.
 *
 * - Auto-injects after 4s delay (lets the user see the page first)
 * - Dismissible — sessionStorage remembers the close click
 * - Mobile responsive: shrinks + repositions on small screens
 * - SEO-safe: rel="sponsored noopener nofollow" + target="_blank"
 * - Self-contained: no dependencies, idempotent, single file
 */
(function () {
  'use strict';
  if (window.__twkCbPromoInit) return;
  window.__twkCbPromoInit = true;

  var DISMISS_KEY = 'twkCbPromoDismissed_v1';
  var DELAY_MS = 4000;
  var URL =
    'https://chaturbate.com/in/?tour=LQps&campaign=Re5nr&track=default&room=manager_modelos_sin_dinero';

  // Skip if user dismissed this session
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
  } catch (_) {}

  // ── CSS ──────────────────────────────────────────────────────────────────
  var css =
    '.twk-cb-promo{' +
      'position:fixed;bottom:16px;right:16px;width:300px;max-width:calc(100vw - 32px);' +
      'background:linear-gradient(135deg,#1a0a1f 0%,#2a0f3d 50%,#0a0a14 100%);' +
      'border:1px solid rgba(255,144,0,.55);' +
      'border-radius:14px;' +
      'box-shadow:0 12px 36px rgba(255,46,135,.25),0 4px 14px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);' +
      'padding:14px 16px 14px 16px;' +
      'font-family:"Inter",ui-sans-serif,system-ui,sans-serif;' +
      'color:#fff;' +
      'z-index:9999;' +
      'opacity:0;transform:translateY(20px);' +
      'transition:opacity .35s ease,transform .35s ease;' +
      'pointer-events:auto;' +
    '}' +
    '.twk-cb-promo.is-visible{opacity:1;transform:translateY(0)}' +
    '.twk-cb-promo__close{' +
      'position:absolute;top:8px;right:10px;' +
      'background:none;border:0;color:rgba(255,255,255,.55);' +
      'font-size:18px;line-height:1;cursor:pointer;padding:4px 6px;' +
      'border-radius:6px;transition:color .2s,background .2s;' +
    '}' +
    '.twk-cb-promo__close:hover{color:#fff;background:rgba(255,255,255,.08)}' +
    '.twk-cb-promo__header{' +
      'display:flex;align-items:center;gap:7px;margin-bottom:8px;' +
    '}' +
    '.twk-cb-promo__dot{' +
      'width:8px;height:8px;border-radius:50%;background:#1ee08f;' +
      'box-shadow:0 0 8px #1ee08f;' +
      'animation:twkCbPulse 1.6s ease-in-out infinite;' +
    '}' +
    '@keyframes twkCbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}' +
    '.twk-cb-promo__live-label{' +
      'font-family:"JetBrains Mono",ui-monospace,monospace;' +
      'font-size:9.5px;font-weight:800;letter-spacing:.18em;' +
      'color:#1ee08f;text-transform:uppercase;' +
    '}' +
    '.twk-cb-promo__title{' +
      'font-family:"Anton","Bebas Neue",sans-serif;' +
      'font-size:22px;font-weight:400;line-height:1.05;letter-spacing:.01em;' +
      'color:#fff;margin-bottom:6px;text-transform:uppercase;' +
    '}' +
    '.twk-cb-promo__title span{color:#ff9000}' +
    '.twk-cb-promo__sub{' +
      'font-size:12px;line-height:1.45;color:rgba(230,230,240,.78);' +
      'margin-bottom:12px;' +
    '}' +
    '.twk-cb-promo__cta{' +
      'display:block;width:100%;text-align:center;' +
      'padding:10px 14px;' +
      'background:linear-gradient(90deg,#ff2d87 0%,#ff9000 100%);' +
      'color:#000;text-decoration:none;' +
      'font-family:"JetBrains Mono",ui-monospace,monospace;' +
      'font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;' +
      'border-radius:8px;' +
      'box-shadow:0 4px 14px rgba(255,45,135,.4);' +
      'transition:transform .2s,box-shadow .2s,filter .2s;' +
      'cursor:pointer;' +
    '}' +
    '.twk-cb-promo__cta:hover{' +
      'transform:translateY(-1px);' +
      'box-shadow:0 6px 20px rgba(255,45,135,.55);' +
      'filter:brightness(1.08);' +
    '}' +
    '.twk-cb-promo__foot{' +
      'margin-top:8px;font-size:9.5px;color:rgba(230,230,240,.4);' +
      'text-align:center;letter-spacing:.06em;' +
    '}' +
    /* Mobile */
    '@media(max-width:540px){' +
      '.twk-cb-promo{' +
        'width:calc(100vw - 24px);right:12px;left:12px;bottom:12px;' +
        'padding:12px 14px;' +
      '}' +
      '.twk-cb-promo__title{font-size:19px}' +
      '.twk-cb-promo__sub{font-size:11.5px}' +
    '}' +
    /* If TOKENS pill HUD is in floating mode (hasn't been relocated to nav),
       lift the promo above it on mobile so they don't overlap */
    '@media(max-width:540px){' +
      'body.twerkhub-ph-theme .twk-cb-promo{bottom:74px}' +
    '}';

  function injectCss() {
    if (document.getElementById('twk-cb-promo-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-cb-promo-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  function buildDom() {
    if (document.querySelector('.twk-cb-promo')) return null;
    var box = document.createElement('div');
    box.className = 'twk-cb-promo';
    box.setAttribute('role', 'complementary');
    box.setAttribute('aria-label', 'Cam model affiliate promo');
    box.innerHTML =
      '<button class="twk-cb-promo__close" type="button" aria-label="Cerrar promo">×</button>' +
      '<div class="twk-cb-promo__header">' +
        '<span class="twk-cb-promo__dot" aria-hidden="true"></span>' +
        '<span class="twk-cb-promo__live-label">CASTING NOW · WEEKLY PAYOUT</span>' +
      '</div>' +
      '<div class="twk-cb-promo__title">EARN <span>$5K+</span> A WEEK</div>' +
      '<div class="twk-cb-promo__sub">Become a cam model. Free signup, work from home, your hours, your rules. Pago semanal en USD.</div>' +
      '<a class="twk-cb-promo__cta" href="' + URL + '" target="_blank" rel="sponsored noopener nofollow">' +
        'START EARNING →' +
      '</a>' +
      '<div class="twk-cb-promo__foot">18+ ONLY · powered by Chaturbate</div>';

    document.body.appendChild(box);

    // Bind events
    var closeBtn = box.querySelector('.twk-cb-promo__close');
    closeBtn.addEventListener('click', function () {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
      box.classList.remove('is-visible');
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 350);
    });

    // Track CTA click via dataLayer if GA4 is present
    var cta = box.querySelector('.twk-cb-promo__cta');
    cta.addEventListener('click', function () {
      try {
        if (window.dataLayer && typeof window.dataLayer.push === 'function') {
          window.dataLayer.push({
            event: 'cb_promo_click',
            promo_location: 'bottom_right_floating',
            promo_target: 'chaturbate_broadcaster_signup'
          });
        }
        // Also award a few tokens client-side as a reward for engagement
        if (window.AlexiaTokens && typeof window.AlexiaTokens.grant === 'function') {
          window.AlexiaTokens.grant(5, 'cb_promo_clicked');
        }
      } catch (_) {}
    });

    return box;
  }

  function show() {
    injectCss();
    var box = buildDom();
    if (!box) return;
    // Trigger entrance animation on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        box.classList.add('is-visible');
      });
    });
  }

  function start() {
    setTimeout(show, DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
