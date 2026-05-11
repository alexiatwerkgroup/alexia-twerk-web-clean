/*!
 * TWERKHUB · Inline video swap for related/recommended cards (v20260511-p1)
 *
 * Converts clicks on .twk-rcard (related videos) to inline iframe loads
 * instead of navigating away. Keeps user on the same page while playing
 * different videos. Integrates with age-gate paywall for +18 protection.
 */
(function(){
  'use strict';

  if (window.__twkPlInlineSwapInit) return;
  window.__twkPlInlineSwapInit = true;

  // Main player iframe
  var player = document.getElementById('twerkhub-pl-player');
  var playerWrap = player ? (player.closest('.twerkhub-pl-player-wrap') || player.parentNode) : null;

  if (!player || !playerWrap) return; // Only on pages with inline player

  // Video ID regex (YouTube 11-char format)
  var VID_PATTERN = /[\w-]{6,}/;

  /**
   * Extract YouTube video ID from a URL
   * Looks for patterns in:
   *  - embed/VID?...
   *  - watch?v=VID
   *  - youtu.be/VID
   *  - i.ytimg.com/vi/VID
   */
  function extractVidFromUrl(url) {
    if (!url) return null;
    var m = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/i\.ytimg\.com\/vi\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    return null;
  }

  /**
   * Extract video ID from a .twk-rcard by fetching its img src
   */
  function getVidFromCard(card) {
    var img = card.querySelector('img[src*="i.ytimg.com"]');
    if (!img) return null;
    return extractVidFromUrl(img.src);
  }

  /**
   * Load a video into the inline iframe
   */
  function loadVideo(vid) {
    if (!vid || !player) return;

    // Build YouTube embed URL
    var embedUrl = 'https://www.youtube-nocookie.com/embed/' + vid +
                   '?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1';

    player.src = embedUrl;

    // Mark as viewed + grant tokens (if handlers exist)
    if (window.TwerkhubPlTheater && window.TwerkhubPlTheater.markViewed) {
      try { window.TwerkhubPlTheater.markViewed(vid); } catch(_){}
    }
    if (window.TwerkhubPlTheater && window.TwerkhubPlTheater.armPaywallHeartbeat) {
      try { window.TwerkhubPlTheater.armPaywallHeartbeat(vid); } catch(_){}
    }

    // Update page title and meta
    updatePageMeta(vid);

    // Scroll to player
    player.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Update page title/meta when video changes
   * (basic implementation — full update requires server-side data)
   */
  function updatePageMeta(vid) {
    // Placeholder: in a real app, fetch video metadata from API
    // For now, just update the visible "Now playing" label if it exists
    var nowPlayingLabel = document.querySelector('.twerkhub-pl-player-meta h2');
    if (nowPlayingLabel) {
      nowPlayingLabel.textContent = 'Loading...';
    }
  }

  /**
   * Click handler for .twk-rcard
   */
  function onCardClick(ev) {
    var card = ev.target.closest('.twk-rcard');
    if (!card) return;

    // Extract video ID from card image
    var vid = getVidFromCard(card);
    if (!vid) {
      // Fallback: try to extract from href if present
      var href = card.getAttribute('href');
      if (href) vid = extractVidFromUrl(href);
    }

    if (vid) {
      ev.preventDefault();
      ev.stopPropagation();
      loadVideo(vid);
    }
  }

  // Attach click listener
  document.addEventListener('click', onCardClick, true); // capture phase for early interception

  // Public API for other scripts
  window.TwerkhubPlInlineSwap = {
    loadVideo: loadVideo,
    getVidFromCard: getVidFromCard,
    extractVidFromUrl: extractVidFromUrl
  };
})();
