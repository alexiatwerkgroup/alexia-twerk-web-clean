/* Novinhas: contador "20/X" en la portada del canal + popup VIP (precio, medios de pago, Discord y campo de palabra clave).
   Uso: <script src="/assets/novinhas-channel-quota.js" data-total="89" data-shown="20" data-target=".banner" defer></script>
   Si total <= shown no muestra nada. Expone window.TWK_NQ.open() para abrir el popup desde otros elementos (candados). */
(function () {
  var s = document.currentScript; if (!s) return;
  var total = parseInt(s.dataset.total, 10), shown = parseInt(s.dataset.shown, 10) || 20;
  if (!(total > shown)) return;
  var href = s.dataset.href || '/paymentmethods/', price = s.dataset.price || '49.99';
  (function(){if(!document.querySelector('link[href*="twk-ui.css"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='/assets/twk-ui.css?v=1';document.head.appendChild(l);}})();
  var css = '.nq-b{margin-top:14px}.nq-p .nq-btn{margin-top:16px}.nq-b i{font-style:normal;color:#fff;font-weight:600;font-size:12px;opacity:.8}' +
    '.nq-o{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.78);padding:16px;overflow:auto}.nq-p{width:min(320px,100%);padding:26px 22px;border-radius:18px;border:1.5px solid #e8b84a;background:linear-gradient(180deg,#2a2208,#0d0b04);text-align:center;color:#ddd;box-shadow:0 0 60px #e8b84a55;font-family:system-ui,sans-serif}' +
    '.nq-p small{color:#e8b84a;font:800 11px system-ui;letter-spacing:.14em}.nq-p b{display:block;font:900 44px system-ui;color:#ffd76a;margin:6px 0 2px}.nq-p p{margin:0 0 6px;font:600 14px/1.5 system-ui}' +
    '.nq-bar{height:8px;border-radius:8px;background:#2b2410;margin:14px 0 4px;overflow:hidden}.nq-bar div{height:100%;background:linear-gradient(90deg,#b8862a,#ffd76a)}' +
    '.nq-price{margin:14px 0 4px;font:900 30px system-ui;color:#fff}.nq-price small{font:700 12px system-ui;color:#e8b84a;letter-spacing:.1em;margin-right:6px}.nq-pay{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:8px 0 2px}.nq-pay span{padding:5px 11px;border-radius:999px;border:1px solid #e8b84a66;background:#00000066;color:#f1dfa6;font:700 11px system-ui;letter-spacing:.05em}.nq-note{margin:8px 0 0;font:600 11px/1.4 system-ui;color:#aaa}' +
    '.nq-code{margin-top:18px;padding-top:14px;border-top:1px solid #e8b84a33}.nq-code label{display:block;font:700 12px system-ui;color:#f1dfa6;margin-bottom:8px}.nq-row{display:flex;gap:6px}.nq-row input{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid #e8b84a66;background:#000a;color:#fff;font:600 14px system-ui}.nq-msg{min-height:16px;margin-top:6px;font:700 12px system-ui;color:#ff8a8a}' +
    '.nq-p .nq-grow{margin:12px 0 0;padding:9px 11px;border-radius:10px;border:1px dashed #e8b84a88;background:#e8b84a14;color:#ffe9a8;font:700 12px/1.45 system-ui}.nq-grow:first-letter{color:#5dff8a}' +
    '.nq-pay span{display:inline-flex;align-items:center;height:34px}.nq-pay .nq-cd{padding:0 8px}.nq-pay .nq-pp{background:#fff;padding:0 12px}.nq-pay img{display:block;width:auto}.nq-x{margin-top:8px;color:#999;font:600 12px system-ui;cursor:pointer;background:none;border:0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function open(force) {
    if (document.querySelector('.nq-o')) return;
    var o = document.createElement('div'); o.className = 'nq-o'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="nq-p"><small>VIP ACCESS</small><b>' + total + ' videos</b><p>This folder has ' + total + ' videos.<br>You\'re seeing the first ' + shown + '.</p>' +
      '<div class="nq-bar"><div style="width:' + Math.round(shown / total * 100) + '%"></div></div><p style="font-size:12px;color:#aaa">' + shown + ' of ' + total + ' unlocked</p>' +
      '<p class="nq-grow">&#9679; Always growing: we keep searching, and every new video we find of her is added to this channel. VIP members get them all, automatically.</p>' +
      '<div class="nq-price"><small>USD</small>' + price + '<span style="font:700 13px system-ui;color:#e8b84a;margin-left:6px">/ month</span></div><div class="nq-pay"><span class="nq-pp"><img src="/assets/paypal-logo.png" alt="PayPal" height="16"></span><span class="nq-bn"><img src="/assets/binance-mark.png" alt="Binance" height="26"></span><span class="nq-cd"><img src="/assets/cards-logo.png" alt="Visa, Mastercard, Discover" height="20"></span></div>' +
      '<a class="twk-btn twk-btn--block nq-btn" href="' + href + '" >GET VIP ACCESS</a><p class="nq-note">Pay with PayPal, Binance or card. Your access code is sent to you on Discord or by email. One code per person: it works on up to 4 of your devices. If it is shared, it is blocked and cancelled.</p>' +
      '<form class="nq-code"><label for="nq-in">Already have a code?</label><div class="nq-row"><input id="nq-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Your access code"><button type="submit" class="twk-btn twk-btn--sm">ACTIVATE</button></div><div class="nq-msg" role="status"></div></form>' +
      '<button type="button" class="nq-x">Maybe later</button></div>';
    o.addEventListener('click', function (e) { if (e.target === o || e.target.className === 'nq-x') o.remove(); });
    o.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); var inp = o.querySelector('#nq-in'), msg = o.querySelector('.nq-msg'); if (!inp.value.trim()) return;
      msg.style.color = '#f1dfa6'; msg.textContent = 'Checking...';
      fetch('/api/novinhas/activate', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: inp.value }) })
        .then(function (r) { if (r.ok) { msg.textContent = 'Unlocked. Loading...'; location.reload(); } else { msg.style.color = '#ff8a8a'; msg.textContent = r.status === 403 ? 'Device limit reached or code cancelled. Contact us on Discord.' : 'Invalid code.'; } })
        .catch(function () { msg.style.color = '#ff8a8a'; msg.textContent = 'Connection error. Try again.'; });
    });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { o.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(o);
  }
  // Gancho de registro (variante B): invitados ven esto al tocar un video bloqueado; con cuenta, el popup VIP.
  var GT = {
    en: { h: 'This video is for members', p: 'Sign up free: watch the first ' + shown + ' videos of every channel and start counting toward the USD 5,000 content prize.', b: 'Unlock for free', t: '+200 tokens after you verify your email', v: 'Get VIP access instead', l: 'I already have an account' },
    pt: { h: 'Este vídeo é para membros', p: 'Cadastre-se grátis: veja os primeiros ' + shown + ' vídeos de cada canal e comece a concorrer ao prêmio de USD 5.000 em conteúdo.', b: 'Desbloquear grátis', t: '+200 tokens após verificar seu e-mail', v: 'Quero o acesso VIP', l: 'Já tenho conta' },
    es: { h: 'Este video es para miembros', p: 'Registrate gratis: mirá los primeros ' + shown + ' videos de cada canal y empezá a sumar para el premio de USD 5.000 en contenido.', b: 'Desbloquear gratis', t: '+200 tokens al verificar tu email', v: 'Quiero el acceso VIP', l: 'Ya tengo cuenta' }
  };
  var gcss = document.createElement('style');
  gcss.textContent = '.ng-p{width:min(340px,100%);padding:22px;border-radius:18px;border:1.5px solid #e8b84a;background:#0d0b04;color:#f1dfa6;font-family:system-ui,sans-serif;text-align:center;box-shadow:0 0 60px #e8b84a44;position:relative}.ng-lg{display:flex;gap:4px;justify-content:center;margin-bottom:14px}.ng-lg button{background:none;border:1px solid #3a3115;color:#a99b72;border-radius:6px;font:700 11px system-ui;padding:3px 8px;cursor:pointer}.ng-lg button.on{background:#e8b84a;color:#1a1100;border-color:#e8b84a}.ng-k{height:72px;border-radius:10px;background:#1a1508;border:1px solid #3a3115;display:grid;place-items:center;margin-bottom:12px}.ng-k svg{width:30px;height:30px;fill:none;stroke:#e8b84a;stroke-width:2}.ng-p h3{margin:0 0 6px;font:600 17px system-ui;color:#fff}.ng-p p{margin:0;font:500 13px/1.5 system-ui;color:#cbbd94}.ng-b{display:block;margin-top:14px;padding:11px;border-radius:10px;background:linear-gradient(180deg,#ffe27a,#f0b90b 55%,#c98f00);color:#1a1100;font:700 14px system-ui;text-decoration:none;cursor:pointer;border:0;width:100%}.ng-t{margin-top:8px;font:500 12px system-ui;color:#a99b72}.ng-s{display:flex;justify-content:space-between;margin-top:12px;font:600 12px system-ui}.ng-s a{color:#e8b84a;cursor:pointer;text-decoration:underline}';
  document.head.appendChild(gcss);
  function lang() { try { var l = localStorage.getItem('twk_nq_lang'); if (GT[l]) return l; } catch (_) {} return 'en'; }
  function guestOpen() {
    if (document.querySelector('.nq-o')) return;
    var o = document.createElement('div'); o.className = 'nq-o'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    function signup() { try { if (window.TwerkhubAuth && TwerkhubAuth.showForm) { o.remove(); TwerkhubAuth.showForm('signup'); return; } } catch (_) {} location.href = '/account?utm_source=locked_video'; }
    function login() { try { if (window.TwerkhubAuth && TwerkhubAuth.showForm) { o.remove(); TwerkhubAuth.showForm('login'); return; } } catch (_) {} location.href = '/account'; }
    function draw(l) {
      try { localStorage.setItem('twk_nq_lang', l); } catch (_) {}
      var t = GT[l];
      o.innerHTML = '<div class="ng-p"><div class="ng-lg">' + ['en', 'pt', 'es'].map(function (k) { return '<button type="button" data-l="' + k + '" class="' + (k === l ? 'on' : '') + '">' + k.toUpperCase() + '</button>'; }).join('') + '</div>' +
        '<div class="ng-k"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>' +
        '<h3>' + t.h + '</h3><p>' + t.p + '</p><button type="button" class="ng-b" data-a="s">' + t.b + '</button><div class="ng-t">' + t.t + '</div>' +
        '<div class="ng-s"><a data-a="v">' + t.v + '</a><a data-a="l">' + t.l + '</a></div></div>';
    }
    draw(lang());
    o.addEventListener('click', function (e) {
      var g = e.target.closest('[data-l]'); if (g) { draw(g.dataset.l); return; }
      var a = e.target.closest('[data-a]');
      if (a) { if (a.dataset.a === 's') signup(); else if (a.dataset.a === 'l') login(); else { o.remove(); open(true); } return; }
      if (e.target === o) o.remove();
    });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { o.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(o);
    try { if (window.twkTrack) window.twkTrack('locked_signup_prompt'); } catch (_) {}
  }
  function gate() {
    var logged = false; try { logged = !!(window.TwerkhubAuth && TwerkhubAuth.isLoggedIn && TwerkhubAuth.isLoggedIn()); } catch (_) {}
    if (logged) open(); else guestOpen();
  }
  window.TWK_NQ = { open: gate };
  function mount() {
    var host = document.querySelector(s.dataset.target || '.banner'); if (!host || host.querySelector('.nq-b')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'nq-b twk-btn twk-btn--sm';
    b.innerHTML = shown + '/' + total + ' <i>videos shown · tap</i>'; host.appendChild(b); b.addEventListener('click', gate);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
