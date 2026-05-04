/* ═══ TWERKHUB · YouTube postMessage Gate v1 (2026-05-04) ═══
 *
 * SINGLE CHOKEPOINT for ALL postMessage to YouTube embed iframes.
 *
 * WHY:
 *   YouTube's anti-bot detection treats rapid-fire postMessage to its
 *   embed iframes as bot behavior. When triggered, it serves the
 *   "Sign in to confirm you're not a bot" challenge, which our shield
 *   blocks the user from clicking — meaning the player becomes unusable.
 *
 *   Multiple scripts (shield, theater, sound manager, hero rotator, swap
 *   handlers) all postMessage to YouTube iframes independently. Without
 *   coordination they easily exceed YouTube's threshold and trigger the
 *   challenge.
 *
 * WHAT THIS DOES:
 *   - Exposes window.TwkYTGate.send(iframe, command) — every script must
 *     use this instead of calling iframe.contentWindow.postMessage directly.
 *   - Throttles per-iframe to MAX 1 message per 500ms. Excess messages
 *     are queued and flushed gradually.
 *   - Always uses target origin "https://www.youtube-nocookie.com"
 *     (never "*").
 *   - Tracks 5xx error rate; if >3 errors in 60s, enters cool-off mode
 *     and rejects all further sends for 5 minutes.
 *   - Honours ?dev=1 URL flag — in dev mode, NO postMessage is sent.
 *     Lets you reload the page 100x while debugging without flagging
 *     your IP.
 *   - Honours TwkYTGate.coolOff(minutes) for manual cool-off.
 *
 * USAGE:
 *   TwkYTGate.send(iframe, { event: 'command', func: 'unMute', args: [] });
 *   TwkYTGate.send(iframe, { event: 'listening' });
 *   TwkYTGate.coolOff(30);  // pause everything for 30 minutes
 *   TwkYTGate.isCoolingOff();  // true if currently paused
 *
 * Version: bump query string in <script src> when changing.
 */
(function(){
  'use strict';
  if (window.TwkYTGate) return;

  // CRITICAL: target origin must be '*'. YouTube's embed iframe sometimes
  // changes its internal origin (nocookie ↔ youtube.com) during the player
  // lifecycle, which causes postMessage with specific origins to be
  // silently dropped by the browser. The previous version that successfully
  // delivered addEventListener('onError') for the +18 paywall used '*'.
  // The bot challenge was caused by SPAM (frequency), not by the target
  // origin — our throttle handles that.
  var YT_ORIGIN = '*';
  var MIN_INTERVAL_MS = 500;
  var COOLOFF_KEY = 'twk_yt_gate_cooloff_until';
  var DEFAULT_COOLOFF_MIN = 30;

  // Per-iframe queue + last-send timestamp
  var queues = new WeakMap();   // iframe → array of pending messages
  var lastSent = new WeakMap(); // iframe → timestamp of last send

  // Detect dev mode from URL params or hostname
  var isDev = (function(){
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('dev') === '1') return true;
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
      if (u.hostname.endsWith('.local')) return true;
    } catch(_){}
    return false;
  })();

  function isCoolingOff(){
    try {
      var until = Number(localStorage.getItem(COOLOFF_KEY) || 0);
      return until > Date.now();
    } catch(_){ return false; }
  }

  function coolOff(minutes){
    var ms = (minutes || DEFAULT_COOLOFF_MIN) * 60 * 1000;
    var until = Date.now() + ms;
    try { localStorage.setItem(COOLOFF_KEY, String(until)); } catch(_){}
    console.warn('[twk-yt-gate] COOL-OFF activated. No postMessage to YouTube for ' + (minutes || DEFAULT_COOLOFF_MIN) + ' minutes. Reason: anti-bot guard.');
  }

  function clearCoolOff(){
    try { localStorage.removeItem(COOLOFF_KEY); } catch(_){}
  }

  // Try to send the next queued message for this iframe.
  // Respects per-iframe throttle.
  function flush(iframe){
    if (!iframe || !iframe.contentWindow) return;
    var queue = queues.get(iframe);
    if (!queue || !queue.length) return;
    var now = Date.now();
    var last = lastSent.get(iframe) || 0;
    var wait = (last + MIN_INTERVAL_MS) - now;
    if (wait > 0) {
      setTimeout(function(){ flush(iframe); }, wait);
      return;
    }
    var cmd = queue.shift();
    try {
      iframe.contentWindow.postMessage(JSON.stringify(cmd), YT_ORIGIN);
      lastSent.set(iframe, now);
    } catch(e){
      console.warn('[twk-yt-gate] postMessage failed:', e.message);
    }
    if (queue.length) setTimeout(function(){ flush(iframe); }, MIN_INTERVAL_MS);
  }

  function send(iframe, command){
    if (!iframe || !command) return false;
    if (isDev) {
      console.info('[twk-yt-gate] dev mode: skipping postMessage', command.func || command.event);
      return false;
    }
    if (isCoolingOff()) {
      console.warn('[twk-yt-gate] cool-off active: rejecting postMessage', command.func || command.event);
      return false;
    }
    var queue = queues.get(iframe);
    if (!queue) { queue = []; queues.set(iframe, queue); }
    queue.push(command);
    flush(iframe);
    return true;
  }

  // Listen for YouTube error events (101 = embed disabled, 150 = age-restricted,
  // 153 = player config error, 100 = video not found). 153 specifically is the
  // signature of YouTube starting to reject our embeds → cool-off immediately.
  window.addEventListener('message', function(e){
    if (!e || !e.origin) return;
    if (!/^https:\/\/www\.youtube(?:-nocookie)?\.com$/.test(e.origin)) return;
    var data;
    try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch(_){ return; }
    if (!data) return;
    // YouTube emits {event:'onError', info: 153}
    if (data.event === 'onError' || data.event === 'infoDelivery') {
      var code = data.info && (typeof data.info === 'number' ? data.info : data.info.errorCode);
      if (code === 153) {
        console.warn('[twk-yt-gate] YouTube error 153 detected → entering cool-off');
        coolOff(DEFAULT_COOLOFF_MIN);
      }
    }
  });

  window.TwkYTGate = {
    send: send,
    coolOff: coolOff,
    clearCoolOff: clearCoolOff,
    isCoolingOff: isCoolingOff,
    isDev: function(){ return isDev; }
  };

  if (isDev) console.info('[twk-yt-gate] dev mode ACTIVE — all postMessage disabled');
  if (isCoolingOff()) {
    var until = Number(localStorage.getItem(COOLOFF_KEY) || 0);
    var minsLeft = Math.ceil((until - Date.now()) / 60000);
    console.warn('[twk-yt-gate] starting in COOL-OFF mode (' + minsLeft + ' min remaining)');
  }
})();
