/* TWERKHUB · twk-player-wrapper · 2026-05-18 v1
 * ─────────────────────────────────────────────────────────────────
 * Wraps YouTube player with anti-clipping protection and login paywall
 * Works seamlessly with existing YouTube embed infrastructure
 * ───────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__twkPlayerWrapper) return;
  window.__twkPlayerWrapper = true;

  // ─────────────────────────────────────────────────────────────────
  // MEMBER DETECTION
  // ─────────────────────────────────────────────────────────────────
  function isMember() {
    try {
      var auth = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}');
      var email = auth && auth.user && String(auth.user.email || '').toLowerCase().trim();
      if (email === 'alexiatwerkoficial@gmail.com') return true;

      var tier = String(
        localStorage.getItem('alexia_tokens_v1.tier') ||
        localStorage.getItem('twk_tier') || ''
      ).replace(/"/g, '').toLowerCase().trim();
      if (tier === 'vip' || tier === 'premium' || tier === 'founder') return true;
    } catch (_) {}
    return false;
  }

  // ─────────────────────────────────────────────────────────────────
  // VIEWPORT LOCKING: Prevent zoom-out to Windows desktop
  // ─────────────────────────────────────────────────────────────────
  function lockViewport() {
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';

    // Prevent pinch zoom
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevent scroll wheel zoom
    document.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    }, { passive: false });

    // Lock HTML and body to viewport
    document.documentElement.style.width = '100vw';
    document.documentElement.style.height = '100vh';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }

  // ─────────────────────────────────────────────────────────────────
  // ANTI-CLIPPING: Watermark Overlay
  // ─────────────────────────────────────────────────────────────────
  function createWatermarkOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'twk-player-watermark';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'pointer-events:none;z-index:10;opacity:0.08;' +
      'font-family:"JetBrains Mono",monospace;font-size:24px;font-weight:900;' +
      'color:#fff;letter-spacing:2px;text-transform:uppercase;' +
      'background:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.02) 10px,rgba(255,255,255,.02) 20px);' +
      'transform:rotate(-15deg);mix-blend-mode:overlay;';
    overlay.textContent = 'TWERKHUB · EXCLUSIVE · NO REPOST';
    return overlay;
  }

  // ─────────────────────────────────────────────────────────────────
  // ANTI-CLIPPING: Disable Right-Click and Context Menu
  // ─────────────────────────────────────────────────────────────────
  function blockContextMenu(element) {
    element.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // ANTI-SCREENSHOT: Disable drag and selection
  // ─────────────────────────────────────────────────────────────────
  function blockDragAndSelection(element) {
    element.addEventListener('dragstart', function (e) {
      e.preventDefault();
      return false;
    });
    element.addEventListener('drag', function (e) {
      e.preventDefault();
      return false;
    });
    element.style.userSelect = 'none';
    element.style.WebkitUserSelect = 'none';
    element.style.MozUserSelect = 'none';
    element.style.msUserSelect = 'none';
  }

  // ─────────────────────────────────────────────────────────────────
  // LOGIN PAYWALL: For +18 content
  // ─────────────────────────────────────────────────────────────────
  function createLoginPaywall(videoId) {
    var overlay = document.createElement('div');
    overlay.className = 'twk-player-paywall';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Login required');
    overlay.style.cssText =
      'position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,.95));' +
      'display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;' +
      'color:#fff;z-index:30;padding:40px 24px;font-family:"Inter",ui-sans-serif,sans-serif;' +
      'box-sizing:border-box;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';

    var html =
      '<div style="font-size:56px;margin-bottom:16px;line-height:1;">🔐</div>' +
      '<div style="font-size:24px;font-weight:800;margin-bottom:12px;letter-spacing:-.5px;">18+ Content</div>' +
      '<div style="font-size:14px;opacity:.85;margin-bottom:24px;max-width:420px;line-height:1.6;font-weight:500;">' +
        'This video is marked as mature content. You must be logged in as a member to view it.' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px;">' +
        '<a href="/account.html" style="' +
          'background:linear-gradient(135deg,#ff2d87,#ffb454);' +
          'color:#1a0a14;padding:14px 24px;border-radius:8px;font-weight:800;' +
          'text-decoration:none;font-size:14px;letter-spacing:.5px;' +
          'text-transform:uppercase;display:inline-block;transition:all .2s ease;' +
        '">Sign In</a>' +
        '<a href="/membership" style="' +
          'background:rgba(255,255,255,.1);color:#fff;padding:12px 24px;' +
          'border:1px solid rgba(255,255,255,.2);border-radius:8px;' +
          'font-weight:700;text-decoration:none;font-size:13px;' +
          'letter-spacing:.3px;text-transform:uppercase;' +
        '">Become a member</a>' +
      '</div>';

    overlay.innerHTML = html;
    return overlay;
  }

  // ─────────────────────────────────────────────────────────────────
  // PROCESS YOUTUBE IFRAMES: Wrap with protection and paywall
  // ─────────────────────────────────────────────────────────────────
  function processIframes() {
    var iframes = document.querySelectorAll('iframe[src*="youtube.com/embed/"]');

    Array.prototype.forEach.call(iframes, function (iframe) {
      if (iframe.dataset.twkProcessed) return;
      iframe.dataset.twkProcessed = '1';

      // Extract video ID from iframe src
      var vidMatch = iframe.src.match(/\/embed\/([\w-]{11})/);
      if (!vidMatch) return;
      var vidId = vidMatch[1];

      // Get parent container or create one
      var parent = iframe.parentElement;
      if (!parent || getComputedStyle(parent).position === 'static') {
        var container = document.createElement('div');
        container.style.cssText =
          'position:relative;width:100%;aspect-ratio:16/9;' +
          'background:#000;border-radius:8px;overflow:hidden;';
        iframe.parentElement.insertBefore(container, iframe);
        container.appendChild(iframe);
        parent = container;
      } else {
        parent.style.position = 'relative';
      }

      // Check if +18 content
      var isAdult = parent.dataset.twkAdult === '1' || iframe.dataset.twkAdult === '1';

      // Apply anti-clipping protections
      blockContextMenu(parent);
      blockDragAndSelection(parent);

      // Add watermark
      var watermark = createWatermarkOverlay();
      parent.appendChild(watermark);

      // Apply paywall if needed and user is not member
      if (isAdult && !isMember()) {
        iframe.style.opacity = '0.15';
        iframe.style.pointerEvents = 'none';
        var paywall = createLoginPaywall(vidId);
        parent.appendChild(paywall);
      }

      // Lock viewport
      lockViewport();
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────────
  function init() {
    processIframes();
    if (window.MutationObserver) {
      new MutationObserver(processIframes).observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(init, 1000);
  setTimeout(init, 3000);
})();
