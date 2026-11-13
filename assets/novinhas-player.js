/* Novinhas player: atajos de teclado tipo YouTube, dock de calidad (HD / 480p / Auto), videos similares del canal,
   autoplay del siguiente, retomar donde quedaste y marca "Viewed".
   Uso: TWK_NP.init({ slug, data, vid, stage, side, ... }) desde /novinhas/canal/ver/. */
(function () {
  'use strict';
  if (!document.querySelector('link[href*="twk-ui.css"]')) { var uil = document.createElement('link'); uil.rel = 'stylesheet'; uil.href = '/assets/twk-ui.css?v=1'; document.head.appendChild(uil); }
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };
  var Q_KEY = 'twk_nov_q', AUTO_KEY = 'twk_nov_autoplay', VOL_KEY = 'twk_nov_vol', SPEED_KEY = 'twk_nov_speed';
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); }
  function seenKey(slug) { return 'twk_nov_seen:' + slug; }
  function getSeen(slug) { try { return JSON.parse(LS.get(seenKey(slug)) || '{}'); } catch (_) { return {}; } }
  function markSeen(slug, id) { var s = getSeen(slug); if (!s[id]) { s[id] = Date.now(); LS.set(seenKey(slug), JSON.stringify(s)); } }
  window.TWK_SEEN = { get: getSeen, mark: markSeen };

  var CSS = '' +
    '.np-wrap{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px;align-items:start}' +
    '@media(max-width:980px){.np-wrap{grid-template-columns:1fr}}' +
    '.np-stage{position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:16/9;max-height:80vh;display:grid;place-items:center}' +
    '.np-stage.np-tall{aspect-ratio:auto;height:min(80vh,calc(100vw * 16 / 9));max-width:100%}' +
    '.np-stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;outline:0}' +
    '.np-stage:fullscreen,.np-stage:-webkit-full-screen{max-height:none;height:100%;border-radius:0}' +
    '.np-toast{position:absolute;left:50%;top:14%;transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font:700 15px system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .18s;z-index:14;white-space:nowrap}' +
    '.np-toast.on{opacity:1}' +
    '.np-fs{position:absolute;right:10px;top:10px;z-index:12;width:38px;height:38px;border:0;border-radius:10px;cursor:pointer;color:#2a1a00;background:linear-gradient(180deg,#fff0a8,#f7c83a 45%,#d99a0b);box-shadow:0 4px 0 #8a6205,0 8px 18px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.7);display:grid;place-items:center;padding:0}' +
    '.np-fs:active{transform:translateY(3px);box-shadow:0 1px 0 #8a6205,0 3px 8px rgba(0,0,0,.5)}' +
    '.np-fs svg{width:20px;height:20px}' +
    /* dock de calidad: mismo estilo 3D dorado que el de las playlists */
    '.twk-q{position:absolute;left:10px;top:10px;z-index:12;font-family:Inter,ui-sans-serif,system-ui,sans-serif;-webkit-tap-highlight-color:transparent;perspective:700px}' +
    '.twk-q-btn{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:78px;height:38px;padding:4px 12px 5px;border:0;border-radius:10px;cursor:pointer;color:#2a1a00;background:linear-gradient(180deg,#fff0a8 0%,#f7c83a 45%,#d99a0b 100%);box-shadow:0 4px 0 #8a6205,0 8px 18px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.7),inset 0 -2px 3px rgba(120,80,0,.35);transition:transform .12s,box-shadow .12s}' +
    '.twk-q-btn:hover{transform:translateY(-1px)}' +
    '.twk-q-btn:active,.twk-q[data-open="1"] .twk-q-btn{transform:translateY(3px);box-shadow:0 1px 0 #8a6205,0 3px 8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.6)}' +
    '.twk-q-k{font-size:8px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.75}' +
    '.twk-q-v{font-size:12px;font-weight:800;white-space:nowrap}' +
    '.twk-q-panel{position:absolute;left:0;top:calc(100% + 10px);display:none;flex-wrap:wrap;gap:6px;width:max-content;max-width:min(268px,calc(100vw - 36px));padding:8px;border-radius:14px;background:linear-gradient(160deg,rgba(40,32,12,.94),rgba(10,8,2,.96));border:1px solid rgba(232,184,74,.45);box-shadow:0 12px 30px rgba(0,0,0,.6)}' +
    '.twk-q[data-open="1"] .twk-q-panel{display:flex;animation:npIn .22s cubic-bezier(.3,1.3,.4,1)}' +
    '@keyframes npIn{from{opacity:0;transform:rotateX(28deg) translateY(-8px) scale(.92)}to{opacity:1;transform:none}}' +
    '.twk-q-chip{min-width:64px;height:34px;padding:0 10px;border:0;border-radius:9px;cursor:pointer;font:800 12px Inter,ui-sans-serif,system-ui,sans-serif;color:#f5e6b3;background:linear-gradient(180deg,#4a3d1a,#2a2208);box-shadow:0 3px 0 #120d00,inset 0 1px 0 rgba(255,255,255,.15)}' +
    '.twk-q-chip:hover{filter:brightness(1.2)}.twk-q-chip:active{transform:translateY(2px)}' +
    '.twk-q-chip.on{color:#2a1a00;background:linear-gradient(180deg,#fff0a8,#f7c83a 45%,#d99a0b);box-shadow:0 3px 0 #8a6205,inset 0 1px 0 rgba(255,255,255,.75)}' +
    '.twk-q-chip.off{opacity:.4;text-decoration:line-through}' +
    '.np-fs,.twk-q-btn{width:38px;height:38px;min-width:0;padding:0;border-radius:50%;background:rgba(18,18,18,.72);color:#fff;box-shadow:none;backdrop-filter:blur(6px);display:grid;place-items:center}.np-fs:hover,.twk-q-btn:hover{background:rgba(48,48,48,.88);transform:none}.np-fs:active,.twk-q-btn:active,.twk-q[data-open="1"] .twk-q-btn{transform:none;box-shadow:none;background:rgba(60,60,60,.92)}.twk-q-btn svg{width:20px;height:20px}.twk-q{left:auto;right:56px;perspective:none}' +
    '.twk-q-panel{left:auto;right:0;display:none;flex-direction:column;flex-wrap:nowrap;gap:2px;width:190px;max-width:calc(100vw - 24px);padding:6px;border-radius:12px;background:rgba(28,28,28,.96);border:0;box-shadow:0 12px 30px rgba(0,0,0,.6)}.twk-q[data-open="1"] .twk-q-panel{display:flex;animation:none}' +
    '.twk-q-h{display:flex;justify-content:space-between;padding:8px 10px;color:#aaa;font:600 12px system-ui}.twk-q-h .twk-q-v{color:#fff;font-weight:700}' +
    '.twk-q-chip{width:100%;height:36px;padding:0 10px;text-align:left;border-radius:8px;background:transparent;box-shadow:none;color:#fff;font:600 14px system-ui;display:flex;align-items:center;gap:8px}.twk-q-chip:hover{background:rgba(255,255,255,.1);filter:none}.twk-q-chip.on{background:transparent;box-shadow:none;color:#ffd76a}.twk-q-chip.on:before{content:"\\2713"}.twk-q-chip:not(.on):before{content:"";width:1em}' +
    '@media(max-width:540px){.twk-q-btn{height:40px;width:40px}.twk-q-chip{height:40px}}' +
    /* siguiente + ayuda */
    '.np-next{position:absolute;inset:0;z-index:15;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.78);text-align:center;padding:20px;font-family:system-ui,sans-serif}' +
    '.np-next.on{display:flex}.np-next small{color:#e8b84a;letter-spacing:.14em;font-weight:800;font-size:11px}.np-next b{font-size:18px;max-width:560px;line-height:1.35}' +
    '.np-next img{width:150px;max-height:110px;object-fit:cover;border-radius:10px}' +
        '.np-help{position:absolute;inset:0;z-index:16;display:none;place-items:center;background:rgba(0,0,0,.82);padding:14px;overflow:auto}' +
    '.np-help.on{display:grid}.np-help>div{width:min(560px,100%);background:#141108;border:1.5px solid #e8b84a;border-radius:16px;padding:18px 20px;color:#ddd;font:600 13px/1.9 system-ui,sans-serif}' +
    '.np-help h3{margin:0 0 8px;color:#ffd76a;font:900 15px system-ui;letter-spacing:.06em}.np-help .r{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #ffffff12}' +
    '.np-help kbd{background:#2a2208;border:1px solid #e8b84a66;border-radius:6px;padding:1px 8px;color:#ffd76a;font:800 12px system-ui;margin-left:4px}' +
    '.np-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0 4px}' +
    '.np-pill i{width:30px;height:16px;border-radius:9px;background:#444;position:relative;display:inline-block;flex:none}' +
    '.np-pill.on{border-color:#c99a2e!important;color:#f7dd8b!important}' +
    '.np-pill i:after{content:"";position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:.15s}.np-pill.on i{background:#e8b84a}.np-pill.on i:after{left:16px}' +
    '.np-side h2{font:800 16px system-ui;margin:0 0 12px;color:#fff}.np-side h2 span{color:#ffd76a}' +
    '.np-item{display:grid;grid-template-columns:168px 1fr;gap:10px;margin-bottom:12px;color:#fff;text-decoration:none;cursor:pointer}' +
    '.np-item:hover strong{text-decoration:underline}.np-th{position:relative;height:96px;border-radius:10px;overflow:hidden;background:#191919}' +
    '.np-th img{width:100%;height:100%;object-fit:cover}.np-item.lk .np-th img{filter:brightness(.45) blur(1px)}' +
    '.np-d{position:absolute;right:5px;bottom:5px;padding:1px 6px;border-radius:5px;background:rgba(0,0,0,.8);font:700 11px system-ui}' +
    '.np-lk{position:absolute;inset:0;display:grid;place-items:center}.np-lk svg{width:30px;height:36px;filter:drop-shadow(0 2px 6px #000a)}' +
    '.np-v{position:absolute;left:5px;top:5px;padding:1px 7px;border-radius:5px;background:#e8b84a;color:#1a1200;font:900 10px system-ui;letter-spacing:.06em}' +
    '.np-item.seen .np-th img{opacity:.55}.np-item.cur .np-th{outline:2px solid #e8b84a}' +
    '.np-item strong{display:block;font:700 14px/1.35 system-ui;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;word-break:break-word}' +
    '.np-item span.sub{display:block;margin-top:4px;color:#999;font:600 12px system-ui}' +
    '.np-more{margin-top:6px}' +
    '@media(max-width:980px){.np-item{grid-template-columns:140px 1fr}.np-th{height:84px}}';

  var LOCK = '<svg viewBox="0 0 86 104"><path d="M22 46V32a21 21 0 0 1 42 0v14" fill="none" stroke="#f7c83a" stroke-width="9" stroke-linecap="round"/><rect x="8" y="44" width="70" height="52" rx="12" fill="#f7c83a"/><circle cx="43" cy="66" r="7" fill="#1a1200"/><rect x="40" y="70" width="6" height="14" rx="3" fill="#1a1200"/></svg>';
  var FS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var KEYS = [
    ['Play / Pause', 'Space · K'], ['Fullscreen', 'F · Enter'], ['Mute', 'M'], ['Back / forward 5 s', '← →'], ['Back / forward 10 s', 'J · L'],
    ['Volume', '↑ ↓'], ['Jump to 0%–90%', '0 – 9'], ['Start / end', 'Home · End'], ['Frame step (paused)', ', .'], ['Speed down / up', '< >'],
    ['Next / previous video', 'Shift+N · Shift+P'], ['Quality menu', 'Q'], ['Picture in picture', 'I'], ['This help', '? · H']
  ];

  function init(o) {
    var slug = o.slug, d = o.data, vid = o.vid, stage = o.stage, side = o.side;
    var vids = d.videos, cur = vids.filter(function (x) { return x.id === vid; })[0];
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    var v = null;
    function urlFor(x, auto) { return '/novinhas/canal/ver/?c=' + encodeURIComponent(slug) + '&v=' + pad(x.id) + (auto ? '&a=1' : ''); }
    if (!cur.locked) {
    /* ---------- reproductor ---------- */
    var box = document.createElement('div'); box.className = 'np-stage' + (cur.height > cur.width ? ' np-tall' : '');
    var v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.preload = 'auto'; v.poster = cur.poster; v.tabIndex = 0;
    v.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback'); v.setAttribute('disablePictureInPicture', ''); v.removeAttribute('disablePictureInPicture');
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var vol = parseFloat(LS.get(VOL_KEY)); if (!isNaN(vol)) v.volume = Math.min(1, Math.max(0, vol));
    var sp = parseFloat(LS.get(SPEED_KEY)); if (sp > 0) v.playbackRate = sp;
    box.appendChild(v);

    var toast = document.createElement('div'); toast.className = 'np-toast'; box.appendChild(toast);
    var tt; function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 900); }

    /* calidad */
    var hasLow = !!cur.lowVideo && cur.lowVideo !== cur.video;
    var conn = navigator.connection || {};
    var slowNet = !!(conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || ''));
    function pref() { var p = LS.get(Q_KEY); return (p === 'hd' || p === 'sd' || p === 'auto') ? p : 'auto'; }
    function eff() { var p = pref(); if (!hasLow) return 'hd'; if (p === 'auto') return slowNet ? 'sd' : 'hd'; return p; }
    function srcFor(e) { return e === 'sd' ? cur.lowVideo : cur.video; }
    var dock = document.createElement('div'); dock.className = 'twk-q'; dock.dataset.open = '0';
    dock.innerHTML = '<button type="button" class="twk-q-btn" aria-haspopup="true" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button><div class="twk-q-panel" role="menu"><div class="twk-q-h">Quality <span class="twk-q-v">Auto</span></div>' +
      '<button type="button" class="twk-q-chip" data-q="hd">HD</button>' + (hasLow ? '<button type="button" class="twk-q-chip" data-q="sd">480p</button>' : '') +
      '<button type="button" class="twk-q-chip" data-q="auto">Auto</button></div>';
    function qRender() {
      var p = pref(), e = eff();
      dock.querySelector('.twk-q-v').textContent = p === 'auto' ? 'Auto · ' + (e === 'sd' ? '480p' : 'HD') : (e === 'sd' ? '480p' : 'HD');
      [].forEach.call(dock.querySelectorAll('.twk-q-chip'), function (c) { c.classList.toggle('on', c.dataset.q === p || (p !== 'auto' && c.dataset.q === e)); });
    }
    function applyQuality(keepTime) {
      var want = srcFor(eff()); if (v.getAttribute('data-src') === want) return;
      var t = keepTime ? v.currentTime : 0, was = !v.paused && !v.ended;
      v.setAttribute('data-src', want); v.src = want;
      if (keepTime && t > 0) v.addEventListener('loadedmetadata', function f() { v.removeEventListener('loadedmetadata', f); try { v.currentTime = t; } catch (_) {} if (was) v.play().catch(function () {}); });
      qRender();
    }
    dock.addEventListener('click', function (e) {
      e.stopPropagation();
      var c = e.target.closest('.twk-q-chip');
      if (c) { LS.set(Q_KEY, c.dataset.q); dock.dataset.open = '0'; applyQuality(true); say('Quality: ' + (eff() === 'sd' ? '480p' : 'HD')); return; }
      if (e.target.closest('.twk-q-btn')) dock.dataset.open = dock.dataset.open === '1' ? '0' : '1';
    });
    document.addEventListener('click', function (e) { if (!dock.contains(e.target)) dock.dataset.open = '0'; });
    box.appendChild(dock);

    /* pantalla completa (sobre el contenedor para que el dock y los avisos sigan visibles) */
    var fsBtn = document.createElement('button'); fsBtn.type = 'button'; fsBtn.className = 'np-fs'; fsBtn.setAttribute('aria-label', 'Fullscreen'); fsBtn.innerHTML = FS_ICON;
    function isFs() { return document.fullscreenElement === box || document.webkitFullscreenElement === box; }
    function toggleFs() {
      if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      var req = box.requestFullscreen || box.webkitRequestFullscreen;
      if (req) req.call(box); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    }
    fsBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleFs(); });
    box.appendChild(fsBtn);

    /* ayuda de atajos */
    var help = document.createElement('div'); help.className = 'np-help';
    help.innerHTML = '<div><h3>KEYBOARD SHORTCUTS</h3>' + KEYS.map(function (k) { return '<div class="r"><span>' + k[0] + '</span><span>' + k[1].split(' · ').map(function (x) { return '<kbd>' + x + '</kbd>'; }).join('') + '</span></div>'; }).join('') + '<p style="margin:12px 0 0;text-align:center;color:#999;font-size:12px">Press Esc or ? to close</p></div>';
    help.addEventListener('click', function () { help.classList.remove('on'); });
    box.appendChild(help);

    /* siguiente video */
    var idx = vids.indexOf(cur);
    function neighbor(dir) { for (var i = idx + dir; i >= 0 && i < vids.length; i += dir) if (!vids[i].locked) return vids[i]; return null; }
    var nextV = neighbor(1), prevV = neighbor(-1);
    var nx = document.createElement('div'); nx.className = 'np-next';
    box.appendChild(nx); var nxT;
    function showNext() {
      if (!nextV) return;
      var n = 5; nx.innerHTML = '<small>UP NEXT</small><img alt="" src="' + nextV.poster + '"><b></b><div><span class="np-cd" style="font:800 28px system-ui;color:#ffd76a"></span></div><div style="display:flex;gap:10px"><button class="twk-btn twk-btn--sm" data-a="go">PLAY NOW</button><button class="twk-btn twk-btn--ghost twk-btn--sm" data-a="no">CANCEL</button></div>';
      nx.querySelector('b').textContent = nextV.title; nx.classList.add('on');
      var cd = nx.querySelector('.np-cd'); cd.textContent = n;
      clearInterval(nxT); nxT = setInterval(function () { n--; cd.textContent = n; if (n <= 0) { clearInterval(nxT); location.href = urlFor(nextV, true); } }, 1000);
      nx.onclick = function (e) { var a = e.target.dataset && e.target.dataset.a; if (a === 'go') location.href = urlFor(nextV, true); if (a === 'no') { clearInterval(nxT); nx.classList.remove('on'); } };
    }
    v.addEventListener('ended', function () { if (LS.get(AUTO_KEY) !== '0') showNext(); });

    /* retomar + visto */
    var posKey = 'twk_nov_pos:' + slug + ':' + cur.id, lastSave = 0;
    v.addEventListener('loadedmetadata', function () {
      var p = parseFloat(LS.get(posKey));
      if (p > 8 && v.duration && p < v.duration - 8 && !v.dataset.resumed) { v.dataset.resumed = '1'; try { v.currentTime = p; say('Resumed at ' + fmt(p)); } catch (_) {} }
      var r = parseFloat(LS.get(SPEED_KEY)); if (r > 0) v.playbackRate = r;
    });
    v.addEventListener('timeupdate', function () {
      var now = Date.now(); if (now - lastSave < 4000) return; lastSave = now;
      if (v.currentTime > 3) markSeen(slug, cur.id);
      if (v.duration && v.currentTime > v.duration - 8) LS.set(posKey, '0'); else LS.set(posKey, String(v.currentTime));
    });
    v.addEventListener('volumechange', function () { LS.set(VOL_KEY, String(v.muted ? v.volume : v.volume)); });
    v.addEventListener('ratechange', function () { LS.set(SPEED_KEY, String(v.playbackRate)); });
    v.addEventListener('ended', function () { markSeen(slug, cur.id); LS.set(posKey, '0'); });

    /* teclado */
    var SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    function seek(dt) { var t = Math.min(Math.max(0, v.currentTime + dt), v.duration || 1e9); v.currentTime = t; say((dt > 0 ? '+' : '') + dt + ' s  ·  ' + fmt(t)); }
    function playPause() { if (v.paused) { v.play().catch(function () {}); say('Play'); } else { v.pause(); say('Pause'); } }
    function onKey(e) {
      var tg = e.target, tag = tg && tg.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
      if (document.querySelector('.nq-o')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (tag === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter') && !box.contains(tg)) return;
      var k = e.key, code = e.code, h = true;
      if (help.classList.contains('on')) { if (k === 'Escape' || k === '?' || k === 'h' || k === 'H') help.classList.remove('on'); e.preventDefault(); return; }
      if (code === 'Space' || k === 'k' || k === 'K') playPause();
      else if (k === 'Enter' || k === 'f' || k === 'F') toggleFs();
      else if (k === 'm' || k === 'M') { v.muted = !v.muted; say(v.muted ? 'Muted' : 'Volume ' + Math.round(v.volume * 100) + '%'); }
      else if (k === 'ArrowLeft') seek(-5); else if (k === 'ArrowRight') seek(5);
      else if (k === 'j' || k === 'J') seek(-10); else if (k === 'l' || k === 'L') seek(10);
      else if (k === 'ArrowUp') { v.muted = false; v.volume = Math.min(1, v.volume + 0.05); say('Volume ' + Math.round(v.volume * 100) + '%'); }
      else if (k === 'ArrowDown') { v.volume = Math.max(0, v.volume - 0.05); say('Volume ' + Math.round(v.volume * 100) + '%'); }
      else if (/^Digit[0-9]$/.test(code) && !e.shiftKey) { if (v.duration) { v.currentTime = v.duration * (+code.slice(5)) / 10; say(code.slice(5) + '0%'.replace('00%', '0%').replace(/^0%$/, '0%')); } }
      else if (k === 'Home') { v.currentTime = 0; say('Start'); } else if (k === 'End') { if (v.duration) v.currentTime = v.duration - 0.1; say('End'); }
      else if ((k === ',' || k === '.') && v.paused) { v.currentTime = Math.max(0, v.currentTime + (k === '.' ? 1 : -1) / 30); say('Frame ' + (k === '.' ? '+1' : '-1')); }
      else if (k === '<' || k === '>') { var i = SPEEDS.indexOf(v.playbackRate); if (i < 0) i = 3; i = Math.min(SPEEDS.length - 1, Math.max(0, i + (k === '>' ? 1 : -1))); v.playbackRate = SPEEDS[i]; say('Speed ' + SPEEDS[i] + 'x'); }
      else if (e.shiftKey && (k === 'N' || k === 'n')) { if (nextV) location.href = urlFor(nextV, true); else say('Last video'); }
      else if (e.shiftKey && (k === 'P' || k === 'p')) { if (prevV) location.href = urlFor(prevV, true); else say('First video'); }
      else if (k === 'q' || k === 'Q') dock.dataset.open = dock.dataset.open === '1' ? '0' : '1';
      else if (k === 'i' || k === 'I') { if (document.pictureInPictureElement) document.exitPictureInPicture(); else if (v.requestPictureInPicture) v.requestPictureInPicture().catch(function () {}); }
      else if (k === '?' || k === 'h' || k === 'H') help.classList.add('on');
      else if (k === 'Escape') { nx.classList.remove('on'); clearInterval(nxT); h = false; }
      else h = false;
      if (h) e.preventDefault();
    }
    document.addEventListener('keydown', onKey, true);

    /* doble toque/click: izquierda -10 s, derecha +10 s, centro pantalla completa */
    v.addEventListener('dblclick', function (e) {
      var r = v.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (y > 0.82) return;
      e.preventDefault();
      if (x < 0.33) seek(-10); else if (x > 0.67) seek(10); else toggleFs();
    });

    stage.replaceChildren(box);
    applyQuality(false); qRender();
    var q = new URLSearchParams(location.search);
    v.play().catch(function () { v.muted = true; v.play().then(function () { say('Tap the volume to unmute'); }).catch(function () {}); });

    /* ---------- barra de acciones ---------- */
    var bar = document.createElement('div'); bar.className = 'np-bar';
    var ap = document.createElement('button'); ap.type = 'button'; ap.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm' + (LS.get(AUTO_KEY) !== '0' ? ' on' : ''); ap.innerHTML = 'Autoplay next <i></i>';
    ap.onclick = function () { var on = !ap.classList.contains('on'); ap.classList.toggle('on', on); LS.set(AUTO_KEY, on ? '1' : '0'); };
    var pv = document.createElement('button'); pv.type = 'button'; pv.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm'; pv.textContent = '⏮ Previous'; pv.onclick = function () { if (prevV) location.href = urlFor(prevV, true); };
    var nt = document.createElement('button'); nt.type = 'button'; nt.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm'; nt.textContent = 'Next ⏭'; nt.onclick = function () { if (nextV) location.href = urlFor(nextV, true); };
    if (!prevV) pv.style.display = 'none'; if (!nextV) nt.style.display = 'none';
    var kb = document.createElement('button'); kb.type = 'button'; kb.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm'; kb.textContent = 'Keyboard shortcuts (?)'; kb.onclick = function () { help.classList.add('on'); };
    bar.append(pv, nt, ap, kb);
    if (o.bar) o.bar.replaceChildren(bar);

    }

    /* ---------- videos similares del mismo canal ---------- */
    if (side) {
      var seen = getSeen(slug), tall = cur.height > cur.width;
      var rest = vids.filter(function (x) { return x.id !== cur.id; }).map(function (x) {
        var s = 0; if ((x.height > x.width) === tall) s += 40;
        s -= Math.min(30, Math.abs((x.duration || 0) - (cur.duration || 0)) / 4);
        var dist = x.id > cur.id ? x.id - cur.id : (vids.length - cur.id + x.id); s -= Math.min(20, dist / 3);
        if (x.locked) s -= 100; if (seen[x.id]) s -= 15;
        return { x: x, s: s };
      }).sort(function (a, b) { return b.s - a.s; }).map(function (a) { return a.x; });
      side.innerHTML = '<h2>More from <span></span></h2><div class="np-list"></div>';
      side.querySelector('h2 span').textContent = d.name;
      var list = side.querySelector('.np-list'), shown = 0;
      function more() {
        rest.slice(shown, shown + 20).forEach(function (x) {
          var a = document.createElement('a'); a.className = 'np-item' + (x.locked ? ' lk' : '') + (seen[x.id] ? ' seen' : ''); a.href = x.locked ? '#' : urlFor(x, false);
          if (x.locked) a.addEventListener('click', function (e) { e.preventDefault(); if (window.TWK_NQ) TWK_NQ.open(); });
          a.innerHTML = '<div class="np-th"><img loading="lazy" alt=""><span class="np-d"></span></div><div><strong></strong><span class="sub"></span></div>';
          a.querySelector('img').src = x.poster; a.querySelector('.np-d').textContent = x.duration ? fmt(x.duration) : '';
          a.querySelector('strong').textContent = x.title;
          a.querySelector('.sub').textContent = x.locked ? 'VIP' : (seen[x.id] ? 'Viewed' : d.name);
          var th = a.querySelector('.np-th');
          if (x.locked) { var l = document.createElement('div'); l.className = 'np-lk'; l.innerHTML = LOCK; th.appendChild(l); }
          else if (seen[x.id]) { var vv = document.createElement('span'); vv.className = 'np-v'; vv.textContent = 'VIEWED'; th.appendChild(vv); }
          list.appendChild(a);
        });
        shown += 20; if (shown >= rest.length && mb.parentNode) mb.remove();
      }
      var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'twk-btn twk-btn--ghost twk-btn--block np-more'; mb.textContent = 'SHOW MORE'; mb.onclick = more;
      side.appendChild(mb); more();
    }
    return { video: v };
  }
  window.TWK_NP = { init: init, css: CSS, lock: LOCK };
})();
