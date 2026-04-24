/*!
 * TWERKHUB · Magnetic Cursor — 2026-04-24
 * --------------------------------------------------------------
 * Custom dual cursor (dot + ring) with:
 *  · Smooth lerp follow (ring trails 160ms behind dot)
 *  · Magnetic pull on [data-magnet] / buttons / cards / links
 *  · Scale-up on hover of interactive elements
 *  · Auto-disable on touch devices (no cursor anyway)
 *  · Respects `prefers-reduced-motion`
 *
 * Zero HTML touching. Mounts on DOMContentLoaded, self-idempotent.
 * Hides the native cursor only on non-touch with pointer:fine.
 * --------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.__twerkhubCursorInit) return;
  window.__twerkhubCursorInit = true;

  // Guard: touch devices, reduced-motion users, mobile-only platforms
  try {
    if (!window.matchMedia) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) return;
  } catch (_) { return; }

  // Inject minimal styles
  var style = document.createElement('style');
  style.id = 'twerkhub-cursor-style';
  style.textContent = [
    'html.twk-cursor-on, html.twk-cursor-on body, ',
    'html.twk-cursor-on a, html.twk-cursor-on button, ',
    'html.twk-cursor-on [role="button"], html.twk-cursor-on input, ',
    'html.twk-cursor-on textarea, html.twk-cursor-on .vcard, ',
    'html.twk-cursor-on .twerkhub-fp-card, html.twk-cursor-on .twerkhub-btn, ',
    'html.twk-cursor-on label { cursor: none !important; }',
    'html.twk-cursor-on input, html.twk-cursor-on textarea { cursor: text !important; }',
    '.twk-cursor-dot {',
    '  position: fixed; top: 0; left: 0; width: 8px; height: 8px;',
    '  border-radius: 50%; background: #ff2d87;',
    '  box-shadow: 0 0 14px rgba(255, 45, 135, 0.75), 0 0 28px rgba(255, 45, 135, 0.4);',
    '  transform: translate3d(-100px, -100px, 0);',
    '  pointer-events: none; z-index: 2147483646;',
    '  transition: transform 0.08s linear, background 0.25s ease, opacity 0.3s ease, width 0.25s ease, height 0.25s ease;',
    '  mix-blend-mode: screen;',
    '  will-change: transform;',
    '}',
    '.twk-cursor-ring {',
    '  position: fixed; top: 0; left: 0; width: 36px; height: 36px;',
    '  border-radius: 50%; border: 1.5px solid rgba(255, 45, 135, 0.65);',
    '  transform: translate3d(-100px, -100px, 0);',
    '  pointer-events: none; z-index: 2147483645;',
    '  transition: width 0.32s cubic-bezier(.22,.9,.38,1), height 0.32s cubic-bezier(.22,.9,.38,1), border-color 0.32s ease, background 0.32s ease, opacity 0.3s ease;',
    '  will-change: transform;',
    '  backdrop-filter: invert(.08);',
    '  -webkit-backdrop-filter: invert(.08);',
    '}',
    '.twk-cursor-ring.is-hover {',
    '  width: 64px; height: 64px;',
    '  border-color: rgba(255, 180, 84, 0.9);',
    '  background: rgba(255, 45, 135, 0.08);',
    '}',
    '.twk-cursor-ring.is-click {',
    '  width: 28px; height: 28px;',
    '  border-color: rgba(255, 255, 255, 0.9);',
    '}',
    '.twk-cursor-dot.is-hover { width: 4px; height: 4px; background: #ffb454; }',
    '.twk-cursor-hidden .twk-cursor-dot, .twk-cursor-hidden .twk-cursor-ring { opacity: 0; }',
    '/* Iframes steal pointer events, so hide our cursor when hovering YouTube/any iframe */',
    'iframe:hover ~ .twk-cursor-dot, iframe:hover ~ .twk-cursor-ring { opacity: 0; }'
  ].join('\n');
  document.head.appendChild(style);

  // Mount dual cursor
  var dot = document.createElement('div');
  dot.className = 'twk-cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  var ring = document.createElement('div');
  ring.className = 'twk-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  function bootDOM() {
    document.documentElement.classList.add('twk-cursor-on');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
  }
  if (document.body) bootDOM();
  else document.addEventListener('DOMContentLoaded', bootDOM, { once: true });

  // Position state
  var mx = -100, my = -100;       // current mouse
  var rx = -100, ry = -100;       // ring lerp target
  var dotX = -100, dotY = -100;   // dot position (near-instant)

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    // Magnetic pull: if hovering a magnet target, snap toward its center
    var el = document.elementFromPoint(mx, my);
    if (el) {
      var magnet = el.closest && el.closest(
        '[data-magnet], .twerkhub-btn, .twerkhub-fp-cta, .twerkhub-btn-primary, .twerkhub-btn-gold'
      );
      if (magnet) {
        var r = magnet.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        // Soft pull: move 25% of the way from mouse toward element center
        mx = mx + (cx - mx) * 0.22;
        my = my + (cy - my) * 0.22;
      }
    }
  }

  function onDown() { ring.classList.add('is-click'); }
  function onUp()   { ring.classList.remove('is-click'); }

  function onOver(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var hot = t.closest(
      'a, button, [role="button"], .vcard, .twerkhub-fp-card, .twerkhub-club-card, ' +
      '.twerkhub-btn, .rk-item, .twerkhub-fp-cta, [data-magnet], [data-hot]'
    );
    if (hot) {
      ring.classList.add('is-hover');
      dot.classList.add('is-hover');
    } else {
      ring.classList.remove('is-hover');
      dot.classList.remove('is-hover');
    }
  }
  function onLeave() {
    document.documentElement.classList.add('twk-cursor-hidden');
  }
  function onEnter() {
    document.documentElement.classList.remove('twk-cursor-hidden');
  }

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mousedown', onDown, { passive: true });
  document.addEventListener('mouseup', onUp, { passive: true });
  document.addEventListener('mouseover', onOver, { passive: true });
  document.addEventListener('mouseleave', onLeave);
  document.addEventListener('mouseenter', onEnter);

  // Lerp animation loop
  (function tick() {
    // Dot moves fast
    dotX += (mx - dotX) * 0.5;
    dotY += (my - dotY) * 0.5;
    dot.style.transform = 'translate3d(' + (dotX - 4) + 'px, ' + (dotY - 4) + 'px, 0)';
    // Ring trails
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    var size = ring.classList.contains('is-hover') ? 32 : (ring.classList.contains('is-click') ? 14 : 18);
    ring.style.transform = 'translate3d(' + (rx - size) + 'px, ' + (ry - size) + 'px, 0)';
    requestAnimationFrame(tick);
  })();

  console.info('[twerkhub-cursor] magnetic cursor armed');
})();
