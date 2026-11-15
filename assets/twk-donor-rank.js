/* Panel sticky "Escalera de donadores" (novinhas). Datos reales desde /api/novinhas/donors. Se puede cerrar y queda una pastilla para reabrir. */
(function () {
  if (window.__twkDon) return; window.__twkDon = 1;
  var LK = 'twk-hunt-lang', CK = 'twk-don-closed';
  function ls(k, v) { try { var S = k === CK ? sessionStorage : localStorage; if (v === undefined) return S.getItem(k); S.setItem(k, v); } catch (e) {} return null; }
  try { localStorage.removeItem('twk-don-closed'); } catch (e) {}
  var T = {
    pt: { pr: 'EM CONTEÚDO EXCLUSIVO', pb: '+ benefícios únicos para toda a vida', ti: 'Escada de doadores', su: 'Escolha seu degrau. Vagas limitadas.', one: 'livre', many: 'livres', pz: 'Prêmio garantido', ql: 'Classificando', em: 'Vazio', ld: 'Líder', an: 'Anônimo', d: 'Doar', inc: 'Aumentar minha doação', hid: 'Seu nome fica oculto', pill: 'Ranking de doadores', x: 'Minimizar', first: 'Ainda ninguém. Seja o primeiro.', pl: 'seu lugar' },
    es: { pr: 'EN CONTENIDO EXCLUSIVO', pb: '+ beneficios únicos de por vida', ti: 'Escalera de donadores', su: 'Elige tu escalón. Cupos limitados.', one: 'libre', many: 'libres', pz: 'Premio asegurado', ql: 'Clasificando', em: 'Vacío', ld: 'Líder', an: 'Anónimo', d: 'Donar', inc: 'Aumentar mi donación', hid: 'Tu nombre queda oculto', pill: 'Ranking de donadores', x: 'Minimizar', first: 'Todavía nadie. Sé el primero.', pl: 'tu lugar' },
    en: { pr: 'IN EXCLUSIVE CONTENT', pb: '+ unique lifetime perks', ti: 'Donor ladder', su: 'Pick your step. Limited spots.', one: 'free', many: 'free', pz: 'Prize secured', ql: 'Qualifying', em: 'Empty', ld: 'Leader', an: 'Anonymous', d: 'Donate', inc: 'Increase my donation', hid: 'Your name stays hidden', pill: 'Donor ranking', x: 'Minimize', first: 'Nobody yet. Be the first.', pl: 'your spot' }
  };
  var L = ls(LK); if (!T[L]) L = 'pt';
  var data = { items: [], tiers: { 1000: { cap: 1, used: 0 }, 500: { cap: 5, used: 0 }, 100: { cap: 7, used: 0 } } };
  var st = document.createElement('style');
  st.textContent = '#twd{position:fixed;right:14px;bottom:14px;z-index:2147483000;font:500 12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#f1dfa6}#twd *{box-sizing:border-box}' +
    '#twd .pn{width:330px;max-width:calc(100vw - 20px);max-height:calc(100vh - 28px);overflow:auto;background:#0a0905;border:1px solid #3a3115;border-radius:18px;padding:14px;display:none;flex-direction:column;gap:7px;box-shadow:0 10px 40px rgba(0,0,0,.6)}#twd.on .pn{display:flex}#twd.on .pl,body:has(#twkh) #twd .pl,body:has(#twkh) #twd:not(.mid) .pn{display:none}#twd.mid{right:50%;bottom:auto;top:50%;transform:translate(50%,-50%)}#twd.mid:before{content:"";position:fixed;inset:0;background:rgba(3,2,6,.6);z-index:-1}' +
    '#twd .tp{display:flex;align-items:flex-start;gap:8px}#twd h3{margin:0;font:600 16px system-ui;color:#fff;flex:1}#twd .su{margin:0;color:#a99b72;font-size:11px}' +
    '#twd .lg{display:flex;gap:2px}#twd .lg button,#twd .xx{background:none;border:1px solid #3a3115;color:#a99b72;border-radius:6px;font:600 10px system-ui;padding:3px 6px;cursor:pointer}#twd .lg button.on{background:#e8b84a;color:#1a1100;border-color:#e8b84a}#twd .xx{font-size:15px;line-height:1;padding:1px 7px}' +
    '#twd .tr{border:1px dashed #3a3115;border-radius:12px;padding:7px 9px;display:flex;align-items:center;gap:9px}#twd .tr b{color:#e8b84a;font:600 14px system-ui;width:74px;white-space:nowrap;flex:none}#twd .pp{display:flex;gap:4px;flex:1;flex-wrap:nowrap}#twd .pp i{width:15px;height:15px;border-radius:50%;border:1.5px solid #e8b84a;flex:none}#twd .pp i.f{background:#e8b84a}#twd .tr span{font-size:11px;color:#a99b72;text-align:right;min-width:52px;white-space:nowrap}' +
    '#twd .rw{display:flex;align-items:center;gap:7px;padding:4px 8px;border:1px solid #3a3115;border-radius:10px;background:#14110a}#twd .rw.g{border-color:#e8b84a;background:#2a2208}#twd .rw.e{border-style:dashed;background:none;color:#a99b72}' +
    '#twd .n{width:15px;text-align:center;color:#a99b72;font-size:11px}#twd .av{width:22px;height:22px;border-radius:50%;border:1px solid #3a3115;display:flex;align-items:center;justify-content:center;flex:none}#twd .av svg{width:13px;height:13px;fill:#e8b84a}#twd .nm{flex:1}#twd .am{font-weight:600;color:#e8b84a}' +
    '#twd .ct{display:flex;align-items:center;gap:6px;font-size:11px;color:#e8b84a;margin:1px 0}#twd .ct:before,#twd .ct:after{content:"";flex:1;border-top:1px dashed #e8b84a}' +
    '#twd .b1,#twd .b2{display:flex;align-items:center;justify-content:center;height:42px;border-radius:10px;font:600 14px system-ui;text-decoration:none;cursor:pointer}#twd .b1{background:linear-gradient(180deg,#ffe27a,#f0b90b 55%,#c98f00);color:#1a1100;margin-top:3px;box-shadow:0 4px 16px rgba(232,184,74,.28)}#twd .b2{border:1.5px solid #e8b84a;color:#ffe9a8;height:38px;font-size:13px}#twd .b1:hover{filter:brightness(1.1)}' +
    '#twd .pz{position:relative;display:flex;align-items:center;gap:12px;margin:8px 0 2px;padding:20px 14px 12px;border-radius:16px;background:linear-gradient(120deg,#3a0905,#120403);border:1.5px solid #ff4a2a;box-shadow:0 0 26px rgba(255,60,30,.4),inset 0 0 30px rgba(255,40,10,.15)}#twd .pz .rb{position:absolute;top:-10px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:4px 14px;border-radius:99px;background:linear-gradient(90deg,#ff2a1f,#ff6a1a);font:900 10.5px/1 system-ui;letter-spacing:.18em;color:#fff;box-shadow:0 0 16px rgba(255,50,20,.8)}#twd .pz .tr3{width:56px;height:56px;flex:none;filter:drop-shadow(0 0 10px rgba(255,200,60,.7))}' +
    '#twd .pz .big{font:400 34px/1.05 Anton,Impact,system-ui;color:#fff;white-space:nowrap;text-shadow:0 0 6px #ff3b1f,0 0 18px #ff2a1f}#twd .pz .sb{font:700 11.5px/1.25 system-ui;color:#ffd9c9;margin-top:3px}' +
    '#twd .hd{text-align:center;color:#a99b72;font-size:11px}#twd .fs{text-align:center;color:#a99b72;font-size:11px}' +
    '#twd .pl{display:flex;align-items:center;gap:8px;background:#0a0905;border:1.5px solid #e8b84a;color:#ffe9a8;border-radius:999px;height:40px;padding:0 16px;font:600 13px system-ui;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.55)}' +
    '@media(max-width:520px){#twd{right:8px;bottom:8px;left:8px}#twd .pn{width:100%}#twd .pl{margin-left:auto}}';
  document.head.appendChild(st);
  var U = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>';
  var root = document.createElement('div'); root.id = 'twd'; document.body.appendChild(root);
  function money(n) { n = Math.round(n * 100) / 100; return 'U$D ' + n.toLocaleString(L === 'en' ? 'en-US' : L === 'es' ? 'es-AR' : 'pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2, useGrouping: true }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, ''); }
  function go(amt) { return '/paymentmethods/?item=donate' + (amt ? '&amt=' + amt : ''); }
  function render() {
    var o = T[L], it = data.items, top = it.length ? it[0].amt : 0, h = '';
    h += '<div class="pn" role="dialog" aria-label="' + o.ti + '"><div class="tp"><h3>' + o.ti + '</h3><span class="lg">' + ['pt', 'es', 'en'].map(function (l) { return '<button type="button" data-l="' + l + '"' + (l === L ? ' class="on"' : '') + '>' + l.toUpperCase() + '</button>'; }).join('') + '</span><button type="button" class="xx" aria-label="' + o.x + '" title="' + o.x + '">&#8211;</button></div><p class="su">' + o.su + '</p>' + '<div class="pz"><span class="rb">' + o.pr + '</span><svg viewBox="0 0 64 64" class="tr3" aria-hidden="true"><defs><linearGradient id="twdtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#c98f00"/></linearGradient></defs><path d="M18 8H46V26C46 36 40 42 32 42S18 36 18 26Z" fill="url(#twdtg)"/><path d="M18 12H8C8 22 12 28 20 30M46 12H56C56 22 52 28 44 30" fill="none" stroke="#e8b84a" stroke-width="3"/><rect x="29" y="42" width="6" height="8" fill="#c98f00"/><rect x="20" y="50" width="24" height="6" rx="2" fill="url(#twdtg)"/></svg><div class="tx"><div class="big">' + money(5000) + '</div><div class="sb">' + o.pb + '</div></div></div>';
    [1000, 500, 100].forEach(function (k) { var t = data.tiers[k], free = t.cap - t.used, p = ''; for (var i = 0; i < t.cap; i++) p += '<i' + (i < t.used ? ' class="f"' : '') + '></i>'; h += '<div class="tr"><b>' + money(k).replace('U$D ', 'U$D ') + '</b><div class="pp">' + p + '</div><span>' + free + ' ' + (free === 1 ? o.one : o.many) + '</span></div>'; });
    h += '<div class="ct">' + o.pz + '</div>';
    for (var i = 0; i < 10; i++) {
      var r = it[i];
      h += r ? '<div class="rw' + (i === 0 ? ' g' : '') + '"><span class="n">' + (i + 1) + '</span><span class="av">' + U + '</span><span class="nm">' + (i === 0 ? o.ld : o.an) + ' ' + esc(r.n) + '</span><span class="am">' + money(r.amt) + '</span></div>'
             : '<div class="rw e"><span class="n">' + (i + 1) + '</span><span class="av">' + U + '</span><span class="nm">' + o.em + ' · ' + o.pl + '</span></div>';
      if (i === 4) h += '<div class="ct">' + o.ql + '</div>';
    }
    if (!it.length) h += '<div class="fs">' + o.first + '</div>';
    h += '<a class="b1" href="' + go() + '">' + o.d + '</a><a class="b2" href="' + go(top ? Math.floor(top) + 1 : 0) + '">' + o.inc + '</a><div class="hd">' + o.hid + '</div></div>';
    h += '<button type="button" class="pl">' + o.pill + '</button>';
    root.innerHTML = h;
    root.querySelector('.xx').onclick = function () { root.classList.remove('on', 'mid'); ls(CK, '1'); };
    root.querySelector('.pl').onclick = function () { root.classList.add('on'); ls(CK, '0'); };
    [].forEach.call(root.querySelectorAll('.lg button'), function (b) { b.onclick = function () { L = b.dataset.l; ls(LK, L); render(); root.classList.add('on'); }; });
  }
  function load() { fetch('/api/novinhas/donors', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.items) { var on = root.classList.contains('on'); data = j; render(); if (on) root.classList.add('on'); } }).catch(function () {}); }
  window.TWK_DON = { open: function (mid) { root.classList.add('on'); if (mid) root.classList.add('mid'); } };
  render(); if (ls(CK) !== '1' && window.innerWidth > 520) root.classList.add('on');
  if (/[?&]donpreview=1(&|$)/.test(location.search)) { /* vista previa del dueño con montos de EJEMPLO (no se guardan ni los ve nadie sin este enlace) */
    data = { items: [50, 42, 35, 30, 25, 20, 15].map(function (a, i) { return { n: ['7F3A', 'C21B', '9D40', 'A8E6', '3B7C', 'E15F', '60D2'][i], amt: a }; }), tiers: { 1000: { cap: 1, used: 0 }, 500: { cap: 5, used: 0 }, 100: { cap: 7, used: 0 } } };
    render(); root.classList.add('on'); return;
  }
  load(); setInterval(load, 5 * 60 * 1000);
})();
