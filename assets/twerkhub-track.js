/* Twerkhub first-party tracker: active time on page, scroll depth and a few intent events. No personal data. */
(function () {
  var h = window.__twh; if (!h || window.__twt) return; window.__twt = 1;
  var hum = 0, vis = 0, last = Date.now(), shown = !document.hidden, maxS = 0, ev = [], sent = 0, interaction = 0, lastSentInteraction = 0;
  function touch() { hum = 1; interaction = Date.now(); }
  function tick() { if (shown) vis += Date.now() - last; last = Date.now(); }
  function scr() { var d = document.documentElement, t = (window.scrollY || 0) + innerHeight, p = Math.round(100 * t / Math.max(d.scrollHeight, 1)); if (p > maxS) maxS = Math.min(100, p); }
  addEventListener('scroll', function () { touch(); scr(); }, { passive: true }); scr();
  ['pointermove', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { addEventListener(t, touch, { passive: true }); });
  function add(n, d) { if (ev.length < 12) ev.push({ n: n, d: d || '' }); }
  document.addEventListener('click', function (e) {
    touch();
    var t = e.target; if (!t.closest) return;
    var a = t.closest('[data-pay]'); if (a) add('pay_open', a.dataset.pay);
    if (t.closest('.full')) add('unlock_click', (t.closest('.c') || {}).dataset ? t.closest('.c').dataset.n : '');
    if (t.closest('#follow')) add('follow');
    if (t.closest('[data-copy]')) add('copy_id');
    var l = t.closest('a[href*="binance.com"]'); if (l) add('binance_ref');
    if (t.closest('.twr')) add('rabbit_click');
    var nov = t.closest('[data-nov-action]');
    if (nov && (nov.dataset.novAction === 'watch' || nov.dataset.novAction === 'join')) {
      add('nov_' + nov.dataset.novAction, nov.dataset.novLocation || '');
    }
  }, true);
  document.addEventListener('play', function (e) {
    if (location.pathname.indexOf('/novinhas/watch') === 0 && e.target && e.target.id === 'player') add('nov_play');
  }, true);
  // Tiempo real de reproducción en la página de video: segundos reproducidos y punto más lejano alcanzado (% del video).
  var vPlay = 0, vMax = 0, vDur = 0, vLast = -1, vSent = 0;
  document.addEventListener('timeupdate', function (e) {
    var v = e.target; if (!v || v.id !== 'player' || location.pathname.indexOf('/novinhas/watch') !== 0) return;
    var c = v.currentTime || 0; if (vLast >= 0 && c > vLast && c - vLast < 2) vPlay += c - vLast; vLast = c;
    if (c > vMax) vMax = c; if (v.duration && isFinite(v.duration)) vDur = v.duration; touch();
  }, true);
  document.addEventListener('seeking', function (e) { if (e.target && e.target.id === 'player') vLast = -1; }, true);
  function vidEvent() { if (vPlay < 1 || vPlay === vSent) return; vSent = vPlay; var pc = vDur ? Math.min(100, Math.round(100 * vMax / vDur)) : 0; ev = ev.filter(function (x) { return x.n !== 'vid_time'; }); ev.push({ n: 'vid_time', d: Math.round(vPlay) + 's ' + pc + '%' }); }
  document.addEventListener('twk:signup-success', function (e) {
    var source = String(e.detail && e.detail.source || '');
    add(source.indexOf('novinhas_') === 0 ? 'nov_signup' : 'signup_done', source);
    send();
  });
  function send() { tick(); scr(); vidEvent(); var b = JSON.stringify({ h: h, d: Math.round(vis / 1000), s: maxS, u: hum, i: interaction > lastSentInteraction ? interaction : 0, ev: ev }); lastSentInteraction = interaction; ev = []; sent++; try { navigator.sendBeacon('/api/analytics/track', new Blob([b], { type: 'application/json' })); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { tick(); shown = !document.hidden; last = Date.now(); if (document.hidden) send(); });
  addEventListener('pagehide', send);
  setTimeout(send, 15000);
  // Heartbeat keeps active time, current IP country and online status fresh while the tab stays open.
  setInterval(function () { if (shown) send(); }, 30000);
})();
