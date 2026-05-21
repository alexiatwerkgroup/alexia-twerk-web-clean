/* thumb-fallback.js v2026-05-20-stable
   TWERKHUB thumbnail gray placeholder fix.
   Scope: thumbnails only.
   - Does NOT touch paywall, locks, playlist data, Top 5, layout, or video players.
   - Replaces gray/120x90 YouTube placeholders with the first real available thumbnail.
   - Keeps cards clickable even when a thumbnail is unavailable.
*/
(function () {
  'use strict';

  if (window.__twerkhubThumbFallbackStable) return;
  window.__twerkhubThumbFallbackStable = true;

  var VARIANTS = [
    'maxresdefault.jpg',
    'sddefault.jpg',
    'hqdefault.jpg',
    'mqdefault.jpg',
    '0.jpg',
    '1.jpg',
    '2.jpg',
    '3.jpg',
    'default.jpg'
  ];

  var pending = Object.create(null);

  function extractIdFromString(value) {
    if (!value) return null;
    var s = String(value);
    var m = s.match(/(?:i\.ytimg\.com\/vi\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    m = s.match(/\/([A-Za-z0-9_-]{11})(?:[/?#.]|$)/);
    return m ? m[1] : null;
  }

  function getVideoId(img) {
    if (!img) return null;
    if (img.dataset) {
      var keys = ['vid', 'videoId', 'youtubeId', 'ytId', 'twkOriginalVid'];
      for (var i = 0; i < keys.length; i++) {
        if (img.dataset[keys[i]]) return img.dataset[keys[i]];
      }
    }
    var fromSrc = extractIdFromString(img.currentSrc || img.src || img.getAttribute('src'));
    if (fromSrc) return fromSrc;

    var node = img;
    while (node && node !== document.documentElement) {
      if (node.getAttribute) {
        var dv = node.getAttribute('data-vid') || node.getAttribute('data-video-id') || node.getAttribute('data-youtube-id') || node.getAttribute('data-yt-id');
        if (dv && /^[A-Za-z0-9_-]{11}$/.test(dv)) return dv;
        var href = node.getAttribute('href') || node.getAttribute('data-href') || '';
        var hv = extractIdFromString(href);
        if (hv) return hv;
      }
      node = node.parentElement;
    }
    return null;
  }

  function isGrayPlaceholder(img) {
    if (!img || !img.complete) return false;
    var w = img.naturalWidth || 0;
    var h = img.naturalHeight || 0;
    if (!w || !h) return true;
    // YouTube's unavailable/gray placeholder is normally 120x90.
    if (w === 120 && h === 90) return true;
    var src = img.currentSrc || img.src || '';
    return src.indexOf('thumb-unavailable') !== -1;
  }

  function applySafeImgBasics(img) {
    try {
      img.loading = 'eager';
      img.decoding = 'async';
      img.removeAttribute('data-twk-dead');
      img.removeAttribute('data-dead');
      if (img.style && img.style.opacity === '0') img.style.opacity = '';
      var card = img.closest && img.closest('.twk-thumb-dead, .twk-thumb-maybe-dead');
      if (card && card.classList) {
        card.classList.remove('twk-thumb-dead');
        card.classList.remove('twk-thumb-maybe-dead');
      }
    } catch (_) {}
  }

  function testUrl(url, cb) {
    var probe = new Image();
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      cb(false);
    }, 3500);

    probe.onload = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cb(!(probe.naturalWidth === 120 && probe.naturalHeight === 90) && probe.naturalWidth > 120);
    };
    probe.onerror = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cb(false);
    };
    probe.src = url;
  }

  function chooseBest(id, cb) {
    if (pending[id]) {
      pending[id].push(cb);
      return;
    }
    pending[id] = [cb];
    var i = 0;

    function finish(url) {
      var list = pending[id] || [];
      delete pending[id];
      for (var j = 0; j < list.length; j++) list[j](url);
    }

    function next() {
      if (i >= VARIANTS.length) {
        finish('https://i.ytimg.com/vi/' + id + '/hqdefault.jpg');
        return;
      }
      var url = 'https://i.ytimg.com/vi/' + id + '/' + VARIANTS[i++];
      testUrl(url, function (ok) {
        if (ok) finish(url);
        else next();
      });
    }
    next();
  }

  function fixOne(img) {
    if (!img || img.nodeType !== 1 || img.tagName !== 'IMG') return;
    var rawSrc = img.currentSrc || img.src || img.getAttribute('src') || '';
    if (rawSrc.indexOf('i.ytimg.com') === -1 && rawSrc.indexOf('thumb-unavailable') === -1) return;

    applySafeImgBasics(img);

    var id = getVideoId(img);
    if (!id) return;

    if (img.dataset && !img.dataset.twkOriginalVid) img.dataset.twkOriginalVid = id;

    function replaceIfNeeded() {
      if (!isGrayPlaceholder(img)) return;
      chooseBest(id, function (bestUrl) {
        var current = img.currentSrc || img.src || '';
        if (current !== bestUrl) img.src = bestUrl;
      });
    }

    if (img.complete) {
      replaceIfNeeded();
    } else {
      img.addEventListener('load', replaceIfNeeded, { once: true });
      img.addEventListener('error', function () {
        chooseBest(id, function (bestUrl) { img.src = bestUrl; });
      }, { once: true });
    }

    // Prevent long-lived gray boxes while browser waits on lazy/intersection state.
    var expected = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    if (!rawSrc || rawSrc.indexOf('thumb-unavailable') !== -1) img.src = expected;
  }

  function scan() {
    var imgs = document.querySelectorAll('img[src*="i.ytimg.com"], img[src*="thumb-unavailable"]');
    for (var i = 0; i < imgs.length; i++) fixOne(imgs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  // Multiple passes because playlist cards can be injected/repainted late.
  setTimeout(scan, 250);
  setTimeout(scan, 900);
  setTimeout(scan, 2200);
  setTimeout(scan, 4500);

  try {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes || [];
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (!n || n.nodeType !== 1) continue;
          if (n.tagName === 'IMG') fixOne(n);
          if (n.querySelectorAll) {
            var imgs = n.querySelectorAll('img[src*="i.ytimg.com"], img[src*="thumb-unavailable"]');
            for (var k = 0; k < imgs.length; k++) fixOne(imgs[k]);
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
})();
