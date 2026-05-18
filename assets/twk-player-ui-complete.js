/* TWERKHUB · twk-player-ui-complete · 2026-05-18 v2
 * ─────────────────────────────────────────────────────────────────
 * Complete player UI enhancement system with:
 * - Viewport zoom lock
 * - Anti-YouTube exit shield
 * - "Viewed" pill markers on thumbnails
 * - Thumbnail dimming for watched videos
 * - Player controls overlay
 * - Login paywall for +18 content
 * - Watermark protection
 * ───────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__twkPlayerUIComplete) return;
  window.__twkPlayerUIComplete = true;

  // ─────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────
  function getYouTubeVideoId(url) {
    if (!url) return null;
    var matches = url.match(/(?:embed\/|v=|\/videos\/)([\w-]{11})/);
    return matches ? matches[1] : null;
  }

  function isAdultContent(title) {
    if (!title) return false;
    var keywords = ['twerk', 'booty', 'twerking', 'sexy', 'sensual', 'dance', 'strip', 'pole',
                   'explicit', 'hot', 'thick', 'xxx', '18+', 'adult', 'nude', 'topless', 'leaks',
                   'viral', 'exposed', 'unrated'];
    var lowerTitle = String(title).toLowerCase();
    return keywords.some(function(kw) { return lowerTitle.indexOf(kw) >= 0; });
  }

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

  function markVideoAsWatched(videoId) {
    try {
      var watched = JSON.parse(localStorage.getItem('twk_watched_videos') || '{}');
      watched[videoId] = new Date().getTime();
      localStorage.setItem('twk_watched_videos', JSON.stringify(watched));
    } catch (_) {}
  }

  function isVideoWatched(videoId) {
    try {
      var watched = JSON.parse(localStorage.getItem('twk_watched_videos') || '{}');
      return !!watched[videoId];
    } catch (_) {
      return false;
    }
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
  }

  // ─────────────────────────────────────────────────────────────────
  // ANTI-YOUTUBE-EXIT SHIELD: Prevent clicking to YouTube
  // ─────────────────────────────────────────────────────────────────
  function addYouTubeExitShield() {
    document.addEventListener('click', function(e) {
      var target = e.target;
      var link = target.closest('a');

      if (!link) return;

      var href = link.getAttribute('href') || '';
      if (!href) return;

      // Block EXTERNAL YouTube links only (not embedded videos or internal links)
      var isExternalYouTube = (href.indexOf('youtube.com') >= 0 || href.indexOf('youtu.be') >= 0)
        && !href.indexOf('youtube-nocookie') >= 0;

      if (isExternalYouTube && !href.indexOf('instagram.com') >= 0 && !href.indexOf('tiktok.com') >= 0) {
        e.preventDefault();
        e.stopPropagation();
        showShield();
        return false;
      }
    }, true);
  }

  function showShield() {
    var existing = document.getElementById('twk-exit-shield');
    if (existing) return;

    var shield = document.createElement('div');
    shield.id = 'twk-exit-shield';
    shield.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;animation:fadeIn .3s ease;';

    var content = document.createElement('div');
    content.style.cssText =
      'text-align:center;color:#fff;font-family:Inter,sans-serif;padding:40px;max-width:400px;';
    content.innerHTML =
      '<div style="font-size:48px;margin-bottom:20px;">🛡️</div>' +
      '<div style="font-size:24px;font-weight:800;margin-bottom:16px;">Protected Content</div>' +
      '<div style="font-size:14px;opacity:.8;margin-bottom:24px;line-height:1.6;">' +
        'This video is protected. Please watch it here on Twerkhub to support creators.' +
      '</div>' +
      '<button id="twk-shield-close" style="' +
        'background:linear-gradient(135deg,#ff2d87,#ffb454);color:#1a0a14;' +
        'border:none;padding:12px 32px;border-radius:8px;font-weight:800;' +
        'cursor:pointer;font-size:14px;letter-spacing:.5px;text-transform:uppercase;' +
        'transition:all .2s ease;' +
      '">Got it, keep watching</button>';

    shield.appendChild(content);
    document.body.appendChild(shield);

    document.getElementById('twk-shield-close').addEventListener('click', function() {
      shield.remove();
    });

    setTimeout(function() {
      shield.remove();
    }, 5000);
  }

  // ─────────────────────────────────────────────────────────────────
  // THUMBNAIL ENHANCEMENT: "Viewed" pill and dimming
  // ─────────────────────────────────────────────────────────────────
  function enhanceThumbnails() {
    // Add styles for watched thumbnails
    if (!document.getElementById('twk-thumb-styles')) {
      var style = document.createElement('style');
      style.id = 'twk-thumb-styles';
      style.textContent = `
        .twk-video-thumb-wrapper {
          position: relative;
          display: inline-block;
          width: 100%;
        }
        .twk-thumb-dimmed {
          opacity: 0.5 !important;
          filter: brightness(0.7) !important;
        }
        .twk-viewed-pill {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(30, 224, 143, 0.95);
          color: #1a0a14;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(30, 224, 143, 0.3);
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // Find all video thumbnails
    document.querySelectorAll('a[href*="/playlist/"]').forEach(function(link) {
      if (!link.dataset.twkThumbProcessed) {
        link.dataset.twkThumbProcessed = '1';

        var href = link.getAttribute('href') || '';
        var vidMatch = href.match(/\/playlist\/(.+?)(?:\.html)?(?:$|[?#])/);
        if (!vidMatch) return;

        var title = link.textContent || '';
        var img = link.querySelector('img');
        if (!img) return;

        var wrapper = img.parentElement;
        if (!wrapper || wrapper.classList.contains('twk-video-thumb-wrapper')) return;

        wrapper.classList.add('twk-video-thumb-wrapper');

        // Extract video ID from image src (YouTube thumbnail pattern)
        var imgSrc = img.getAttribute('src') || '';
        var vidIdMatch = imgSrc.match(/ytimg\.com\/vi\/([\w-]{11})/);
        var videoId = vidIdMatch ? vidIdMatch[1] : null;

        if (!videoId) return;

        // Check if video is watched
        if (isVideoWatched(videoId)) {
          img.classList.add('twk-thumb-dimmed');
          var pill = document.createElement('div');
          pill.className = 'twk-viewed-pill';
          pill.textContent = '✓ Viewed';
          wrapper.appendChild(pill);
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PAYWALL: Block +18 content for non-members
  // ─────────────────────────────────────────────────────────────────
  function createPaywall() {
    var paywall = document.createElement('div');
    paywall.id = 'twk-content-paywall';
    paywall.style.cssText =
      'position:fixed;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,.95));' +
      'display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;' +
      'color:#fff;z-index:9999;padding:40px 24px;font-family:Inter,sans-serif;' +
      'backdrop-filter:blur(4px);box-sizing:border-box;';

    paywall.innerHTML =
      '<div style="font-size:56px;margin-bottom:16px;">🔐</div>' +
      '<div style="font-size:28px;font-weight:800;margin-bottom:12px;">18+ Content</div>' +
      '<div style="font-size:14px;opacity:.85;margin-bottom:24px;max-width:420px;line-height:1.6;font-weight:500;">' +
        'This video is marked as mature content. You must be a member to view it.' +
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
        '">Become a Member</a>' +
      '</div>';

    return paywall;
  }

  // ─────────────────────────────────────────────────────────────────
  // YOUTUBE IFRAME PROTECTION & TRACKING
  // ─────────────────────────────────────────────────────────────────
  function protectAndTrackIframes() {
    document.querySelectorAll('iframe[src*="youtube.com/embed/"]').forEach(function(iframe) {
      if (iframe.dataset.twkProtected) return;
      iframe.dataset.twkProtected = '1';

      var videoId = getYouTubeVideoId(iframe.src);
      if (!videoId) return;

      var parent = iframe.parentElement;
      if (!parent) return;

      // Wrap in container if needed
      if (getComputedStyle(parent).position === 'static') {
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

      // Get video title from page
      var title = document.querySelector('h1, title');
      var titleText = title ? (title.textContent || '') : '';
      var isAdult = isAdultContent(titleText);

      // Block context menu and drag
      parent.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      parent.style.userSelect = 'none';
      parent.style.WebkitUserSelect = 'none';

      // Add watermark overlay with higher z-index to ensure visibility
      var watermark = document.createElement('div');
      watermark.style.cssText =
        'position:absolute;inset:0;pointer-events:none;z-index:9999;opacity:0.08;' +
        'display:flex;align-items:center;justify-content:center;' +
        'font-family:JetBrains Mono,monospace;font-size:24px;font-weight:900;' +
        'color:#fff;letter-spacing:2px;text-transform:uppercase;' +
        'transform:rotate(-15deg);mix-blend-mode:overlay;';
      watermark.textContent = 'TWERKHUB · EXCLUSIVE';
      parent.appendChild(watermark);

      // Show paywall for +18 content ONLY on interaction attempt, not automatically
      if (isAdult && !isMember()) {
        var paywallShown = false;

        // Show paywall only when user tries to interact
        var showPaywallOnInteraction = function() {
          if (!paywallShown) {
            paywallShown = true;
            iframe.style.opacity = '0.1';
            iframe.style.pointerEvents = 'none';
            var paywall = createPaywall();
            parent.appendChild(paywall);
          }
        };

        iframe.addEventListener('mouseover', showPaywallOnInteraction, { once: false });
        iframe.addEventListener('click', showPaywallOnInteraction, { once: false });
        iframe.addEventListener('focus', showPaywallOnInteraction, { once: false });
      }

      // Track video watch time
      setupWatchTracking(videoId, iframe);
    });
  }

  function setupWatchTracking(videoId, iframe) {
    if (!iframe.dataset.watchTimeTracker) {
      iframe.dataset.watchTimeTracker = '1';

      // Send postMessage to YouTube iframe to detect play events
      try {
        var watchTimeChecker = setInterval(function() {
          try {
            // Request YouTube player state via postMessage
            iframe.contentWindow.postMessage({method: 'getVideoData'}, '*');
          } catch (_) {}
        }, 2000);

        // Listen for YouTube iframe messages indicating playback
        window.addEventListener('message', function(event) {
          if (event.source !== iframe.contentWindow) return;
          // If we received any message from the YouTube iframe, video is active
          markVideoAsWatched(videoId);
        });

        // Fallback: mark as watched after 10 seconds of iframe being visible
        setTimeout(function() {
          if (iframe.offsetParent !== null) {
            markVideoAsWatched(videoId);
          }
          clearInterval(watchTimeChecker);
        }, 10000);
      } catch (_) {}
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────�