/* TWERKHUB · twk-bot-detect · 2026-05-11 v1
 * ───────────────────────────────────────────────────────────────────
 * Centralized bot/crawler detection for Twerkhub.
 *
 * Sets `window.__twkIsBot` (boolean) AND `window.__twkBotName` (string)
 * EXTREMELY EARLY in the page lifecycle, so other scripts can branch on it.
 *
 * Detects:
 *   • Googlebot, Googlebot-Image, Googlebot-Video, Googlebot-News, AdsBot-Google,
 *     Mediapartners-Google, Storebot-Google, AppEngine-Google
 *   • Bingbot, Slurp (Yahoo), DuckDuckBot
 *   • Yandex bot, Baidu spider
 *   • Generic crawlers (anything matching /bot|crawler|spider|spyder|crawling/i)
 *   • Headless browsers (Puppeteer, PhantomJS) — only for analytics opt-out
 *
 * Bots get a clean, content-first experience:
 *   • NO age-gate modal
 *   • NO paywall overlay
 *   • NO email-capture popup
 *   • NO sign-in modal
 *   • Tracking & analytics may also opt them out
 *
 * Members (founder/premium/vip) also bypass paywalls — that logic stays in
 * each script, this file only handles the bot detection.
 *
 * MUST load FIRST, before any script that hides content.
 * ─────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__twkBotDetectLoaded) return;
  window.__twkBotDetectLoaded = true;

  var ua = '';
  try { ua = String(navigator.userAgent || '').toLowerCase(); } catch (_) {}

  // Specific search engine bots (priority match for `__twkBotName`)
  var SPECIFIC_BOTS = [
    { re: /googlebot-image/i,        name: 'googlebot-image' },
    { re: /googlebot-video/i,        name: 'googlebot-video' },
    { re: /googlebot-news/i,         name: 'googlebot-news' },
    { re: /adsbot-google-mobile/i,   name: 'adsbot-google-mobile' },
    { re: /adsbot-google/i,          name: 'adsbot-google' },
    { re: /mediapartners-google/i,   name: 'mediapartners-google' },
    { re: /storebot-google/i,        name: 'storebot-google' },
    { re: /appengine-google/i,       name: 'appengine-google' },
    { re: /google-inspectiontool/i,  name: 'google-inspectiontool' },
    { re: /googlebot/i,              name: 'googlebot' },
    { re: /bingbot/i,                name: 'bingbot' },
    { re: /yandex/i,                 name: 'yandexbot' },
    { re: /baiduspider/i,            name: 'baiduspider' },
    { re: /duckduckbot/i,            name: 'duckduckbot' },
    { re: /slurp/i,                  name: 'slurp' },
    { re: /facebookexternalhit/i,    name: 'facebookbot' },
    { re: /twitterbot/i,             name: 'twitterbot' },
    { re: /linkedinbot/i,            name: 'linkedinbot' },
    { re: /whatsapp/i,               name: 'whatsappbot' },
    { re: /telegrambot/i,            name: 'telegrambot' },
    { re: /applebot/i,               name: 'applebot' },
    { re: /headlesschrome/i,         name: 'headless-chrome' },
    { re: /phantomjs/i,              name: 'phantomjs' },
    // Generic catch-all (kept last so specific names take precedence)
    { re: /bot|crawler|spider|spyder|crawling/i, name: 'generic-bot' }
  ];

  var botName = null;
  for (var i = 0; i < SPECIFIC_BOTS.length; i++) {
    if (SPECIFIC_BOTS[i].re.test(ua)) {
      botName = SPECIFIC_BOTS[i].name;
      break;
    }
  }

  // Also flag webdriver (headless test runners) — but separate from bot
  var isWebdriver = false;
  try { isWebdriver = !!navigator.webdriver; } catch (_) {}

  window.__twkIsBot = !!botName;
  window.__twkBotName = botName || '';
  window.__twkIsWebdriver = isWebdriver;

  // Console log for debug (only in dev — bots ignore console anyway)
  try {
    if (botName) {
      console.log('[twk-bot-detect] bot detected:', botName, '— UX overlays will be skipped');
    }
  } catch (_) {}

  // Convenience helper: scripts can call window.twkShouldHide() to know
  // whether they should render UX-blocking overlays.
  window.twkShouldHide = function () {
    return !window.__twkIsBot;
  };
})();
