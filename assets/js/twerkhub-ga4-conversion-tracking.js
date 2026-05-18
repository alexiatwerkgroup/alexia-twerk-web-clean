/**
 * TWERKHUB · GA4 Conversion + Engagement Tracking
 * Auto-tracks: CTA clicks, outbound clicks (OnlyFans, Telegram, Discord, WhatsApp, Patreon, etc.),
 * scroll depth (25/50/75/90%), engagement time (30s/60s/120s).
 *
 * Uses event delegation — does NOT require inline onclick handlers, does NOT block navigation.
 */
(function() {
  'use strict';

  function safeGtag() {
    if (typeof window.gtag === 'function') {
      window.gtag.apply(null, arguments);
    }
  }

  var HOST = location.hostname;
  function pageMeta() {
    return {
      page_path: location.pathname,
      page_title: document.title
    };
  }

  // ====== CLICK CLASSIFICATION ======
  function classifyLink(url, text) {
    if (!url) return null;
    var u = url.toLowerCase();
    var t = (text || '').toLowerCase();

    if (u.indexOf('onlyfans.com') !== -1) return 'outbound_onlyfans';
    if (u.indexOf('t.me/') !== -1 || u.indexOf('telegram') !== -1) return 'outbound_telegram';
    if (u.indexOf('discord.gg/') !== -1 || u.indexOf('discord.com') !== -1) return 'outbound_discord';
    if (u.indexOf('wa.me/') !== -1 || u.indexOf('whatsapp.com') !== -1) return 'outbound_whatsapp';
    if (u.indexOf('patreon.com') !== -1) return 'outbound_patreon';
    if (u.indexOf('youtube.com/@') !== -1) return 'outbound_youtube_channel';
    if (u.indexOf('youtu.be/') !== -1 || u.indexOf('youtube.com/watch') !== -1) return 'outbound_youtube_video';
    if (u.indexOf('instagram.com') !== -1) return 'outbound_instagram';
    if (u.indexOf('twitter.com') !== -1 || u.indexOf('x.com') !== -1) return 'outbound_twitter';
    if (u.indexOf('tiktok.com') !== -1) return 'outbound_tiktok';

    // Internal CTAs (by URL or by text)
    if (u.indexOf('/membership') !== -1 || u.indexOf('upgrade') !== -1) return 'membership_click';
    if (u.indexOf('token') !== -1) return 'token_click';
    if (u.indexOf('/creator/') !== -1 || u.indexOf('/ru/creator/') !== -1 || u.indexOf('/es/creator/') !== -1) return 'creator_profile_click';
    if (u.indexOf('private') !== -1 || u.indexOf('vip') !== -1 || u.indexOf('exclusive') !== -1) return 'private_access_click';

    if (/\b(join|subscribe|unlock|access|enter|reveal|watch now|get tokens|upgrade|sign up)\b/i.test(t)) return 'cta_click';

    // Generic outbound (not same-host)
    if (/^https?:\/\//.test(u) && u.indexOf(HOST) === -1) return 'outbound_click';

    return null;
  }

  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target) return;
    // Walk up to find anchor or trackable button
    var el = target.closest ? target.closest('a, button[data-href]') : null;
    if (!el) return;

    var url = el.href || (el.dataset && el.dataset.href) || '';
    var text = (el.innerText || el.textContent || '').trim().slice(0, 80);
    var eventName = classifyLink(url, text);
    if (!eventName) return;

    var data = {
      link_url: url,
      link_text: text,
      click_type: eventName
    };
    Object.assign(data, pageMeta());
    safeGtag('event', eventName, data);
  }, { passive: true, capture: true });

  // ====== SCROLL DEPTH ======
  var scrollFired = {};
  var scrollTimer = null;

  function checkScroll() {
    var doc = document.documentElement;
    var total = doc.scrollHeight - doc.clientHeight;
    if (total <= 0) return;
    var pct = (doc.scrollTop / total) * 100;
    [25, 50, 75, 90].forEach(function(m) {
      if (pct >= m && !scrollFired[m]) {
        scrollFired[m] = true;
        var data = {};
        Object.assign(data, pageMeta(), { scroll_depth: m });
        safeGtag('event', 'scroll_' + m, data);
      }
    });
  }

  window.addEventListener('scroll', function() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function() {
      scrollTimer = null;
      checkScroll();
    }, 250);
  }, { passive: true });

  // ====== ENGAGEMENT TIME (only count visible time) ======
  var visibleSec = 0;
  var lastTick = Date.now();
  var engagementFired = {};

  function tick() {
    if (document.visibilityState !== 'visible') {
      lastTick = Date.now();
      return;
    }
    var now = Date.now();
    visibleSec += (now - lastTick) / 1000;
    lastTick = now;

    [30, 60, 120].forEach(function(t) {
      if (visibleSec >= t && !engagementFired[t]) {
        engagementFired[t] = true;
        var data = {};
        Object.assign(data, pageMeta(), { engagement_time_seconds: t });
        safeGtag('event', 'engaged_' + t + 's', data);
      }
    });
  }

  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', function() {
    lastTick = Date.now();
  });
})();
