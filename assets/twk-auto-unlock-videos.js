/* TWERKHUB · Locked-video iframe loader + paywall overlay · 2026-05-09 v2
 * ───────────────────────────────────────────────────────────────────
 * For every `.vd-player.vd-locked` element on the page:
 *   1. Inject the standard YouTube iframe BEHIND the lock modal so
 *      the thumbnail / preview still loads from YouTube.
 *   2. Keep the existing `.vd-lock-modal` rendered ON TOP as a paywall
 *      overlay (positioned absolute, semi-transparent backdrop).
 *   3. Don't remove `vd-locked` — the lock styles still apply, but
 *      now they sit on top of a real iframe rather than replace it.
 *
 * Result: user sees a real video preview behind a translucent paywall
 *  Discord/Telegram CTA. If they age-verify on YouTube and come back,
 *  the iframe will play normally — and our overlay can be removed via
 *  the existing membership flow.
 *
 * If the user is a paying member (`alexia_role === 'founder'` or tier
 *  in {premium,vip}), we hide the overlay entirely and let the video
 *  play unblocked.
 * ─────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__twkAutoUnlockV2) return;
  window.__twkAutoUnlockV2 = true;

  var ORIGIN = 'https%3A%2F%2Falexiatwerkgroup.com';

  function isUnlockedMember() {
    try {
      var role = String(localStorage.getItem('alexia_role') || '').replace(/"/g, '').toLowerCase();
      if (role === 'founder') return true;
      var tier = String(localStorage.getItem('alexia_tokens_v1.tier') || '').replace(/"/g, '').toLowerCase();
      if (tier === 'vip' || tier === 'premium') return true;
      // Founder by email
      var auth = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}');
      var email = auth && auth.user && String(auth.user.email || '').toLowerCase().trim();
      if (email === 'alexiatwerkoficial@gmail.com') return true;
    } catch (_) {}
    return false;
  }

  function buildIframe(vid, title) {
    var src =
      'https://www.youtube.com/embed/' + encodeURIComponent(vid) +
      '?autoplay=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1' +
      '&widget_referrer=' + ORIGIN +
      '&origin=' + ORIGIN;
    var f = document.createElement('iframe');
    f.setAttribute('src', src);
    f.setAttribute('title', String(title || vid).slice(0, 200));
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('loading', 'lazy');
    f.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:0;' +
      'background:#000;';
    return f;
  }

  function styleLockedContainer(el) {
    // Make .vd-player position:relative so the iframe + overlay layer correctly.
    el.style.position = 'relative';
    el.style.minHeight = el.style.minHeight || '480px';
    el.style.overflow = 'hidden';
    el.style.background = '#000';
    el.style.borderRadius = el.style.borderRadius || '12px';
  }

  function styleOverlay(modal) {
    // The .vd-lock-modal becomes a translucent overlay above the iframe.
    modal.style.position = 'absolute';
    modal.style.inset = '0';
    modal.style.zIndex = '2';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(5,5,12,.78)';
    modal.style.backdropFilter = 'blur(14px)';
    modal.style.webkitBackdropFilter = 'blur(14px)';
    // Make the inner content stand out
    var inner = modal.querySelector('.vd-lock-padlock, .vd-lock-title, .vd-lock-body, .vd-lock-cta');
    if (inner) {
      modal.style.textAlign = 'center';
    }
  }

  function processOne(el) {
    if (!el || el.dataset.twkUnlockProcessed === '1') return;
    el.dataset.twkUnlockProcessed = '1';
    var vid = el.getAttribute('data-vid') || '';
    if (!vid) return;
    var title = (document.querySelector('h1.vd-title') || {}).textContent ||
                document.title || ('Video · ' + vid);
    styleLockedContainer(el);

    // Find existing lock modal (if present)
    var modal = el.querySelector('.vd-lock-modal');

    // Build & insert iframe behind the modal
    var iframe = buildIframe(vid, title);
    if (modal) {
      el.insertBefore(iframe, modal);
      styleOverlay(modal);
      // If the user is a paying member, hide the paywall entirely.
      if (isUnlockedMember()) {
        modal.style.display = 'none';
      }
    } else {
      // No modal? just append the iframe and remove the locked class.
      el.appendChild(iframe);
      el.classList.remove('vd-locked');
    }
  }

  function run() {
    var nodes = document.querySelectorAll('.vd-player.vd-locked');
    for (var i = 0; i < nodes.length; i++) processOne(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  // Expose so the membership-success flow can re-evaluate and remove the overlay.
  window.twkAutoUnlock = {
    rerun: run,
    hideOverlayIfMember: function () {
      if (!isUnlockedMember()) return;
      var modals = document.querySelectorAll('.vd-player.vd-locked .vd-lock-modal');
      for (var i = 0; i < modals.length; i++) modals[i].style.display = 'none';
    },
  };
})();
