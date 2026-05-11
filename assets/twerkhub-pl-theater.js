/* TWERKHUB Playlist Theater v20260510-p11 */
(function () {
  'use strict';
  if (window.TwkAgeGate) return;

  var HEARTBEAT_INTERVAL = 3000;
  var DISCORD_URL = 'https://discord.gg/WWn8ZgQMjn';
  var TELEGRAM_URL = 'https://t.me/+0xNr69raiIlmYWRh';
  var STORAGE_KEY = 'twk_blocked_videos';

  function readBlocked() {
    try {
      var v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return (v && typeof v === 'object') ? v : {};
    } catch (_) { return {}; }
  }

  function writeBlocked(obj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (_) {}
  }

  var _protectedVids = null;
  function getProtectedVids() {
    if (_protectedVids) return _protectedVids;
    _protectedVids = Object.create(null);
    try {
      var els = document.querySelectorAll('.rk-item[data-vid]');
      for (var i = 0; i < els.length; i++) {
        var v = els[i].getAttribute('data-vid');
        if (v) _protectedVids[v] = true;
      }
    } catch (_) {}
    return _protectedVids;
  }

  function isProtected(vid) {
    if (!vid) return false;
    return !!getProtectedVids()[vid];
  }

  function purgeProtectedFromBlocked() {
    var b = readBlocked();
    var protectedSet = getProtectedVids();
    var changed = false;
    for (var k in protectedSet) {
      if (b[k]) { delete b[k]; changed = true; }
    }
    if (changed) writeBlocked(b);
  }

  var TwkAgeGate = {
    isBlocked: function (vid) {
      if (!vid) return false;
      if (isProtected(vid)) return false;
      var b = readBlocked();
      return !!b[vid];
    },

    markBlocked: function (vid) {
      if (!vid || isProtected(vid)) return;
      var b = readBlocked();
      b[vid] = true;
      writeBlocked(b);
    },

    show: function (container, vid) {
      if (!container) return;
      if (isProtected(vid)) return;

      var html = '<div style="position:absolute;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.95);display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;z-index:999;' +
        'font-family:Inter,system-ui,sans-serif;color:#fff;">' +
        '<div style="font-size:48px;margin-bottom:16px;">🔒</div>' +
        '<h2 style="font-size:24px;margin:0 0 8px 0;font-weight:700;">Age Restricted</h2>' +
        '<p style="margin:0 0 24px 0;opacity:0.7;font-size:14px;">This content is +18 only.</p>' +
        '<div style="display:flex;gap:12px;">' +
        '<a href="' + DISCORD_URL + '" target="_blank" rel="noopener" ' +
        'style="padding:10px 20px;background:#5865F2;color:#fff;border-radius:4px;' +
        'text-decoration:none;font-weight:600;font-size:14px;">Join Discord</a>' +
        '<a href="' + TELEGRAM_URL + '" target="_blank" rel="noopener" ' +
        'style="padding:10px 20px;background:#0088cc;color:#fff;border-radius:4px;' +
        'text-decoration:none;font-weight:600;font-size:14px;">Join Telegram</a>' +
        '</div></div>';

      container.innerHTML = html;
      this.markBlocked(vid);
      if (window.AlexiaTokens && window.AlexiaTokens.grant) {
        window.AlexiaTokens.grant(5, 'paywall_view');
      }
    }
  };

  window.TwkAgeGate = TwkAgeGate;

  function init() {
    purgeProtectedFromBlocked();
    startHeartbeat();
  }

  var _heartbeatId = null;
  var _lastDetectedVid = null;

  function startHeartbeat() {
    if (_heartbeatId) return;
    _heartbeatId = setInterval(function () {
      var currentVid = getCurrentVideoId();
      if (!currentVid || currentVid === _lastDetectedVid) return;
      _lastDetectedVid = currentVid;

      if (TwkAgeGate.isBlocked(currentVid)) {
        var player = getPlayerContainer();
        if (player) TwkAgeGate.show(player, currentVid);
        return;
      }

      if (isAgeRestricted(currentVid)) {
        TwkAgeGate.markBlocked(currentVid);
        var player = getPlayerContainer();
        if (player) TwkAgeGate.show(player, currentVid);
      }
    }, HEARTBEAT_INTERVAL);
  }

  function getCurrentVideoId() {
    var playingEl = document.querySelector('[data-current-video]');
    if (playingEl) {
      var vid = playingEl.getAttribute('data-current-video');
      if (vid) return vid;
    }

    var iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
    if (iframes.length > 0) {
      var src = iframes[0].src;
      var match = src.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  function isAgeRestricted(vid) {
    if (!vid) return false;
    var card = document.querySelector('[data-vid="' + vid + '"]');
    if (card) {
      if (card.classList.contains('twk-blocked') || 
          card.classList.contains('age-restricted') ||
          card.getAttribute('data-age-restricted') === 'true') {
        return true;
      }
    }
    return false;
  }

  function getPlayerContainer() {
    var selectors = ['.twerkhub-pl-hero', '[data-player-container]', '#player', '.player-wrapper'];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    var iframeParent = document.querySelector('iframe');
    return iframeParent ? iframeParent.parentElement : null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', function() {
    if (_heartbeatId) clearInterval(_heartbeatId);
  });
})();
