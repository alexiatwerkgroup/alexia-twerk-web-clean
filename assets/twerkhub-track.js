/* Twerkhub first-party tracker: active time on page, scroll depth and a few intent events. No personal data. */
(function () {
  var h = window.__twh; if (!h || window.__twt) return; window.__twt = 1;
  var hum = 0, vis = 0, eng = 0, last = Date.now(), shown = !document.hidden, maxS = 0, ev = [], sent = 0, interaction = 0, lastSentInteraction = 0;
  var lastTouch = Date.now(), IDLE_MS = 300000;
  function touch() { hum = 1; interaction = lastTouch = Date.now(); }
  // Tiempo activo = pestaña visible O un video reproduciéndose (mirar con el navegador tapado o en segundo plano también es tiempo en la página).
  function playing() { try { var vs = document.getElementsByTagName('video'); for (var i = 0; i < vs.length; i++) { var q = vs[i]; if (!q.paused && !q.ended && q.readyState > 2) return true; } } catch (e) {} return false; }
  // vis = pestaña abierta (visible o con video). eng = tiempo CON interacción: video reproduciéndose, o pestaña visible con scroll/clic/movimiento en los últimos 5 min.
  function tick() { var n = Date.now(), dt = n - last, pl = playing(); if (shown || pl) vis += dt; if (pl || (shown && n - lastTouch < IDLE_MS)) eng += dt; last = n; }
  function scr() { var d = document.documentElement, t = (window.scrollY || 0) + innerHeight, p = Math.round(100 * t / Math.max(d.scrollHeight, 1)); if (p > maxS) maxS = Math.min(100, p); }
  addEventListener('scroll', function () { touch(); scr(); }, { passive: true }); scr();
  ['pointermove', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { addEventListener(t, touch, { passive: true }); });
  function add(n, d) { if (ev.length < 12) ev.push({ n: n, d: d || '' }); }
  document.addEventListener('click', function (e) {
    touch();
    var t = e.target; if (!t.closest) return;
    var join = t.closest('a.twk-join-cta,a[href="/account"].twk-btn'); if (join) add('signup_click', (new URL(join.href, location.href)).searchParams.get('utm_source') || 'free_account');
    var a = t.closest('[data-pay]'); if (a) add('pay_open', a.dataset.pay);
    if (t.closest('.full')) add('unlock_click', (t.closest('.c') || {}).dataset ? t.closest('.c').dataset.n : '');
    if (t.closest('#follow')) add('follow');
    if (t.closest('[data-copy]')) add('copy_id');
    var l = t.closest('a[href*="binance.com"]'); if (l) add('binance_ref');
    if (t.closest('.twr')) add('rabbit_click');
    var nov = t.closest('[data-nov-action]');
    if (nov && (nov.dataset.novAction === 'watch' || nov.dataset.novAction === 'join' || nov.dataset.novAction === 'identify' || nov.dataset.novAction === 'vip')) {
      var detail = nov.dataset.novLocation || '';
      if (nov.dataset.novAction === 'watch') {
        try { detail = new URL(nov.href, location.href).searchParams.get('c') || detail; } catch (e) {}
      }
      add('nov_' + nov.dataset.novAction, detail);
    }
  }, true);
  document.addEventListener('play', function (e) {
    if (location.pathname.indexOf('/novinhas/watch') === 0 && e.target && e.target.id === 'player') add('nov_play');
    var v = e.target;
    if (v && v.tagName === 'VIDEO' && v.closest && v.closest('.np-stage') && location.pathname.indexOf('/novinhas/canal/ver') === 0) {
      try { var p = new URLSearchParams(location.search), c = p.get('c') || '', id = v.dataset.twRankVideo || p.get('v') || ''; if (/^[a-z0-9-]{2,60}$/.test(c) && /^\d{1,4}$/.test(id)) { var key = c + ':' + id; window.__twNovVideoViews = window.__twNovVideoViews || {}; if (!window.__twNovVideoViews[key]) { window.__twNovVideoViews[key] = 1; add('nov_video_view', key); } } } catch (err) {}
    }
    if (v && v.tagName === 'VIDEO' && v.closest && v.closest('.np-mbox') && v.dataset.twNovMini) {
      var mk = v.dataset.twNovMini; window.__twNovMiniViews = window.__twNovMiniViews || {};
      if (!window.__twNovMiniViews[mk]) { window.__twNovMiniViews[mk] = 1; add('nov_miniclip_view', mk); }
    }
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
    try { localStorage.setItem('twk_signup_pending_verification', '1'); } catch (_) {}
    send();
  });
  function observeSignupStart(){
    if(window.__twkSignupStartSeen)return;
    var modal=document.querySelector('#twk-auth-modal[data-mode="signup"]');
    var pageForm=document.querySelector('#twk-account-auth .twk-auth-sheet');
    if(modal||pageForm){window.__twkSignupStartSeen=1;add('signup_start',location.pathname.indexOf('/account')===0?'account_page':'modal')}
  }
  observeSignupStart();
  if(document.body&&window.MutationObserver){try{new MutationObserver(observeSignupStart).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-mode']})}catch(_){}}
  if(new URLSearchParams(location.search).get('verified')==='1'){
    add('signup_verified','email');
    try{if(localStorage.getItem('twk_signup_pending_verification'))localStorage.removeItem('twk_signup_pending_verification')}catch(_){}
  }
  function send() { tick(); scr(); vidEvent(); var b = JSON.stringify({ h: h, d: Math.round(vis / 1000), a: Math.round(eng / 1000), s: maxS, u: hum, i: interaction > lastSentInteraction ? interaction : 0, ev: ev }); lastSentInteraction = interaction; ev = []; sent++; try { navigator.sendBeacon('/api/analytics/track', new Blob([b], { type: 'application/json' })); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { tick(); shown = !document.hidden; last = Date.now(); if (document.hidden) send(); });
  addEventListener('pagehide', send);
  setTimeout(send, 15000);
  // Heartbeat keeps active time, current IP country and online status fresh while the tab stays open.
  setInterval(function () { if (shown || playing()) send(); }, 30000);
})();
