/*!
 * TWERKHUB · Media (clean-slate engine · 2026-04-20)
 * --------------------------------------------------------------
 * Zero heritage from any previous audio code. Anti's prescribed
 * architecture, nothing more.
 *
 *   · Cards live under the `data-twerkhub-card` attribute.
 *   · Each card has:
 *       <video muted autoplay loop playsinline preload="auto">
 *       <audio preload="none">
 *       <button data-mute>
 *   · Hover = activate (silence all other audio, unmute this card's).
 *   · Leave / window blur / empty-card hover = silence all.
 *   · 500ms watchdog: if nothing is hovered, silence all.
 *   · 3s watchdog: re-play any video that stalled (anti-clavado).
 * --------------------------------------------------------------
 */
(function() {
  'use strict';

  const STATE = { active: null };

  function silence() {
    document.querySelectorAll('audio').forEach(a => {
      a.muted = true;
      a.pause();
    });
    STATE.active = null;
  }

  function activate(card) {
    if (!card || card === STATE.active) return;
    silence();
    const a = card.querySelector('audio');
    if (!a) return;
    a.muted = false;
    a.currentTime = 0;
    a.play().catch(() => {});
    STATE.active = card;
  }

  function wire(card) {
    if (card.dataset.twerkhubWired) return;
    card.dataset.twerkhubWired = '1';
    card.addEventListener('mouseenter', () => activate(card));
    card.addEventListener('mouseleave', silence);
    const btn = card.querySelector('[data-mute]');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); silence(); });
    const v = card.querySelector('video');
    if (v) {
      v.addEventListener('pause', () => v.play().catch(() => {}));
      v.addEventListener('stalled', () => v.load());
      v.addEventListener('error', () => { v.load(); v.play().catch(() => {}); });
    }
  }

  function wireAll() {
    document.querySelectorAll('[data-twerkhub-card]').forEach(wire);
  }

  const init = () => {
    wireAll();
    new MutationObserver(wireAll).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('blur', silence);
    setInterval(() => {
      document.querySelectorAll('[data-twerkhub-card] video').forEach(v => {
        if (v.paused || v.readyState < 2) v.play().catch(() => {});
      });
    }, 3000);
    setInterval(() => {
      if (!document.querySelector('[data-twerkhub-card]:hover')) silence();
    }, 500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
