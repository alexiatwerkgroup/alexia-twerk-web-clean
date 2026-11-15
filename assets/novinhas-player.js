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
    '.np-stage{position:relative;background:#000;border-radius:12px;overflow:hidden;height:min(74vh,640px);display:grid;place-items:center}' +
    '.np-stage.np-tall{height:min(74vh,640px)}' +
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
    '@media(max-width:540px){.twk-q-btn{height:40px}.twk-q-chip{height:40px}}' +
    '.twk-q-btn{width:auto;min-width:0;height:38px;padding:0 13px 0 11px;border-radius:999px;gap:6px;grid-auto-flow:column;border:1.5px solid #e8b84a;background:rgba(18,18,18,.82)}.twk-q-btn svg{width:18px;height:18px}.twk-q-lab{font:800 12px system-ui,sans-serif;letter-spacing:.04em}.np-stage video{cursor:pointer}.twk-q{display:none!important}.np-fs{display:none!important}' +
    '.np-qw{position:relative}.np-qm{position:absolute;left:0;right:0;bottom:calc(100% + 8px);display:none;flex-direction:column;gap:3px;padding:6px;border-radius:12px;background:rgba(18,16,8,.98);border:1.5px solid #e8b84a;box-shadow:0 12px 30px rgba(0,0,0,.7);z-index:30}.np-qw.open .np-qm{display:flex}.np-qm button{height:38px;border:0;border-radius:8px;background:transparent;color:#f5e6b3;font:800 12px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}.np-qm button:hover{background:rgba(255,255,255,.1)}.np-qm button.on{background:linear-gradient(180deg,#fff0a8,#f7c83a 45%,#d99a0b);color:#2a1a00}.np-qbtn svg{width:16px;height:16px}' +
    '.np-enh{pointer-events:auto;cursor:pointer;margin-top:8px;display:flex;flex-direction:column;align-items:flex-start;gap:3px;max-width:240px;padding:10px 14px 9px;border-radius:12px;border:1.5px solid #35e06f;background:linear-gradient(135deg,#04200f,#0a3a1c);box-shadow:0 0 18px rgba(53,224,111,.45),inset 0 1px 0 rgba(255,255,255,.12);text-align:left;font-family:system-ui,sans-serif;animation:neglow 1.6s ease-in-out infinite}.np-enh .ne-big{font:900 22px/1 Anton,Impact,system-ui,sans-serif;letter-spacing:.08em;color:#8dffb4;text-shadow:0 0 12px #35e06f;animation:neblink 1.1s steps(2,jump-none) infinite}.np-enh .ne-sm{font:600 10.5px/1.3 system-ui,sans-serif;color:#d6ffe4;opacity:.92}.np-enh:hover{transform:scale(1.04)}.np-enh.wait,.np-enh.off{border-color:#7a8a80;box-shadow:none;animation:none;background:rgba(10,20,14,.85)}.np-enh.wait .ne-big,.np-enh.off .ne-big{color:#b9c7be;text-shadow:none;animation:none}.np-enh.on{animation:none;box-shadow:0 0 12px rgba(53,224,111,.35)}.np-enh.on .ne-big{animation:none}@keyframes neblink{0%{opacity:1}50%{opacity:.35}}@keyframes neglow{0%,100%{box-shadow:0 0 12px rgba(53,224,111,.35),inset 0 1px 0 rgba(255,255,255,.12)}50%{box-shadow:0 0 26px rgba(53,224,111,.85),inset 0 1px 0 rgba(255,255,255,.12)}}' +
    '.np-meta{max-width:250px}.np-meta span{white-space:normal!important}.np-enh span{background:none!important;padding:0!important;border-radius:0!important;white-space:normal!important}.np-enh .ne-big{white-space:nowrap!important}' +
        '.np-meta{position:absolute;z-index:11;left:12px;top:60px;display:flex;flex-direction:column;gap:5px;align-items:flex-start;pointer-events:none;font-family:system-ui,sans-serif}.np-meta span{padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.62);color:#fff;font:700 12px/1.3 system-ui,sans-serif;letter-spacing:.02em;text-shadow:0 1px 4px #000;white-space:nowrap}.np-meta .np-rec{color:#ffd76a;border:1px solid #ffd76a66}.np-meta .np-cd{font-variant-numeric:tabular-nums}' +
    /* siguiente + ayuda */
    '.np-next{position:absolute;inset:0;z-index:15;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.78);text-align:center;padding:20px;font-family:system-ui,sans-serif}' +
    '.np-next.on{display:flex}.np-next small{color:#e8b84a;letter-spacing:.14em;font-weight:800;font-size:11px}.np-next b{font-size:18px;max-width:560px;line-height:1.35}' +
    '.np-next img{width:150px;max-height:110px;object-fit:cover;border-radius:10px}' +
        '.np-help{position:absolute;inset:0;z-index:16;display:none;place-items:center;background:rgba(0,0,0,.82);padding:14px;overflow:auto}' +
    '.np-minis{position:absolute;z-index:6;right:8px;top:8px;bottom:60px;display:none;flex-direction:column;gap:6px;pointer-events:none;font-family:system-ui,sans-serif}.np-minis.on{display:flex}' +
    '.np-mh{display:flex;align-items:center;gap:6px;font:900 10px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#ffd76a;text-shadow:0 1px 3px #000}.np-mh i{width:8px;height:8px;border-radius:50%;background:#ff2d2d;box-shadow:0 0 6px #ff2d2d}' +
    '.np-mg{display:grid;gap:8px;align-content:start;justify-content:end}' +
    '.np-minis.strip{position:static;margin:12px 0 0;pointer-events:auto}.np-minis.strip .np-mg{grid-template-columns:repeat(auto-fill,minmax(96px,130px));justify-content:start}' +
    '.np-mc{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:#111;border:1.5px solid #e8b84a;pointer-events:auto;cursor:pointer;padding:0;box-shadow:0 4px 14px rgba(0,0,0,.6);transition:transform .12s,filter .12s}.np-mc:hover{transform:translateY(-2px);filter:brightness(1.1)}' +
    '.np-mc img,.np-mc video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.np-mc video{background:#000}' +
    '.np-mc b{position:absolute;left:6px;bottom:6px;padding:3px 7px;border-radius:6px;background:rgba(0,0,0,.72);color:#fff;font:800 10px/1 system-ui,sans-serif;letter-spacing:.06em}.np-mc b.sl{background:linear-gradient(180deg,#9b5cff,#5b21b6)}' +
    '.np-mbox{position:fixed;inset:0;z-index:2147483000;display:none;place-items:center;background:rgba(0,0,0,.88)}.np-mbox.on{display:grid}' +
    '.np-mbox>div{position:relative;height:min(88vh,760px);aspect-ratio:9/16;max-width:94vw;background:#000;border-radius:14px;overflow:hidden;border:1.5px solid #e8b84a}.np-mbox video{width:100%;height:100%;object-fit:contain;background:#000}' +
    '.np-mbox .mx{position:absolute;right:8px;top:8px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;font:900 20px/1 system-ui;cursor:pointer;z-index:2}' +
    '.np-mbox .mi{position:absolute;left:0;right:0;bottom:46px;padding:22px 12px 8px;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font:800 12px system-ui;color:#fff;z-index:2;pointer-events:none}.np-mbox .mi a,.np-mbox .mi button{pointer-events:auto;color:#1a1100;background:linear-gradient(180deg,#ffe27a,#f0b90b 55%,#c98f00);border:0;border-radius:8px;padding:8px 12px;font:800 11px system-ui;letter-spacing:.06em;text-decoration:none;cursor:pointer}.np-mbox .mi button.rm{background:linear-gradient(180deg,#ff5148,#a30f0f);color:#fff}' +
    '.np-rb{display:inline-flex;align-items:center;justify-content:center;gap:7px}.np-rb i{width:11px;height:11px;border-radius:50%;background:#ff2d2d;box-shadow:0 0 8px #ff2d2d;flex:none}.np-rb.busy{opacity:.6;pointer-events:none}.np-rb.ok i{background:#35e06f;box-shadow:0 0 8px #35e06f}' +
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
    ['Volume', '↑ ↓'], ['Jump to 0%–90%', '0 – 9'], ['Start / end', 'Home · End'], ['Frame step (paused)', ', .'], ['Speed down / up', '- + · < >'], ['Slow motion', 'S'],
    ['Next / previous video', 'Shift+N · Shift+P · Right Ctrl'], ['Enhanced version', 'E'], ['Quality menu', 'Q'], ['Picture in picture', 'I'], ['This help', '? · H']
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
    v.setAttribute('controlsList', 'nodownload noremoteplayback nofullscreen'); v.setAttribute('disablePictureInPicture', ''); v.removeAttribute('disablePictureInPicture');
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var vol = parseFloat(LS.get(VOL_KEY)); if (!isNaN(vol)) v.volume = Math.min(1, Math.max(0, vol));
    var sp = parseFloat(LS.get(SPEED_KEY)); if (sp > 0) v.playbackRate = sp;
    box.appendChild(v);

    var toast = document.createElement('div'); toast.className = 'np-toast'; box.appendChild(toast);
    /* ---------- miniclips (30 s) en el espacio libre de la derecha del video vertical ---------- */
    var mini = { box: document.createElement('div'), grid: document.createElement('div'), items: [], owner: false };
    mini.box.className = 'np-minis'; mini.box.innerHTML = '<div class="np-mh"><i></i>Miniclips</div>'; mini.grid.className = 'np-mg'; mini.box.appendChild(mini.grid); box.appendChild(mini.box);
    var mbox = document.createElement('div'); mbox.className = 'np-mbox'; mbox.innerHTML = '<div><button type="button" class="mx" aria-label="Close">&times;</button><div class="mi"></div></div>'; document.body.appendChild(mbox);
    function mclose() { var mv = mbox.querySelector('video'); if (mv) { mv.pause(); mv.remove(); } mbox.classList.remove('on'); }
    mbox.addEventListener('click', function (e) { if (e.target === mbox || e.target.classList.contains('mx')) mclose(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mbox.classList.contains('on')) mclose(); });
    function mopen(it) {
      var holder = mbox.firstChild, old = holder.querySelector('video'); if (old) old.remove();
      var mv = document.createElement('video'); mv.src = it.src; mv.controls = true; mv.loop = true; mv.playsInline = true; mv.autoplay = true; mv.setAttribute('controlsList', 'nodownload noremoteplayback'); mv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      holder.insertBefore(mv, holder.firstChild);
      var mi = holder.querySelector('.mi'); mi.innerHTML = '<span>' + (it.slow ? 'Slow motion · ' : '') + '30 s · @' + String(it.name).replace(/[<>&"]/g, '') + '</span>'; var go = document.createElement('a'); go.href = it.url; go.textContent = 'Full video'; mi.appendChild(go);
      if (mini.owner) { var dl = document.createElement('a'); dl.href = it.src; dl.setAttribute('download', it.c + '-' + it.id + '-' + it.start + (it.slow ? '-slow' : '') + '.mp4'); dl.textContent = 'Download'; mi.appendChild(dl); var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'rm'; rm.textContent = 'Delete'; rm.onclick = function () { rm.disabled = true; fetch('/api/novinhas/mini', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', c: it.c, id: it.id, start: it.start, slow: it.slow }) }).then(function () { mclose(); minisLoad(); }).catch(function () { rm.disabled = false; }); }; mi.appendChild(rm); }
      mbox.classList.add('on'); try { v.pause(); } catch (_) {} mv.play().catch(function () {});
    }
    function minisLayout() {
      var n = mini.items.length; if (!n || !cur || !v.videoWidth) { mini.box.classList.remove('on'); return; }
      var W = box.clientWidth, H = box.clientHeight, vw = Math.min(W, H * v.videoWidth / v.videoHeight), free = Math.floor((W - vw) / 2) - 14;
      if (!(cur.height > cur.width) || free < 96) { /* video horizontal o sin espacio al costado: tira de miniclips debajo del reproductor */
        if (!mini.box.classList.contains('strip')) { mini.box.classList.add('strip'); mini.box.style.width = ''; mini.grid.style.gridTemplateColumns = ''; box.parentNode.insertBefore(mini.box, box.nextSibling); }
        [].forEach.call(mini.grid.children, function (c) { c.style.display = ''; });
        mini.box.classList.add('on'); return;
      }
      if (mini.box.classList.contains('strip')) { mini.box.classList.remove('strip'); box.appendChild(mini.box); }
      var cols = free >= 150 ? 3 : (free >= 100 ? 2 : 1), gap = 6, cw = Math.floor((Math.min(free, 420) - gap * (cols - 1)) / cols), ch = Math.round(cw * 16 / 9), avail = H - 68 - 18, rows = Math.max(1, Math.floor((avail + gap) / (ch + gap))), cnt = Math.min(n, cols * rows);
      mini.box.style.width = (cw * cols + gap * (cols - 1)) + 'px'; mini.grid.style.gridTemplateColumns = 'repeat(' + cols + ',' + cw + 'px)';
      [].forEach.call(mini.grid.children, function (c, i) { c.style.display = i < cnt ? '' : 'none'; });
      mini.box.classList.add('on');
    }
    function minisLoad() {
      fetch('/api/novinhas/mini?c=' + encodeURIComponent(slug) + '&n=9&t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (j) {
        mini.items = (j && j.items) || []; mini.grid.innerHTML = '';
        mini.items.forEach(function (it) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'np-mc'; b.setAttribute('aria-label', 'Miniclip @' + it.name);
          b.innerHTML = (it.poster ? '<img alt="" loading="lazy" src="' + it.poster + '">' : '') + '<b' + (it.slow ? ' class="sl"' : '') + '>' + (it.slow ? 'SLOW · 30s' : '30s') + '</b>';
          var pv2 = null;
          b.addEventListener('mouseenter', function () { if (pv2 || !window.matchMedia('(hover:hover)').matches) return; pv2 = document.createElement('video'); pv2.src = it.src; pv2.muted = true; pv2.loop = true; pv2.playsInline = true; pv2.preload = 'metadata'; b.insertBefore(pv2, b.firstChild); pv2.play().catch(function () {}); });
          b.addEventListener('mouseleave', function () { if (pv2) { pv2.pause(); pv2.remove(); pv2 = null; } });
          b.addEventListener('click', function () { if (pv2) { pv2.pause(); pv2.remove(); pv2 = null; } mopen(it); });
          mini.grid.appendChild(b);
        });
        minisLayout();
      }).catch(function () {});
    }
    var tt; function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 900); }

    /* calidad */
    function hdLabel() { var m = Math.min(cur.width || 0, cur.height || 0); return m >= 2000 ? '4K' : m >= 1400 ? '1440p' : m >= 1000 ? '1080p' : m >= 700 ? '720p' : 'HD'; }
    var hasLow = !!cur.lowVideo && cur.lowVideo !== cur.video;
    var conn = navigator.connection || {};
    var slowNet = !!(conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || ''));
    function pref() { var p = LS.get(Q_KEY); return (p === 'hd' || p === 'sd' || p === 'auto') ? p : 'auto'; }
    function eff() { var p = pref(); if (!hasLow) return 'hd'; if (p === 'auto') return slowNet ? 'sd' : 'hd'; return p; }
    function srcFor(e) { return e === 'sd' ? cur.lowVideo : cur.video; }
    var dock = document.createElement('div'); dock.className = 'twk-q'; dock.dataset.open = '0';
    dock.innerHTML = '<button type="button" class="twk-q-btn" aria-haspopup="true" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span class="twk-q-lab"></span></button><div class="twk-q-panel" role="menu"><div class="twk-q-h">Quality <span class="twk-q-v">Auto</span></div>' +
      '<button type="button" class="twk-q-chip" data-q="hd">' + hdLabel() + '</button>' + (hasLow ? '<button type="button" class="twk-q-chip" data-q="sd">480p</button>' : '') +
      '<button type="button" class="twk-q-chip" data-q="auto">Auto</button></div>';
    function qRender() {
      var p = pref(), e = eff();
      var lab = dock.querySelector('.twk-q-lab'); if (lab) lab.textContent = (e === 'sd' ? '480p' : hdLabel());
      dock.querySelector('.twk-q-v').textContent = p === 'auto' ? 'Auto · ' + (e === 'sd' ? '480p' : hdLabel()) : (e === 'sd' ? '480p' : hdLabel());
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
      if (c) { LS.set(Q_KEY, c.dataset.q); dock.dataset.open = '0'; applyQuality(true); say('Quality: ' + (eff() === 'sd' ? '480p' : hdLabel())); return; }
      if (e.target.closest('.twk-q-btn')) dock.dataset.open = dock.dataset.open === '1' ? '0' : '1';
    });
    document.addEventListener('click', function (e) { if (!dock.contains(e.target)) dock.dataset.open = '0'; });
    box.appendChild(dock);

    /* pantalla completa (sobre el contenedor para que el dock y los avisos sigan visibles) */
    var fsBtn = document.createElement('button'); fsBtn.type = 'button'; fsBtn.className = 'np-fs'; fsBtn.setAttribute('aria-label', 'Fullscreen'); fsBtn.innerHTML = FS_ICON;
    function isFs() { var f = document.fullscreenElement || document.webkitFullscreenElement; return !!f && (f === box || f === v || box.contains(f)); }
    function toggleFs() {
      if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      var req = box.requestFullscreen || box.webkitRequestFullscreen;
      if (req) req.call(box); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    }
    fsBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleFs(); });
    box.appendChild(fsBtn);
    v.addEventListener('dblclick', function (e) { e.preventDefault(); toggleFs(); });

    /* ayuda de atajos */
    var help = document.createElement('div'); help.className = 'np-help';
    help.innerHTML = '<div><h3>KEYBOARD SHORTCUTS</h3>' + KEYS.map(function (k) { return '<div class="r"><span>' + k[0] + '</span><span>' + k[1].split(' · ').map(function (x) { return '<kbd>' + x + '</kbd>'; }).join('') + '</span></div>'; }).join('') + '<p style="margin:12px 0 0;text-align:center;color:#999;font-size:12px">Press Esc or ? to close</p></div>';
    help.addEventListener('click', function () { help.classList.remove('on'); });
    box.appendChild(help);

    /* siguiente video */
    var idx = vids.indexOf(cur);
    function neighbor(dir) { for (var i = idx + dir; i >= 0 && i < vids.length; i += dir) if (!vids[i].locked) return vids[i]; return null; }
    var nextV = neighbor(1), prevV = neighbor(-1);
    /* Cambio de video SIN recargar cuando esta en pantalla completa (si no, el navegador sale del fullscreen).
       Al salir de pantalla completa se re-sincroniza la pagina (titulo, lista, likes) con el video actual. */
    var needSync = false;
    function goTo(x, auto) {
      if (!x) return;
      if (!isFs() || x.locked) { location.href = urlFor(x, auto); return; }
      clearInterval(nxT); nx.classList.remove('on'); markSeen(slug, cur.id);
      cur = x; hasLow = !!cur.lowVideo && cur.lowVideo !== cur.video; idx = vids.indexOf(cur); nextV = neighbor(1); prevV = neighbor(-1);
      posKey = 'twk_nov_pos:' + slug + ':' + cur.id; delete v.dataset.resumed;
      box.className = 'np-stage' + (cur.height > cur.width ? ' np-tall' : ''); v.poster = cur.poster;
      v.removeAttribute('data-src'); applyQuality(false); v.play().catch(function () {});
      try { history.replaceState(null, '', urlFor(cur, false)); } catch (_) {}
      needSync = true; try { enhRefresh(); posTxt(); setRec(); tech(); mRes.textContent = ''; tick(); } catch (_) {} say(cur.title || 'Next');
    }
    function onFsChange() { if (needSync && !document.fullscreenElement && !document.webkitFullscreenElement) { needSync = false; location.replace(urlFor(cur, false)); } }
    document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);
    var nx = document.createElement('div'); nx.className = 'np-next';
    box.appendChild(nx); var nxT;
    function showNext() {
      if (!nextV) return;
      var n = 3; nx.innerHTML = '<small>UP NEXT</small><img alt="" src="' + nextV.poster + '"><b></b><div><span class="np-cd" style="font:800 28px system-ui;color:#ffd76a"></span></div><div style="display:flex;gap:10px"><button class="twk-btn twk-btn--sm" data-a="go">PLAY NOW</button><button class="twk-btn twk-btn--ghost twk-btn--sm" data-a="no">CANCEL</button></div>';
      nx.querySelector('b').textContent = nextV.title; nx.classList.add('on');
      var cd = nx.querySelector('.np-cd'); cd.textContent = n;
      clearInterval(nxT); nxT = setInterval(function () { n--; cd.textContent = n; if (n <= 0) { clearInterval(nxT); goTo(nextV, true); } }, 1000);
      nx.onclick = function (e) { var a = e.target.dataset && e.target.dataset.a; if (a === 'go') goTo(nextV, true); if (a === 'no') { clearInterval(nxT); nx.classList.remove('on'); } };
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
    /* Viewed fiable: se marca a los 2 s de reproduccion real, al pausar/salir y al terminar (sin depender del throttle de timeupdate) */
    var seenT = null;
    v.addEventListener('playing', function () { clearTimeout(seenT); seenT = setTimeout(function () { if (!v.paused) markSeen(slug, cur.id); }, 2000); });
    v.addEventListener('pause', function () { clearTimeout(seenT); if (v.currentTime > 2) markSeen(slug, cur.id); });
    window.addEventListener('pagehide', function () { if (v.currentTime > 2) markSeen(slug, cur.id); });

    /* teclado */
    var SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    function seek(dt) { var t = Math.min(Math.max(0, v.currentTime + dt), v.duration || 1e9); v.currentTime = t; say((dt > 0 ? '+' : '') + dt + ' s  ·  ' + fmt(t)); }
    function playPause() { if (v.paused) { v.play().catch(function () {}); say('Play'); } else { v.pause(); say('Pause'); } }
    var slowBtn = null;
    function setRate(r) { v.defaultPlaybackRate = r; v.playbackRate = r; if (slowBtn) slowBtn.classList.toggle('on', r < 1); say('Speed ' + r + 'x' + (r === 0.5 ? ' · slow motion' : '')); }
    function stepSpeed(dir) { var i = SPEEDS.indexOf(v.playbackRate); if (i < 0) { i = 0; while (i < SPEEDS.length - 1 && SPEEDS[i] < v.playbackRate) i++; } i = Math.min(SPEEDS.length - 1, Math.max(0, i + dir)); setRate(SPEEDS[i]); }
    function toggleSlow() { setRate(v.playbackRate === 0.5 ? 1 : 0.5); }
    function onKey(e) {
      var tg = e.target, tag = tg && tg.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
      if (document.querySelector('.nq-o')) return;
      if (e.code === 'ControlRight' && !e.repeat) { e.preventDefault(); if (nextV) goTo(nextV, true); else say('Last video'); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (tag === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter') && !box.contains(tg)) return;
      var k = e.key, code = e.code, h = true;
      if (help.classList.contains('on')) { if (k === 'Escape' || k === '?' || k === 'h' || k === 'H') help.classList.remove('on'); e.preventDefault(); return; }
      if (code === 'Space' || k === 'k' || k === 'K') playPause();
      else if (k === 'Enter' || k === 'f' || k === 'F') toggleFs();
      else if ((k === 'e' || k === 'E') && !e.shiftKey) { if (typeof enh !== 'undefined' && enh && enh.style.display !== 'none') { if (enh.disabled) say(enhOn ? 'Enhanced already on' : 'Upgrade in progress'); else enh.click(); } else enhQueue(); }
      else if (k === 'm' || k === 'M') { v.muted = !v.muted; say(v.muted ? 'Muted' : 'Volume ' + Math.round(v.volume * 100) + '%'); }
      else if (k === 'ArrowLeft') seek(-5); else if (k === 'ArrowRight') seek(5);
      else if (k === 'j' || k === 'J') seek(-10); else if (k === 'l' || k === 'L') seek(10);
      else if (k === 'ArrowUp') { v.muted = false; v.volume = Math.min(1, v.volume + 0.05); say('Volume ' + Math.round(v.volume * 100) + '%'); }
      else if (k === 'ArrowDown') { v.volume = Math.max(0, v.volume - 0.05); say('Volume ' + Math.round(v.volume * 100) + '%'); }
      else if (/^Digit[0-9]$/.test(code) && !e.shiftKey) { if (v.duration) { v.currentTime = v.duration * (+code.slice(5)) / 10; say(code.slice(5) + '0%'.replace('00%', '0%').replace(/^0%$/, '0%')); } }
      else if (k === 'Home') { v.currentTime = 0; say('Start'); } else if (k === 'End') { if (v.duration) v.currentTime = v.duration - 0.1; say('End'); }
      else if ((k === ',' || k === '.') && v.paused) { v.currentTime = Math.max(0, v.currentTime + (k === '.' ? 1 : -1) / 30); say('Frame ' + (k === '.' ? '+1' : '-1')); }
      else if ((k === 's' || k === 'S') && !e.shiftKey) toggleSlow();
      else if (k === '+' || k === '=' || code === 'NumpadAdd') stepSpeed(1);
      else if (k === '-' || k === '_' || code === 'NumpadSubtract') stepSpeed(-1);
      else if (k === '<' || k === '>') { var i = SPEEDS.indexOf(v.playbackRate); if (i < 0) i = 3; i = Math.min(SPEEDS.length - 1, Math.max(0, i + (k === '>' ? 1 : -1))); v.playbackRate = SPEEDS[i]; say('Speed ' + SPEEDS[i] + 'x'); }
      else if (e.shiftKey && (k === 'N' || k === 'n')) { if (nextV) goTo(nextV, true); else say('Last video'); }
      else if (e.shiftKey && (k === 'P' || k === 'p')) { if (prevV) goTo(prevV, true); else say('First video'); }
      else if (k === 'q' || k === 'Q') dock.dataset.open = dock.dataset.open === '1' ? '0' : '1';
      else if (k === 'i' || k === 'I') { if (document.pictureInPictureElement) document.exitPictureInPicture(); else if (v.requestPictureInPicture) v.requestPictureInPicture().catch(function () {}); }
      else if (k === '?' || k === 'h' || k === 'H') help.classList.add('on');
      else if (k === 'Escape') { nx.classList.remove('on'); clearInterval(nxT); h = false; }
      else h = false;
      if (h) e.preventDefault();
    }
    document.addEventListener('keydown', onKey, true);

    /* un toque/click en el video: pausa / reproduce (el doble toque sigue saltando 10 s / pantalla completa) */
    var clickT = 0;
    v.addEventListener('click', function (e) {
      var r = v.getBoundingClientRect();
      if (e.clientY > r.bottom - 56) return; /* barra nativa de controles */
      clearTimeout(clickT);
      var was = v.paused; /* si el navegador ya alternó solo, no volver a alternar */
      clickT = setTimeout(function () { if (v.paused === was) playPause(); }, 230);
    });
    v.addEventListener('dblclick', function () { clearTimeout(clickT); }, true);

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

    /* resolucion + cuenta regresiva (todos) y fecha de grabacion (solo el dueño) */
    var meta = document.createElement('div'); meta.className = 'np-meta';
    var mRes = document.createElement('span'), mCd = document.createElement('span'); mCd.className = 'np-cd';
    var mTech = document.createElement('span'); var mPos = document.createElement('span'); function posTxt() { mPos.textContent = 'Video ' + (vids.indexOf(cur) + 1) + ' of ' + vids.length; } posTxt(); meta.append(mPos, mRes, mCd, mTech); box.appendChild(meta);
    /* version mejorada (IA): 1 moneda por video, cupo diario; sin descarga */
    var enh = document.createElement('button'); enh.type = 'button'; enh.className = 'np-enh'; enh.style.display = 'none';
    function eset(big, small, cls) { enh.className = 'np-enh' + (cls ? ' ' + cls : ''); enh.innerHTML = '<span class="ne-big">' + big + '</span><span class="ne-sm">' + small + '</span>'; }
    meta.appendChild(enh); var enhOn = false;
    enh.addEventListener('click', function (e) {
      e.stopPropagation(); if (enhOn) return; enh.disabled = true;
      fetch('/api/novinhas/enhance?use=1', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c: slug, id: cur.id }) })
        .then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); }).then(function (o) {
          if (o.st === 401) { eset('SIGN UP FREE','Create a free account to unlock the enhanced version',''); enh.disabled = false; return; }
          if (o.st === 402) { eset('NO COINS LEFT','Free limit: ' + o.j.max + '/day · VIP gets 3x · back tomorrow','off'); enh.disabled = false; return; }
          if (!o.j.ok) { eset('NOT AVAILABLE','Try again in a moment','off'); enh.disabled = false; return; }
          var t = v.currentTime, was = !v.paused; enhOn = true; v.setAttribute('data-src', o.j.src); v.src = o.j.src;
          v.addEventListener('loadedmetadata', function f() { v.removeEventListener('loadedmetadata', f); try { v.currentTime = t; } catch (_) {} if (was) v.play().catch(function () {}); });
          v.addEventListener('error', function ef() { v.removeEventListener('error', ef); if (!enhOn) return; enhOn = false; v.removeAttribute('data-src'); applyQuality(false); v.play().catch(function () {}); eset('NOT AVAILABLE','Upgraded file failed to load · playing original','off'); enh.disabled = true; });
          eset('ENHANCED ON','Now playing the upgraded version' + (o.j.left < 900 ? ' · ' + o.j.left + ' coins left today' : ''),'on');
        }).catch(function () { enh.disabled = false; });
    });
    var enhJ = null;
    function enhRefresh() {
      if (!enhJ) return; var j = enhJ, id = cur.id; enhOn = false; enh.disabled = false; enh.style.cursor = '';
      if (j.ready.indexOf(id) >= 0) { enh.style.display = ''; eset('UPGRADE','Enhanced quality ready · tap to watch it now · ' + (j.owner ? 'free for you' : '1 coin · ' + j.left + ' of ' + j.max + ' left today'),''); }
      else if (j.queued.indexOf(id) >= 0) { enh.style.display = ''; enh.disabled = true; enh.style.cursor = 'default'; eset('ENHANCED','Being processed · come back later',''); }
      else enh.style.display = 'none';
    }
    function enhQueue() {
      if (!enhJ || !enhJ.owner) { say('No enhanced version'); return; }
      fetch('/api/novinhas/enhance', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c: slug, id: cur.id, title: cur.title || '', t: Math.floor(v.currentTime || 0), slow: v.playbackRate < 1 ? 1 : 0 }) })
        .then(function (r) { return r.json(); }).then(function (o) { if (o && o.ok) { if (enhJ.queued.indexOf(cur.id) < 0) enhJ.queued.push(cur.id); enhRefresh(); say(v.playbackRate < 1 ? 'Added · 30 s clip from here · being processed' : 'Added · being processed, come back later'); } else say('Could not add'); }).catch(function () { say('Could not add'); });
    }
    fetch('/api/novinhas/enhance?c=' + encodeURIComponent(slug), { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return; enhJ = j; enhRefresh();
    }).catch(function () {});
    function fmtT(t) { t = Math.max(0, Math.ceil(t)); var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s2 = t % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s2 < 10 ? '0' : '') + s2; }
    function resTxt() {
      var w = v.videoWidth || cur.width || 0, h = v.videoHeight || cur.height || 0; if (!w || !h) return '';
      var s1 = Math.min(w, h), tag = s1 >= 2000 ? '4K' : s1 >= 1400 ? '2K' : s1 >= 1000 ? 'Full HD' : s1 >= 700 ? 'HD' : 'SD';
      return w + ' × ' + h + ' · ' + tag;
    }
    function tick() { var d = v.duration || cur.duration || 0; mCd.textContent = d ? '−' + fmtT(d - v.currentTime) : ''; var r = resTxt(); if (r && mRes.textContent !== r) mRes.textContent = r; }
    ['loadedmetadata', 'timeupdate', 'durationchange', 'seeked'].forEach(function (ev) { v.addEventListener(ev, tick); }); tick();
    var recJ = null, recEl = null;
    function setRec() {
      if (!recJ || !recEl) return; var e = recJ.dates && recJ.dates[String(cur.id)];
      var mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], lab = { meta: 'recorded', title: 'date in title', mtime: 'file date' };
      if (e && /^\d{4}-\d{2}-\d{2}$/.test(e.d)) { var p3 = e.d.split('-'); recEl.textContent = 'REC ' + (+p3[2]) + ' ' + mn[+p3[1] - 1] + ' ' + p3[0] + ' · ' + (lab[e.m] || e.m); } else recEl.textContent = 'REC date not found';
    }
    fetch('/api/novinhas/recdate?c=' + encodeURIComponent(slug), { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.owner) return; recJ = j;
      recEl = document.createElement('span'); recEl.className = 'np-rec'; meta.insertBefore(recEl, meta.firstChild); setRec();
    }).catch(function () {});
    /* ficha tecnica: FPS exactos (tabla stts del mp4) y tasa de bits (tamaño / duracion) del archivo que se esta reproduciendo */
    var techCache = {};
    function techParse(buf, total, dur) {
      var u = new Uint8Array(buf), dv = new DataView(buf), out = {};
      function at(str, from) { var n = str.length; outer: for (var i = from || 0; i < u.length - n; i++) { for (var k = 0; k < n; k++) if (u[i + k] !== str.charCodeAt(k)) continue outer; return i; } return -1; }
      var h = -1, from = 0; for (;;) { var i = at('hdlr', from); if (i < 0) break; if (String.fromCharCode(u[i + 12], u[i + 13], u[i + 14], u[i + 15]) === 'vide') { h = i; break; } from = i + 4; }
      if (h > 0) {
        var m = -1; from = 0; for (;;) { var j = at('mdhd', from); if (j < 0 || j > h) break; m = j; from = j + 4; }
        var st = at('stts', h);
        if (m > 0 && st > 0) {
          var ver = u[m + 4], ts = ver === 1 ? dv.getUint32(m + 24) : dv.getUint32(m + 16);
          var n = dv.getUint32(st + 8), cnt = 0, tt = 0, p2 = st + 12;
          for (var e = 0; e < n && p2 + 8 <= u.length; e++, p2 += 8) { var c = dv.getUint32(p2), d2 = dv.getUint32(p2 + 4); cnt += c; tt += c * d2; }
          if (ts && tt && cnt) out.fps = cnt / (tt / ts);
        }
      }
      if (total && dur) out.kbps = total * 8 / dur / 1000;
      return out;
    }
    function techShow(o) {
      var el = document.getElementById('np-tech'); if (!el) { var b = document.querySelector('#info .np-info'); if (!b) return; el = document.createElement('div'); el.id = 'np-tech'; el.style.cssText = 'margin-top:6px;font:700 13px/1.5 ui-monospace,Consolas,monospace;color:#ffd76a'; b.appendChild(el); }
      var t = []; if (o.fps) t.push('FPS: ' + o.fps.toFixed(3)); if (o.kbps) t.push('Bitrate: ' + o.kbps.toFixed(1) + ' kbps'); el.textContent = t.join('  ·  '); mTech.innerHTML = t.join('<br>');
    }
    function tech() {
      var url = v.getAttribute('data-src') || cur.video; if (!url) return;
      if (techCache[url]) { techShow(techCache[url]); return; }
      fetch(url, { headers: { Range: 'bytes=0-786431' }, credentials: 'same-origin' }).then(function (r) {
        var cr = /\/(\d+)$/.exec(r.headers.get('Content-Range') || ''), total = cr ? +cr[1] : +r.headers.get('Content-Length') || 0;
        return r.arrayBuffer().then(function (b) { return { b: b, total: total }; });
      }).then(function (x) { var o = techParse(x.b, x.total, cur.duration || v.duration || 0); techCache[url] = o; techShow(o); }).catch(function () {});
    }
    setTimeout(tech, 600); v.addEventListener('loadedmetadata', function () { setTimeout(tech, 300); });
    /* ---------- barra de acciones ---------- */
    var bar = document.createElement('div'); bar.className = 'np-bar';
    var ap = document.createElement('button'); ap.type = 'button'; ap.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm' + (LS.get(AUTO_KEY) !== '0' ? ' on' : ''); ap.innerHTML = 'Autoplay <i></i>';
    ap.onclick = function () { var on = !ap.classList.contains('on'); ap.classList.toggle('on', on); LS.set(AUTO_KEY, on ? '1' : '0'); };
    var pv = document.createElement('button'); pv.type = 'button'; pv.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm'; pv.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zM9.5 12 18 6v12z"/></svg>Previous'; pv.onclick = function () { if (prevV) goTo(prevV, true); };
    var nt = document.createElement('button'); nt.type = 'button'; nt.className = 'np-pill twk-btn twk-btn--ghost twk-btn--sm'; nt.innerHTML = 'Next<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18V6l8.5 6z"/></svg>'; nt.onclick = function () { if (nextV) goTo(nextV, true); };
    if (!prevV) pv.disabled = true; if (!nextV) nt.disabled = true;
    /* barra de abajo: dos grupos iguales. Calidad por un lado; Slow motion + REC (miniclip de 30 s, solo dueño) por el otro */
    var BTN = 'np-pill twk-btn twk-btn--ghost twk-btn--sm';
    var kb = document.createElement('button'); kb.type = 'button'; kb.className = BTN + ' np-kb'; kb.textContent = 'Keyboard shortcuts'; kb.onclick = function () { help.classList.add('on'); };
    var qw = document.createElement('div'); qw.className = 'np-qw';
    var qbtn = document.createElement('button'); qbtn.type = 'button'; qbtn.className = BTN + ' np-qbtn'; qbtn.setAttribute('aria-haspopup', 'true'); qbtn.innerHTML = '<span class="ql">HD</span><svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>';
    var qm = document.createElement('div'); qm.className = 'np-qm'; qm.innerHTML = '<button type="button" data-q="hd">' + hdLabel() + ' · Original</button>' + (hasLow ? '<button type="button" data-q="sd">480p</button>' : '') + '<button type="button" data-q="auto">Auto</button>';
    qw.append(qbtn, qm);
    var qRender0 = qRender; qRender = function () { qRender0(); var p = pref(), e = eff(); qbtn.querySelector('.ql').textContent = (e === 'sd' ? '480p' : hdLabel()); qbtn.title = p === 'auto' ? 'Auto' : ''; [].forEach.call(qm.querySelectorAll('button[data-q]'), function (b) { b.classList.toggle('on', b.dataset.q === p); }); };
    qbtn.onclick = function (e) { e.stopPropagation(); qw.classList.toggle('open'); };
    qm.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; LS.set(Q_KEY, b.dataset.q); qw.classList.remove('open'); applyQuality(true); say('Quality: ' + (eff() === 'sd' ? '480p' : hdLabel())); });
    document.addEventListener('click', function (e) { if (!qw.contains(e.target)) qw.classList.remove('open'); });
    var sr = document.createElement('div'); sr.className = 'np-sr';
    slowBtn = document.createElement('button'); slowBtn.type = 'button'; slowBtn.className = BTN + ' np-sl'; slowBtn.textContent = 'Slow motion'; slowBtn.classList.toggle('on', v.playbackRate < 1);
    slowBtn.onclick = function () { toggleSlow(); };
    var rb = document.createElement('button'); rb.type = 'button'; rb.className = BTN + ' np-rb'; rb.innerHTML = '<i></i><span>REC</span>'; rb.hidden = true;
    sr.append(slowBtn, rb); bar.append(pv, nt, ap, kb, qw, sr); qRender();
    fetch('/api/novinhas/mini?me=1', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.owner) return; mini.owner = true;
      rb.hidden = false; rb.title = 'Record a 30 s miniclip from the current moment (with slow motion if it is on)';
      var lab = rb.querySelector('span'), rt;
      var recQ = null, recT = 0, recN = 0; // grabacion en curso: 30 s de cuenta regresiva; tocar REC de nuevo la cancela
      function recEnd(txt, cls) { clearInterval(recT); recQ = null; rb.classList.remove('busy', 'rec', 'ok'); if (cls) rb.classList.add(cls); lab.textContent = txt; clearTimeout(rt); rt = setTimeout(function () { rb.classList.remove('ok'); lab.textContent = 'REC'; }, 2600); }
      var waitT = 0; // espera a que el miniclip este cortado y subido; apenas existe lo muestra sin recargar
      function waitMini(q) {
        clearInterval(waitT); var tries = 0;
        waitT = setInterval(function () {
          if (++tries > 150) { clearInterval(waitT); return; }
          fetch('/api/novinhas/mini?c=' + encodeURIComponent(q.c) + '&n=12&t=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
            var ok = j && (j.items || []).some(function (it) { return it.c === q.c && +it.id === +q.id && +it.start === +q.start && (it.slow ? 1 : 0) === q.slow; });
            if (ok) { clearInterval(waitT); minisLoad(); say('Miniclip ready'); }
          }).catch(function () {});
        }, 4000);
      }
      rb.onclick = function () {
        if (recQ) { // segundo toque: cancela el miniclip y lo borra
          var q0 = recQ; clearInterval(waitT); rb.classList.add('busy'); lab.textContent = 'Canceling…';
          fetch('/api/novinhas/mini', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', c: q0.c, id: q0.id, start: q0.start, slow: q0.slow }) }).then(function (r) { return r.json(); }).then(function (x) {
            recEnd(x && x.ok ? 'Canceled' : 'Error', x && x.ok ? 'ok' : ''); if (x && x.ok) { say('Miniclip canceled'); minisLoad(); }
          }).catch(function () { recEnd('Error'); });
          return;
        }
        var slow = v.playbackRate < 1; rb.classList.add('busy'); lab.textContent = 'Saving…';
        fetch('/api/novinhas/mini', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c: slug, id: cur.id, t: Math.floor(v.currentTime || 0), slow: slow }) }).then(function (r) { return r.json(); }).then(function (x) {
          rb.classList.remove('busy');
          if (x && x.ok) {
            recQ = { c: slug, id: cur.id, start: x.start, slow: slow ? 1 : 0 }; recN = 30; rb.classList.add('rec'); waitMini(recQ); say('Miniclip saved (' + (slow ? 'slow motion · ' : '') + '30 s from ' + x.start + ' s) · tap REC again to cancel');
            var draw = function () { lab.textContent = recN + ' s · cancel'; rb.title = 'Recording a 30 s miniclip. Tap again to cancel it'; }; draw();
            clearTimeout(rt); clearInterval(recT); recT = setInterval(function () { recN--; if (recN <= 0) { recEnd('Saved · ' + (slow ? 'slow ' : '') + '30 s', 'ok'); } else draw(); }, 1000);
          } else { lab.textContent = 'Error'; clearTimeout(rt); rt = setTimeout(function () { lab.textContent = 'REC'; }, 2600); }
        }).catch(function () { rb.classList.remove('busy'); lab.textContent = 'Error'; clearTimeout(rt); rt = setTimeout(function () { lab.textContent = 'REC'; }, 2600); });
      };
    }).catch(function () {});
    minisLoad(); try { new ResizeObserver(minisLayout).observe(box); } catch (_) { window.addEventListener('resize', minisLayout); } v.addEventListener('loadedmetadata', minisLayout);
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
