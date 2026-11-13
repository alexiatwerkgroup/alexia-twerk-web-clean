/* Twerkhub Help: asistente de ayuda (sobre todo pagos) para toda la plataforma. Respuestas guiadas, sin servidor.
   Se inyecta en todas las paginas desde functions/_middleware.js. Deriva a un agente por Discord/Telegram (24/7). */
(function () {
  if (window.__twkHelp || /^\/(admin|api)\b/.test(location.pathname)) return; window.__twkHelp = true;
  var lang = (function () { try { var l = localStorage.getItem('twk-lang') || navigator.language || 'en'; return /^es/i.test(l) ? 'es' : 'en'; } catch (_) { return 'en'; } })();
  var DISCORD = '/discord', TG = 'https://t.me/+0xNr69raiIlmYWRh';
  var L = {
    en: { name: 'Twerkhub Help', on: 'Online 24/7 · replies in minutes', hi: "Hi! I'm the Twerkhub help assistant. Payments are confirmed almost instantly and our team is available 24/7. What do you need?", ph: 'Type your question...', send: 'Send', tease: 'Need help paying? We are here 24/7',
      q: { pay: 'How do I pay?', fast: 'How fast do I get access?', safe: 'Is it safe to pay?', nocode: 'I paid but have no code', code: 'How do I enter my code?', bin: 'Help with Binance', agent: 'Talk to an agent' },
      a: { pay: 'VIP is <b>$49.99 USD / month</b> and unlocks every video of every VIP channel, including the new ones we keep adding. Pay with <b>PayPal</b>, <b>Binance</b> or <b>credit/debit card</b>. <a href="/paymentmethods/">Open payment methods</a>',
        fast: 'Almost instant. Once you send your receipt on Discord, we activate your access, usually within minutes. Our team is online <b>24/7</b>, including weekends.',
        safe: 'Yes. We never ask for your card number on this site. With Binance you can check our verified name and ID before confirming, PayPal has its own buyer protection, and your access code is personal (it works on up to 4 of your devices). If you have any doubt, ask an agent before paying.',
        nocode: 'No problem. Send your <b>payment receipt</b> and the <b>email you use at Twerkhub</b> on Discord and an agent will activate it right away. 24/7.',
        code: 'Open any locked video (the ones with a padlock), press <b>Unlock with VIP</b>, type your code in "Already have a code?" and press Activate.',
        bin: 'Tap <b>Pay with Binance</b> on the payment page: you will see our verified Binance ID, the exact amount and the networks (Binance Pay, USDT TRC20 or ERC20). Then send the receipt on Discord. <a href="/paymentmethods/">Open payment page</a>',
        agent: 'An agent is available 24/7. Choose where you prefer to talk:', def: 'I could not find that. An agent can answer it right now:' },
      links: [['Discord (fastest)', DISCORD], ['Telegram', TG]] },
    es: { name: 'Ayuda Twerkhub', on: 'En línea 24/7 · respondemos en minutos', hi: '¡Hola! Soy el asistente de ayuda de Twerkhub. Los pagos se confirman casi al instante y nuestro equipo atiende 24/7. ¿Qué necesitás?', ph: 'Escribí tu consulta...', send: 'Enviar', tease: '¿Dudas para pagar? Estamos 24/7',
      q: { pay: '¿Cómo pago?', fast: '¿Qué tan rápido tengo acceso?', safe: '¿Es seguro pagar?', nocode: 'Pagué y no tengo código', code: '¿Cómo ingreso mi código?', bin: 'Ayuda con Binance', agent: 'Hablar con un agente' },
      a: { pay: 'El VIP cuesta <b>$49.99 USD / mes</b> y desbloquea todos los videos de todos los canales VIP, incluidos los nuevos que seguimos agregando. Pagás con <b>PayPal</b>, <b>Binance</b> o <b>tarjeta de crédito/débito</b>. <a href="/paymentmethods/">Ver medios de pago</a>',
        fast: 'Casi al instante. Cuando mandás el comprobante por Discord activamos tu acceso, normalmente en minutos. El equipo está en línea <b>24/7</b>, también fines de semana.',
        safe: 'Sí. Nunca te pedimos el número de tu tarjeta en este sitio. Con Binance podés verificar nuestro nombre e ID antes de confirmar, PayPal tiene su propia protección al comprador, y tu código de acceso es personal (funciona hasta en 4 dispositivos tuyos). Si tenés cualquier duda, consultá a un agente antes de pagar.',
        nocode: 'Tranquilo/a. Mandá tu <b>comprobante de pago</b> y el <b>email que usás en Twerkhub</b> por Discord y un agente lo activa enseguida. 24/7.',
        code: 'Abrí cualquier video bloqueado (los que tienen candado), tocá <b>Unlock with VIP</b>, escribí tu código en "Already have a code?" y tocá Activate.',
        bin: 'Tocá <b>Pagar con Binance</b> en la página de pagos: vas a ver nuestro ID de Binance verificado, el monto exacto y las redes (Binance Pay, USDT TRC20 o ERC20). Después mandá el comprobante por Discord. <a href="/paymentmethods/">Abrir página de pagos</a>',
        agent: 'Hay un agente disponible 24/7. Elegí dónde preferís hablar:', def: 'No encontré eso. Un agente te lo responde ahora mismo:' },
      links: [['Discord (más rápido)', DISCORD], ['Telegram', TG]] }
  }[lang];
  var KW = [['bin', /binance|usdt|crypto|cripto|trc|erc/i], ['nocode', /pagu[eé]|paid|no code|sin c[oó]digo|didn.?t get|no recib|receipt|comprobante/i], ['code', /c[oó]digo|code|activate|activar|unlock|desbloq/i], ['safe', /segur|safe|scam|estafa|confi|trust|legit/i], ['fast', /r[aá]pid|fast|tiempo|how long|cu[aá]nto tarda|instant/i], ['pay', /pag|pay|paypal|tarjeta|card|precio|price|cost|cu[aá]nto|vip|membres/i], ['agent', /agente|agent|humano|human|persona|ayuda|help|soporte|support|contact/i]];
  var css = '.th-b{position:fixed;left:16px;bottom:16px;z-index:9990;display:flex;align-items:center;gap:10px;padding:0 18px 0 14px;height:52px;border:0;border-radius:999px;cursor:pointer;color:#1a1200;background:linear-gradient(180deg,#fff0a8 0%,#f7c83a 45%,#d99a0b 100%);box-shadow:0 4px 0 #8a6205,0 10px 24px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.7);font:800 13px Inter,system-ui,sans-serif;letter-spacing:.02em}.th-b:active{transform:translateY(3px);box-shadow:0 1px 0 #8a6205}.th-b svg{width:24px;height:24px}.th-b i{position:absolute;right:6px;top:6px;width:11px;height:11px;border-radius:50%;background:#2fdc72;border:2px solid #f7c83a}' +
    '.th-t{position:fixed;left:16px;bottom:78px;z-index:9990;max-width:240px;padding:10px 14px;border-radius:14px 14px 14px 4px;background:#14110a;border:1px solid #e8b84a;color:#ffe9a8;font:700 13px/1.4 system-ui;box-shadow:0 8px 24px #000a;cursor:pointer;animation:thIn .3s}@keyframes thIn{from{opacity:0;transform:translateY(8px)}}' +
    '.th-w{position:fixed;left:16px;bottom:80px;z-index:9991;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 110px));display:none;flex-direction:column;border-radius:20px;overflow:hidden;border:1.5px solid #e8b84a;background:#0b0904;box-shadow:0 20px 60px #000c;font-family:Inter,system-ui,sans-serif}.th-w.on{display:flex}' +
    '.th-h{display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(180deg,#2a2208,#14110a);border-bottom:1px solid #e8b84a55}.th-h b{display:block;color:#fff;font-size:15px}.th-h span{display:flex;align-items:center;gap:6px;color:#9dffb4;font:700 11px system-ui}.th-h span:before{content:"";width:8px;height:8px;border-radius:50%;background:#2fdc72;box-shadow:0 0 8px #2fdc72}.th-x{margin-left:auto;width:32px;height:32px;border:0;border-radius:50%;background:#ffffff14;color:#fff;font-size:20px;cursor:pointer}' +
    '.th-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}.th-g,.th-u{max-width:88%;padding:10px 13px;border-radius:14px;font:500 14px/1.5 system-ui}.th-g{align-self:flex-start;background:#1c1810;color:#eee;border-bottom-left-radius:4px}.th-g a{color:#ffd76a;font-weight:800}.th-u{align-self:flex-end;background:linear-gradient(180deg,#ffe08a,#c99a2e);color:#1a1200;font-weight:700;border-bottom-right-radius:4px}' +
    '.th-q{display:flex;flex-wrap:wrap;gap:7px}.th-q button,.th-l a{padding:8px 13px;border-radius:999px;border:1px solid #e8b84a88;background:#16120a;color:#ffe9a8;font:700 12px system-ui;cursor:pointer;text-decoration:none}.th-q button:hover,.th-l a:hover{background:#e8b84a22}.th-l{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.th-l a{background:linear-gradient(180deg,#ffe08a,#c99a2e);color:#1a1200;border-color:#ffe08a}' +
    '.th-f{display:flex;gap:8px;padding:10px;border-top:1px solid #e8b84a33;background:#100d06}.th-f input{flex:1;min-width:0;padding:11px 14px;border-radius:999px;border:1px solid #3a3115;background:#000;color:#fff;font:500 14px system-ui}.th-f button{padding:0 16px;border:0;border-radius:999px;background:linear-gradient(180deg,#ffe08a,#c99a2e);color:#1a1200;font:900 12px system-ui;cursor:pointer}' +
    '@media(max-width:560px){.th-b span{display:none}.th-b{padding:0 14px;height:48px}.th-w{left:8px;bottom:72px;width:calc(100vw - 16px)}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'th-b'; btn.setAttribute('aria-label', L.name);
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/></svg><span>' + (lang === 'es' ? 'Ayuda' : 'Help') + '</span><i></i>';
  var win = document.createElement('div'); win.className = 'th-w'; win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', L.name);
  win.innerHTML = '<div class="th-h"><div><b>' + L.name + '</b><span>' + L.on + '</span></div><button class="th-x" type="button" aria-label="Close">&times;</button></div><div class="th-m"></div><form class="th-f"><input type="text" placeholder="' + L.ph + '" aria-label="' + L.ph + '" autocomplete="off"><button type="submit">' + L.send + '</button></form>';
  var msgs = win.querySelector('.th-m'), started = false, tease;
  function add(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function chips() { var o = msgs.querySelector('.th-q'); if (o) o.remove(); var h = ''; ['pay', 'fast', 'safe', 'nocode', 'code', 'bin', 'agent'].forEach(function (k) { h += '<button type="button" data-k="' + k + '">' + L.q[k] + '</button>'; }); add('th-q', h); }
  function links() { var h = ''; L.links.forEach(function (l) { h += '<a href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + '</a>'; }); add('th-l', h); }
  function answer(k) { add('th-g', L.a[k]); if (k === 'agent') links(); else if (k === 'nocode' || k === 'safe') links(); chips(); }
  function route(t) { for (var i = 0; i < KW.length; i++) if (KW[i][1].test(t)) return KW[i][0]; return null; }
  function openW() { win.classList.add('on'); if (tease) { tease.remove(); tease = null; } try { sessionStorage.setItem('twk_help_t', '1'); } catch (_) {} if (!started) { started = true; add('th-g', L.hi); chips(); } setTimeout(function () { win.querySelector('input').focus({ preventScroll: true }); }, 50); }
  btn.addEventListener('click', function () { win.classList.contains('on') ? win.classList.remove('on') : openW(); });
  win.querySelector('.th-x').addEventListener('click', function () { win.classList.remove('on'); });
  msgs.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; add('th-u', L.q[b.dataset.k]); setTimeout(function () { answer(b.dataset.k); }, 250); });
  win.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var i = win.querySelector('input'), t = i.value.trim(); if (!t) return; i.value = ''; var d = document.createElement('div'); d.className = 'th-u'; d.textContent = t; msgs.appendChild(d); var k = route(t); setTimeout(function () { if (k) answer(k); else { add('th-g', L.a.def); links(); chips(); } }, 300); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') win.classList.remove('on'); });
  window.TWK_HELP = { open: openW };
  function mount() {
    document.body.appendChild(btn); document.body.appendChild(win);
    var seen = false; try { seen = sessionStorage.getItem('twk_help_t') === '1'; } catch (_) {}
    var pay = /paymentmethods|tokens|membership/.test(location.pathname);
    if (!seen) setTimeout(function () { if (win.classList.contains('on')) return; tease = document.createElement('div'); tease.className = 'th-t'; tease.textContent = L.tease; tease.onclick = openW; document.body.appendChild(tease); try { sessionStorage.setItem('twk_help_t', '1'); } catch (_) {} setTimeout(function () { if (tease) { tease.remove(); tease = null; } }, 9000); }, pay ? 3000 : 12000);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
