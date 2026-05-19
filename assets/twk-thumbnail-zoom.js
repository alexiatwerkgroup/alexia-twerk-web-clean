/**
 * TWERKHUB · twk-thumbnail-zoom · 2026-05-19 v1
 * ─────────────────────────────────────────────────────────────────
 * Thumbnail zoom modal with 100% viewport coverage
 * Provides immersive preview on thumbnail click
 * ───────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__twkThumbnailZoom) return;
  window.__twkThumbnailZoom = true;

  // ─────────────────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('twk-thumbnail-zoom-styles')) return;

    var style = document.createElement('style');
    style.id = 'twk-thumbnail-zoom-styles';
    style.textContent = `
      #twk-zoom-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.98);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9500;
        animation: twk-fade-in 0.3s ease;
        padding: 0;
        margin: 0;
        overflow: hidden;
      }

      #twk-zoom-modal-content {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        padding: 0;
      }

      .twk-zoom-image {
        max-width: 90vw;
        max-height: 90vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 4px;
        animation: twk-zoom-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      }

      .twk-zoom-close {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 28px;
        font-weight: 300;
        transition: all 0.2s ease;
        z-index: 9501;
        user-select: none;
      }

      .twk-zoom-close:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.4);
      }

      .twk-zoom-info {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        color: #fff;
        font-family: Inter, sans-serif;
        font-size: 13px;
        opacity: 0.8;
        text-align: center;
        z-index: 9500;
      }

      @keyframes twk-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes twk-zoom-in {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────────
  // MODAL CREATION & MANAGEMENT
  // ─────────────────────────────────────────────────────────────────
  function createZoomModal(imageSrc, videoTitle) {
    var modal = document.createElement('div');
    modal.id = 'twk-zoom-modal-overlay';

    var content = document.createElement('div');
    content.id = 'twk-zoom-modal-content';

    var img = document.createElement('img');
    img.className = 'twk-zoom-image';
    img.src = imageSrc;
    img.alt = videoTitle || 'Video preview';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'twk-zoom-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close zoom');

    var info = document.createElement('div');
    info.className = 'twk-zoom-info';
    info.textContent = videoTitle || 'Click to close or press ESC';

    content.appendChild(img);
    modal.appendChild(content);
    modal.appendChild(closeBtn);
    modal.appendChild(info);

    return { modal: modal, closeBtn: closeBtn, overlay: modal };
  }

  function showZoomModal(imageSrc, videoTitle) {
    var existing = document.getElementById('twk-zoom-modal-overlay');
    if (existing) existing.remove();

    var zoomObj = createZoomModal(imageSrc, videoTitle);
    document.body.appendChild(zoomObj.modal);

    // Focus on close button for accessibility
    zoomObj.closeBtn.focus();

    function closeModal() {
      if (zoomObj.modal && zoomObj.modal.parentElement) {
        zoomObj.modal.remove();
      }
    }

    // Close on button click
    zoomObj.closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeModal();
    });

    // Close on overlay click
    zoomObj.modal.addEventListener('click', function(e) {
      if (e.target === zoomObj.modal) {
        closeModal();
      }
    });

    // Close on ESC key
    var escapeHandler = function(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  // ─────────────────────────────────────────────────────────────────
  // THUMBNAIL DETECTION & ENHANCEMENT
  // ─────────────────────────────────────────────────────────────────
  function enhanceThumbnailsWithZoom() {
    document.querySelectorAll('[data-twk-zoom-enabled], a[href*="/playlist/"] img, .pack-thumb img, .video-thumb img').forEach(function(img) {
      if (img.dataset.twkZoomProcessed) return;
      img.dataset.twkZoomProcessed = '1';

      var parent = img.closest('a, div[class*="thumb"], div[class*="video"]');
      if (!parent) return;

      var imgSrc = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (!imgSrc) return;

      // Get title from alt, aria-label, or nearby text
      var title = img.getAttribute('alt') ||
                  img.getAttribute('aria-label') ||
                  parent.getAttribute('title') ||
                  parent.textContent?.trim()?.substring(0, 100) ||
                  'Video preview';

      // Add cursor to indicate zoom available
      img.style.cursor = 'zoom-in';
      parent.style.cursor = 'zoom-in';

      // Make parent clickable if it's not already a link
      if (parent.tagName !== 'A') {
        parent.style.cursor = 'pointer';
        parent.addEventListener('click', function(e) {
          // Don't trigger if clicking an actual link inside
          if (e.target.tagName === 'A') return;
          e.stopPropagation();
          showZoomModal(imgSrc, title);
        });
      }

      // Also add zoom on img click if parent is a link
      if (parent.tagName === 'A') {
        img.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          showZoomModal(imgSrc, title);
          return false;
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    enhanceThumbnailsWithZoom();
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Watch for dynamically added thumbnails
  if (window.MutationObserver) {
    new MutationObserver(function(mutations) {
      enhanceThumbnailsWithZoom();
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Expose API
  window.twkThumbnailZoom = {
    show: showZoomModal,
    enhance: enhanceThumbnailsWithZoom
  };

  console.log('[twk-thumbnail-zoom] Initialized - Click any thumbnail to zoom');
})();
