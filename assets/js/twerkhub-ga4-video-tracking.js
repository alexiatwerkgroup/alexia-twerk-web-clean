/**
 * TWERKHUB · GA4 Video Tracking
 * Auto-tracks HTML5 <video> milestones: start, 25%, 50%, 75%, complete.
 * Safe with YouTube iframes (does NOT instrument them — would need YT IFrame API).
 *
 * Each event includes: page_path, page_title, video_src, video_id, video_title, percent.
 * Each milestone fires only ONCE per video per page load.
 */
(function() {
  'use strict';

  // No-op if gtag is not loaded
  function safeGtag() {
    if (typeof window.gtag === 'function') {
      window.gtag.apply(null, arguments);
    }
  }

  function pageMeta() {
    return {
      page_path: location.pathname,
      page_title: document.title
    };
  }

  function videoMeta(video) {
    return {
      video_src: video.currentSrc || video.src || '',
      video_id: video.id || (video.dataset && video.dataset.videoId) || '',
      video_title: (video.dataset && (video.dataset.title || video.dataset.videoTitle)) || video.title || document.title
    };
  }

  function instrument(video) {
    if (video.__twerkhubGa4Instrumented) return;
    video.__twerkhubGa4Instrumented = true;

    var fired = {};

    function fire(event, extra) {
      if (fired[event]) return;
      fired[event] = true;
      var data = {};
      Object.assign(data, pageMeta(), videoMeta(video), extra || {});
      safeGtag('event', event, data);
    }

    video.addEventListener('play', function() {
      fire('video_start', { percent: 0 });
    }, { passive: true });

    video.addEventListener('timeupdate', function() {
      var d = video.duration;
      if (!d || !isFinite(d)) return;
      var pct = (video.currentTime / d) * 100;
      if (pct >= 25) fire('video_progress_25', { percent: 25 });
      if (pct >= 50) fire('video_progress_50', { percent: 50 });
      if (pct >= 75) fire('video_progress_75', { percent: 75 });
    }, { passive: true });

    video.addEventListener('ended', function() {
      fire('video_complete', { percent: 100 });
    }, { passive: true });
  }

  function instrumentAll() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) instrument(videos[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instrumentAll, { once: true });
  } else {
    instrumentAll();
  }

  // Watch for dynamically added videos
  if (window.MutationObserver && document.body) {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeName === 'VIDEO') {
            instrument(n);
          } else if (n.querySelectorAll) {
            var nested = n.querySelectorAll('video');
            for (var k = 0; k < nested.length; k++) instrument(nested[k]);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
