/* Cartel "Quieres ser un cazador" (Novinhas). Se muestra DESPUES del cartel +18. Una sola implementacion. */
(function () {
  var END = Date.UTC(2026, 11, 1, 3, 0, 0), START = Date.UTC(2026, 10, 1, 3, 0, 0);
  if (Date.now() >= END || window.__twkHunt) return; window.__twkHunt = 1;
  var LK = 'twk-hunt-lang', XK = 'twk-hunt-x', PK = 'twk-hunt-pending', JK = 'twk-hunt-joined';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  var T = {
    pt: { title: 'Quer ser um caçador?', hl: 'Acesso grátis a todo o conteúdo', spots: 'Apenas 5 a 10 vagas no próximo mês', intro: 'Os acessos vão somente para quem mais doar conteúdo para Novinhas: vídeos e canais em recuperação ainda não publicados.', c1t: 'Caçadores', c1d: 'Você doa conteúdo inédito para Novinhas e disputa uma das vagas.', c2d: 'Quem mais doar por Binance e PayPal também recebe este privilégio, em uma categoria à parte.', chance: 'Esta é a sua chance de conseguir de graça.', chk: 'Quero participar', req: 'Requisito: uma conta registrada para entrarmos em contato se você for escolhido.', close: 'A participação se encerra ao chegar a zero', later: 'Agora não', login: 'Entrar ou criar conta', need: 'Crie sua conta ou entre para confirmar a participação. Depois volte aqui.', ok: 'Participação confirmada. Boa caçada!', err: 'Não foi possível salvar. Tente de novo.', u: ['dias', 'horas', 'min', 'seg'] },
    es: { title: '¿Quieres ser un cazador?', hl: 'Acceso gratis a todo el contenido', spots: 'Solo 5 a 10 lugares el próximo mes', intro: 'Los accesos van solo para quienes más donen contenido para Novinhas: videos y canales en recuperación que todavía no están publicados.', c1t: 'Cazadores', c1d: 'Donas contenido inédito para Novinhas y compites por uno de los lugares.', c2d: 'Los que más donen por Binance y PayPal también reciben este privilegio, en una categoría aparte.', chance: 'Esta es tu chance de conseguirlo gratis.', chk: 'Quiero participar', req: 'Requisito: una cuenta registrada para contactarte si resultas elegido.', close: 'La participación se cierra al llegar a cero', later: 'Ahora no', login: 'Entrar o crear cuenta', need: 'Crea tu cuenta o entra para confirmar tu participación. Después vuelve aquí.', ok: 'Participación confirmada. ¡Buena cacería!', err: 'No se pudo guardar. Inténtalo de nuevo.', u: ['días', 'horas', 'min', 'seg'] },
    en: { title: 'Do you want to be a hunter?', hl: 'Free access to all the content', spots: 'Only 5 to 10 spots next month', intro: 'The passes go only to those who donate the most content to Novinhas: videos and channels in recovery that are not published yet.', c1t: 'Hunters', c1d: 'You donate unreleased content to Novinhas and compete for one of the spots.', c2d: 'Top donors through Binance and PayPal also get this privilege, in a separate category.', chance: 'This is your chance to get it for free.', chk: 'I want to take part', req: 'Requirement: a registered account so we can contact you if you are chosen.', close: 'Entries close when it hits zero', later: 'Not now', login: 'Sign in or create account', need: 'Create your account or sign in to confirm your entry. Then come back here.', ok: 'Entry confirmed. Happy hunting!', err: 'Could not save. Please try again.', u: ['days', 'hours', 'min', 'sec'] }
  };
  var L = ls(LK); if (!T[L]) L = 'pt';
  var root, auth = false, joined = false, tmr;
  var CSS = '#twkh{position:fixed;inset:0;z-index:2147482000;background:rgba(3,2,6,.88);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto;font-family:Inter,system-ui,sans-serif;color:#f4f1e8}' +
    '#twkh *{box-sizing:border-box}#twkh .b{position:relative;width:100%;max-width:660px;margin:auto;border:1px solid #3a2f0a;border-radius:18px;background:radial-gradient(ellipse at top,#2a2006 0%,#0b0b0d 62%);text-align:center;padding:0 24px 26px;box-shadow:0 0 60px rgba(240,185,11,.14)}' +
    '#twkh .top{display:flex;justify-content:space-between;align-items:center;padding:14px 0 0}' +
    '#twkh .x{width:34px;height:34px;border-radius:50%;border:1px solid #6b5514;background:#17140a;color:#f0b90b;font-size:20px;line-height:1;cursor:pointer}' +
    '#twkh .lg{display:inline-flex;gap:3px;padding:3px;border:1.5px solid #f0b90b;border-radius:999px;background:#17140a}' +
    '#twkh .lg button{border:0;background:transparent;color:#f0d27a;font:700 12px Inter,system-ui,sans-serif;padding:5px 11px;border-radius:999px;cursor:pointer;letter-spacing:.05em}' +
    '#twkh .lg button.on{background:linear-gradient(180deg,#ffd75a,#e0a800);color:#1a1100}' +
    '#twkh .bn{display:block;margin:2px auto 6px;height:140px;width:auto}' +
    '#twkh .t1{font-size:15px;color:#cfcabb;margin:0 0 8px}' +
    '#twkh .hl{font:800 clamp(26px,5.4vw,36px)/1.1 Inter,system-ui,sans-serif;color:#f0b90b;margin:0;letter-spacing:-.01em}' +
    '#twkh .pill{display:inline-block;margin:14px 0 12px;background:linear-gradient(180deg,#ffd75a,#e0a800);color:#1a1100;font:800 11px Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:5px 13px;border-radius:999px}' +
    '#twkh .in{font-size:14px;color:#cfcabb;margin:0 auto 18px;max-width:540px;line-height:1.6}' +
    '#twkh .cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;text-align:left;margin:0 0 18px}' +
    '#twkh .c{border-radius:14px;padding:16px}#twkh .c1{border:1px solid #f0b90b;background:#17140a}#twkh .c2{border:1px solid #2b2b30;background:#111113}' +
    '#twkh .ch{display:flex;align-items:center;gap:10px;margin:0 0 8px}' +
    '#twkh .ic{width:34px;height:34px;border-radius:50%;background:#f0b90b;color:#1a1100;display:inline-flex;align-items:center;justify-content:center}' +
    '#twkh .c p{font-size:13px;color:#cfcabb;margin:0;line-height:1.5}#twkh .c2 p{color:#a9a597}' +
    '#twkh .lgs{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#twkh .lgs span{display:inline-flex;align-items:center;justify-content:center;height:34px;border-radius:8px;padding:0 10px}' +
    '#twkh .lgs .bi{background:#0d0d0f;border:1px solid #3a2f0a}#twkh .lgs .pp{background:#fff}#twkh .lgs img{height:26px;width:auto;display:block}' +
    '#twkh .cd{display:flex;gap:6px;justify-content:center;align-items:center;margin:0 0 10px}' +
    '#twkh .u{background:#131316;border:1px solid #3a2f0a;border-radius:10px;padding:9px 6px;min-width:62px}#twkh .u b{display:block;font:500 28px ui-monospace,Consolas,monospace;color:#f0b90b;line-height:1.1}#twkh .u span{font-size:10px;letter-spacing:.12em;color:#a9a597;text-transform:uppercase}' +
    '#twkh .sep{font:26px ui-monospace,monospace;color:#5a4710}' +
    '#twkh .pr{max-width:380px;margin:0 auto 18px}#twkh .pr i{display:block;height:6px;border-radius:999px;background:#26262b;overflow:hidden}#twkh .pr i b{display:block;height:100%;background:linear-gradient(90deg,#ffd75a,#e0a800)}#twkh .pr em{display:block;font:normal 11px Inter,system-ui,sans-serif;letter-spacing:.14em;color:#a9a597;text-transform:uppercase;margin-top:6px}' +
    '#twkh .cb{display:inline-flex;align-items:center;gap:10px;font:600 15px Inter,system-ui,sans-serif;cursor:pointer;border:1px solid #f0b90b;border-radius:10px;padding:12px 20px;background:#17140a;color:#f4f1e8}#twkh .cb input{width:20px;height:20px;accent-color:#f0b90b}' +
    '#twkh .rq{font-size:12px;color:#a9a597;display:flex;align-items:center;justify-content:center;gap:6px;margin:10px 0 0}' +
    '#twkh .msg{margin:12px auto 0;max-width:460px;font-size:13px;line-height:1.5;color:#f0d27a}#twkh .msg.ok{color:#5be08a;font-weight:600}' +
    '#twkh .go{display:inline-block;margin-top:10px;background:linear-gradient(180deg,#ffd75a,#e0a800);color:#1a1100;font:800 13px Inter,system-ui,sans-serif;padding:12px 22px;border-radius:10px;text-decoration:none;letter-spacing:.04em}' +
    '#twkh .lt{display:block;margin:14px auto 0;background:none;border:0;color:#8a867a;font:13px Inter,system-ui,sans-serif;cursor:pointer;text-decoration:underline}';
  var TARGET = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
  var LOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function build() {
    var st = document.createElement('style'); st.id = 'twkhs'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'twkh'; root.className = 'notranslate'; root.setAttribute('translate', 'no'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.innerHTML = '<div class="b"><div class="top"><button type="button" class="x" aria-label="Close">&times;</button><span class="lg"><button type="button" data-l="pt">PT</button><button type="button" data-l="es">ES</button><button type="button" data-l="en">EN</button></span></div>' +
      '<img class="bn" src="/assets/cazador-bunny.png?v=1" alt="">' +
      '<p class="t1" data-i="title"></p><h2 class="hl" data-i="hl"></h2><span class="pill" data-i="spots"></span>' +
      '<p class="in" data-i="intro"></p>' +
      '<div class="cats"><div class="c c1"><div class="ch"><span class="ic">' + TARGET + '</span><b style="font-size:17px;font-weight:800;color:#f0b90b" data-i="c1t"></b></div><p data-i="c1d"></p></div>' +
      '<div class="c c2"><div class="ch lgs"><span class="bi"><img src="/assets/binance-mark.png" alt="Binance"></span><span class="pp"><img src="/assets/paypal-logo.png" alt="PayPal"></span></div><p data-i="c2d"></p></div></div>' +
      '<div class="cd"></div><div class="pr"><i><b></b></i><em data-i="close"></em></div>' +
      '<label class="cb"><input type="checkbox" id="twkh-c"><span data-i="chk"></span></label>' +
      '<p class="rq">' + LOCK + '<span data-i="req"></span></p><div class="msg" id="twkh-m" aria-live="polite"></div>' +
      '<button type="button" class="lt" data-i="later"></button></div>';
    document.body.appendChild(root);
    root.querySelector('.lg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; L = b.dataset.l; ls(LK, L); paint(); });
    root.querySelector('.x').onclick = root.querySelector('.lt').onclick = dismiss;
    root.addEventListener('click', function (e) { if (e.target === root) dismiss(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && root) dismiss(); });
    root.querySelector('#twkh-c').addEventListener('change', onCheck);
    paint(); tick(); tmr = setInterval(tick, 1000);
    if (joined) { root.querySelector('#twkh-c').checked = true; msg('ok'); }
  }
  function msg(k, ok) { var m = root && root.querySelector('#twkh-m'); if (!m) return; m.className = 'msg' + (k === 'ok' ? ' ok' : ''); m.dataset.k = k || ''; m.innerHTML = k ? T[L][k] : ''; if (k === 'need') m.innerHTML += '<br><a class="go" href="/account">' + T[L].login + '</a>'; }
  function paint() {
    var t = T[L]; [].forEach.call(root.querySelectorAll('[data-i]'), function (el) { el.textContent = t[el.dataset.i]; });
    [].forEach.call(root.querySelectorAll('.lg button'), function (b) { b.classList.toggle('on', b.dataset.l === L); });
    var m = root.querySelector('#twkh-m'); if (m && m.dataset.k) msg(m.dataset.k); tick();
  }
  function tick() {
    if (!root) return; var d = Math.max(0, END - Date.now()), s = Math.floor(d / 1000), v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    root.querySelector('.cd').innerHTML = v.map(function (x, i) { return (i ? '<span class="sep">:</span>' : '') + '<div class="u"><b>' + p2(x) + '</b><span>' + T[L].u[i] + '</span></div>'; }).join('');
    root.querySelector('.pr b').style.width = Math.round(Math.min(100, Math.max(0, (Date.now() - START) / (END - START) * 100))) + '%';
  }
  function dismiss() { ls(XK, String(Date.now())); clearInterval(tmr); if (root) { root.remove(); root = null; } var s = document.getElementById('twkhs'); if (s) s.remove(); }
  function join(v) {
    return fetch('/api/novinhas/hunt', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ join: v ? 1 : 0 }) })
      .then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); });
  }
  function onCheck(e) {
    var cb = e.target;
    if (!auth) { cb.checked = false; ls(PK, '1'); msg('need'); return; }
    join(cb.checked).then(function (o) { if (o.j && o.j.ok) { joined = !!o.j.joined; ls(JK, joined ? '1' : null); msg(joined ? 'ok' : ''); } else { cb.checked = !cb.checked; msg('err'); } }).catch(function () { cb.checked = !cb.checked; msg('err'); });
  }
  function afterGate(run) {
    function gone() { return !document.getElementById('twk18'); }
    if (gone()) { run(); return; }
    var mo = new MutationObserver(function () { if (gone()) { mo.disconnect(); setTimeout(run, 350); } });
    mo.observe(document.body, { childList: true });
  }
  function start() {
    fetch('/api/novinhas/hunt', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : { auth: false }; }).catch(function () { return { auth: false }; }).then(function (j) {
      auth = !!j.auth; joined = !!j.joined;
      if (auth && !joined && ls(PK) === '1') { ls(PK, null); join(true).then(function (o) { if (o.j && o.j.ok) { joined = true; ls(JK, '1'); } afterGate(build); }).catch(function () {}); return; }
      if (joined) return;
      var x = +ls(XK) || 0; if (Date.now() - x < 12 * 3600 * 1000) return;
      afterGate(build);
    });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
