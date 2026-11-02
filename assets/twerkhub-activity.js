/* TWERKHUB · real-activity alerts for the Jenny pages.
 * Source: GET /api/jenny/activity (anonymous, from real unlocks). Nothing is invented:
 * if there is no recent real unlock, no alert is shown. Alerts are sparse (not constant)
 * and the "x min ago" label keeps counting while the page is open. */
(function () {
  'use strict';
  var data = null, t0 = 0, shown = 0, MAX = 6, timer = null, el = null;
  function css() {
    var s = document.createElement('style');
    s.textContent = '#twk-al{position:fixed;left:16px;bottom:16px;z-index:70;display:flex;gap:10px;align-items:center;background:rgba(11,11,16,.96);border:1px solid #26262e;border-left:3px solid var(--ac,#ff8a00);border-radius:10px;padding:10px 14px;font:13px/1.4 Inter,system-ui,sans-serif;color:#fff;max-width:300px;transform:translateY(90px);opacity:0;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s;pointer-events:none}#twk-al.s{transform:none;opacity:1}#twk-al b{color:var(--ac,#ff8a00)}@media(max-width:640px){#twk-al{left:10px;right:10px;bottom:76px;max-width:none}}@media(prefers-reduced-motion:reduce){#twk-al{transition:none}}';
    document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'twk-al'; el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  function label(n) { return /^x\d\d$/.test(n) ? 'Uncensored <b>' + n.toUpperCase() + '</b>' : 'a Jenny video'; }
  function ago(m) { m = Math.max(1, Math.round(m)); return m < 60 ? m + ' min ago' : (m < 180 ? Math.round(m / 60) + ' h ago' : 'today'); }
  function pick() {
    if (!data || !data.last || !data.last.length) return null;
    var el_ = (Date.now() - t0) / 60000;
    var last = data.last.map(function (r) { return { n: r.n, ago: r.ago + el_ }; });
    var hour = last.filter(function (r) { return r.ago < 60; }).length;
    if (hour >= 3 && Math.random() < 0.3) return '🔥 <b>' + hour + ' videos</b> unlocked in the last hour';
    var r = last[0];
    if (r.ago > 1440) return null;
    return '🔓 Someone unlocked ' + label(r.n) + ' · ' + ago(r.ago);
  }
  function show() {
    var m = pick();
    if (m && shown < MAX) {
      shown++; el.innerHTML = '<span>' + m + '</span>'; el.classList.add('s');
      setTimeout(function () { el.classList.remove('s'); }, 5000);
    }
    if (shown < MAX) timer = setTimeout(show, 45000 + Math.random() * 70000);
  }
  function load() {
    fetch('/api/jenny/activity', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.ok) return;
      data = d; t0 = Date.now(); window.TwkActivity = d;
      document.dispatchEvent(new CustomEvent('twk:activity', { detail: d }));
      if (!timer && d.last && d.last.length) timer = setTimeout(show, 9000);
    }).catch(function () {});
  }
  function init() { css(); load(); setInterval(load, 120000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
