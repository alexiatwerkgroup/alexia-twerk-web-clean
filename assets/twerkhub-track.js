/* Twerkhub first-party tracker: active time on page, scroll depth and a few intent events. No personal data. */
(function () {
  var h = window.__twh; if (!h || window.__twt) return; window.__twt = 1;
  var hum = 0, vis = 0, last = Date.now(), shown = !document.hidden, maxS = 0, ev = [], sent = 0;
  function tick() { if (shown) vis += Date.now() - last; last = Date.now(); }
  function scr() { var d = document.documentElement, t = (window.scrollY || 0) + innerHeight, p = Math.round(100 * t / Math.max(d.scrollHeight, 1)); if (p > maxS) maxS = Math.min(100, p); }
  addEventListener('scroll', function () { hum = 1; scr(); }, { passive: true }); scr();
  ['pointermove', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { addEventListener(t, function () { hum = 1; }, { once: true, passive: true }); });
  function add(n, d) { if (ev.length < 12) ev.push({ n: n, d: d || '' }); }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var a = t.closest('[data-pay]'); if (a) add('pay_open', a.dataset.pay);
    if (t.closest('.full')) add('unlock_click', (t.closest('.c') || {}).dataset ? t.closest('.c').dataset.n : '');
    if (t.closest('#follow')) add('follow');
    if (t.closest('[data-copy]')) add('copy_id');
    var l = t.closest('a[href*="binance.com"]'); if (l) add('binance_ref');
    if (t.closest('.twr')) add('rabbit_click');
  }, true);
  function send() { tick(); scr(); var b = JSON.stringify({ h: h, d: Math.round(vis / 1000), s: maxS, u: hum, ev: ev }); ev = []; sent++; try { navigator.sendBeacon('/api/analytics/track', new Blob([b], { type: 'application/json' })); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { tick(); shown = !document.hidden; last = Date.now(); if (document.hidden) send(); });
  addEventListener('pagehide', send);
  setTimeout(send, 15000);
  // heartbeat: keeps time-on-page and "online now" live while the tab stays open (stops after 40 min)
  var hb = setInterval(function () { if (vis > 2400000) return clearInterval(hb); if (shown) send(); }, 30000);
})();
