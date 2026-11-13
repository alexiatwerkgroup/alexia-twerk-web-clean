/* Twerkhub Help: asistente de ayuda (sobre todo pagos) para toda la plataforma. Respuestas guiadas, sin servidor.
   Se inyecta en todas las paginas desde functions/_middleware.js. Deriva a un agente por Discord/Telegram (24/7). */
(function () {
  if (window.__twkHelp || /^\/(admin|api)\b/.test(location.pathname)) return; window.__twkHelp = true;
  var lang = (function () { try { var l = localStorage.getItem('twk-lang') || navigator.language || 'en'; return /^es/i.test(l) ? 'es' : /^pt/i.test(l) ? 'pt' : 'en'; } catch (_) { return 'en'; } })();
  var MAIL = 'twerkhub.lat@gmail.com', DISCORD = '/discord', TG = 'https://t.me/+0xNr69raiIlmYWRh';
  var L = {
    en: { name: 'Twerkhub Help', on: 'Online 24/7 · replies in minutes', hi: "Hi! I'm the Twerkhub help assistant. Payments are confirmed almost instantly and our team is available 24/7. What do you need?", ph: 'Type your question...', send: 'Send', tease: 'Need help paying? We are here 24/7',
      q: { pay: 'How do I pay?', fast: 'How fast do I get access?', safe: 'Is it safe to pay?', nocode: 'I paid but have no code', code: 'How do I enter my code?', bin: 'Help with Binance', agent: 'Talk to an agent' },
      ag: { conn: "Connecting you with an agent. Write your message below and the reply will appear right here.", wait: 'Waiting for an agent', away: 'Our team is resting right now (3:00-9:00 AM Argentina time). Your message is saved and we will answer as soon as we are back, around {b} your time. Payments sent now are activated first thing when we return. You can also send your receipt by email or Discord.', awayStat: 'Away \u00b7 back around {b}', eta0: 'Estimated wait: about 1-3 min. While you wait, you can also send your receipt by email or Discord.', next: 'You are next. Estimated wait: about {t}. You can close this window: the answer will be saved here.', q1: 'You are in the queue: {n} before you. Estimated wait: about {t}. You can close this window: the answer will be saved here.', min: 'min', open: 'Agent connected', closed: 'Chat closed', ph2: 'Write to the agent...', still: 'Still waiting? You can also reach us on Discord or Telegram.', new: 'Start a new chat', agent: 'Agent', mail: 'Your email (optional, in case you close this window)', err: 'Could not send. Check your connection and try again.', many: 'Too many chats from your connection. Please use Discord.', back: 'Back to assistant' },
      a: { pay: '<b>Novinhas VIP</b> is <b>$49.99 USD / month</b> and unlocks every video of every Novinhas channel, including the new ones we keep adding. You can also buy <b>coins</b> (from $10) for the model pages, or make a <b>donation</b>. Pay with <b>PayPal</b>, <b>Binance</b> or <b>credit/debit card</b>. <a href="/paymentmethods/">Open payment methods</a>',
        fast: 'Almost instant. Once you send your receipt on Discord or by email (' + MAIL + '), we activate your access, usually within minutes. Our team is online <b>24/7</b>, including weekends.',
        safe: 'Yes. We never ask for your card number on this site. With Binance you can check our verified name and ID before confirming, PayPal has its own buyer protection, and your access code is personal (it works on up to 4 of your devices). If you have any doubt, ask an agent before paying.',
        nocode: 'No problem. Send your <b>payment receipt</b> and the <b>email you use at Twerkhub</b> on Discord or by email (' + MAIL + ') and an agent will activate it right away. 24/7.',
        code: 'Open any locked video (the ones with a padlock), press <b>Unlock with VIP</b>, type your code in "Already have a code?" and press Activate.',
        bin: 'Tap <b>Pay with Binance</b> on the payment page: you will see our verified Binance ID, the exact amount and the networks (Binance Pay, USDT TRC20 or ERC20). Then send the receipt on Discord or by email (' + MAIL + '). <a href="/paymentmethods/">Open payment page</a>',
        agent: 'An agent is available 24/7. Choose where you prefer to talk:', def: 'I could not find that. An agent can answer it right now:' },
      links: [['Discord (fastest)', DISCORD], ['Email', 'mailto:' + MAIL], ['Telegram', TG]] },
    es: { name: 'Ayuda Twerkhub', on: 'En línea 24/7 · respondemos en minutos', hi: '¡Hola! Soy el asistente de ayuda de Twerkhub. Los pagos se confirman casi al instante y nuestro equipo atiende 24/7. ¿Qué necesitás?', ph: 'Escribí tu consulta...', send: 'Enviar', tease: '¿Dudas para pagar? Estamos 24/7',
      q: { pay: '¿Cómo pago?', fast: '¿Qué tan rápido tengo acceso?', safe: '¿Es seguro pagar?', nocode: 'Pagué y no tengo código', code: '¿Cómo ingreso mi código?', bin: 'Ayuda con Binance', agent: 'Hablar con un agente' },
      ag: { conn: 'Te conecto con un agente. Escribí tu mensaje abajo y la respuesta aparece acá mismo.', wait: 'Esperando a un agente', away: 'Nuestro equipo está descansando ahora (de 3:00 a 9:00 hora Argentina). Tu mensaje queda guardado y respondemos apenas volvemos, alrededor de las {b} de tu hora. Los pagos enviados ahora se activan apenas volvemos. También podés mandar tu comprobante por email o Discord.', awayStat: 'Ausente \u00b7 volvemos ~{b}', eta0: 'Espera estimada: unos 1-3 min. Mientras esperás, también podés mandar tu comprobante por email o Discord.', next: 'Sos el siguiente. Espera estimada: unos {t}. Podés cerrar esta ventana: la respuesta queda guardada acá.', q1: 'Estás en la fila: hay {n} antes que vos. Espera estimada: unos {t}. Podés cerrar esta ventana: la respuesta queda guardada acá.', min: 'min', open: 'Agente conectado', closed: 'Chat cerrado', ph2: 'Escribile al agente...', still: '¿Seguís esperando? También podés escribirnos por Discord o Telegram.', new: 'Iniciar un chat nuevo', agent: 'Agente', mail: 'Tu email (opcional, por si cerrás esta ventana)', err: 'No se pudo enviar. Revisá tu conexión y probá de nuevo.', many: 'Demasiados chats desde tu conexión. Usá Discord, por favor.', back: 'Volver al asistente' },
      a: { pay: 'El <b>VIP de Novinhas</b> cuesta <b>$49.99 USD / mes</b> y desbloquea todos los videos de todos los canales Novinhas, incluidos los nuevos que seguimos agregando. También podés comprar <b>monedas</b> (desde $10) para las páginas de modelos, o hacer una <b>donación</b>. Pagás con <b>PayPal</b>, <b>Binance</b> o <b>tarjeta de crédito/débito</b>. <a href="/paymentmethods/">Ver medios de pago</a>',
        fast: 'Casi al instante. Cuando mandás el comprobante por Discord o por email (' + MAIL + ') activamos tu acceso, normalmente en minutos. El equipo está en línea <b>24/7</b>, también fines de semana.',
        safe: 'Sí. Nunca te pedimos el número de tu tarjeta en este sitio. Con Binance podés verificar nuestro nombre e ID antes de confirmar, PayPal tiene su propia protección al comprador, y tu código de acceso es personal (funciona hasta en 4 dispositivos tuyos). Si tenés cualquier duda, consultá a un agente antes de pagar.',
        nocode: 'Tranquilo/a. Mandá tu <b>comprobante de pago</b> y el <b>email que usás en Twerkhub</b> por Discord o por email (' + MAIL + ') y un agente lo activa enseguida. 24/7.',
        code: 'Abrí cualquier video bloqueado (los que tienen candado), tocá <b>Unlock with VIP</b>, escribí tu código en "Already have a code?" y tocá Activate.',
        bin: 'Tocá <b>Pagar con Binance</b> en la página de pagos: vas a ver nuestro ID de Binance verificado, el monto exacto y las redes (Binance Pay, USDT TRC20 o ERC20). Después mandá el comprobante por Discord o por email (' + MAIL + '). <a href="/paymentmethods/">Abrir página de pagos</a>',
        agent: 'Hay un agente disponible 24/7. Elegí dónde preferís hablar:', def: 'No encontré eso. Un agente te lo responde ahora mismo:' },
      links: [['Discord (más rápido)', DISCORD], ['Email', 'mailto:' + MAIL], ['Telegram', TG]] },
    pt: { name: 'Ajuda Twerkhub', on: 'Online 24/7 \u00b7 respondemos em minutos', hi: 'Oi! Sou o assistente de ajuda da Twerkhub. Os pagamentos s\u00e3o confirmados quase na hora e nossa equipe atende 24/7. Do que voc\u00ea precisa?', ph: 'Escreva sua d\u00favida...', send: 'Enviar', tease: 'D\u00favidas para pagar? Estamos 24/7',
      q: { pay: 'Como eu pago?', fast: 'Em quanto tempo recebo o acesso?', safe: '\u00c9 seguro pagar?', nocode: 'Paguei e n\u00e3o tenho c\u00f3digo', code: 'Como coloco meu c\u00f3digo?', bin: 'Ajuda com a Binance', agent: 'Falar com um atendente' },
      ag: { conn: 'Estou te conectando com um atendente. Escreva sua mensagem abaixo e a resposta aparece aqui mesmo.', wait: 'Aguardando um atendente', away: 'Nossa equipe est\u00e1 descansando agora (das 3:00 \u00e0s 9:00, hor\u00e1rio da Argentina). Sua mensagem fica salva e respondemos assim que voltarmos, por volta de {b} no seu hor\u00e1rio. Pagamentos enviados agora s\u00e3o ativados assim que voltarmos. Voc\u00ea tamb\u00e9m pode enviar seu comprovante por e-mail ou Discord.', awayStat: 'Ausente \u00b7 voltamos ~{b}', eta0: 'Espera estimada: cerca de 1-3 min. Enquanto isso, voc\u00ea tamb\u00e9m pode enviar seu comprovante por e-mail ou Discord.', next: 'Voc\u00ea \u00e9 o pr\u00f3ximo. Espera estimada: cerca de {t}. Pode fechar esta janela: a resposta fica salva aqui.', q1: 'Voc\u00ea est\u00e1 na fila: {n} na sua frente. Espera estimada: cerca de {t}. Pode fechar esta janela: a resposta fica salva aqui.', min: 'min', open: 'Atendente conectado', closed: 'Chat encerrado', ph2: 'Escreva para o atendente...', still: 'Ainda aguardando? Voc\u00ea tamb\u00e9m pode falar com a gente no Discord ou Telegram.', new: 'Iniciar um novo chat', agent: 'Atendente', mail: 'Seu e-mail (opcional, caso feche esta janela)', err: 'N\u00e3o foi poss\u00edvel enviar. Verifique sua conex\u00e3o e tente de novo.', many: 'Muitos chats da sua conex\u00e3o. Use o Discord, por favor.', back: 'Voltar ao assistente' },
      a: { pay: 'O <b>VIP Novinhas</b> custa <b>US$ 49,99 / m\u00eas</b> e libera todos os v\u00eddeos de todos os canais Novinhas, inclusive os novos que continuamos adicionando. Voc\u00ea tamb\u00e9m pode comprar <b>moedas</b> (a partir de US$ 10) para as p\u00e1ginas das modelos, ou fazer uma <b>doa\u00e7\u00e3o</b>. Pague com <b>PayPal</b>, <b>Binance</b> ou <b>cart\u00e3o de cr\u00e9dito/d\u00e9bito</b>. <a href="/paymentmethods/">Ver formas de pagamento</a>',
        fast: 'Quase na hora. Assim que voc\u00ea enviar o comprovante por Discord ou e-mail (' + MAIL + '), ativamos seu acesso, normalmente em minutos. Nossa equipe est\u00e1 online <b>24/7</b>, inclusive nos fins de semana.',
        safe: 'Sim. Nunca pedimos o n\u00famero do seu cart\u00e3o neste site. Na Binance voc\u00ea pode conferir nosso nome e ID verificados antes de confirmar, o PayPal tem prote\u00e7\u00e3o ao comprador, e seu c\u00f3digo de acesso \u00e9 pessoal (funciona em at\u00e9 4 dispositivos seus). Se tiver qualquer d\u00favida, fale com um atendente antes de pagar.',
        nocode: 'Sem problema. Envie seu <b>comprovante de pagamento</b> e o <b>e-mail que voc\u00ea usa na Twerkhub</b> por Discord ou e-mail (' + MAIL + ') e um atendente ativa na hora. 24/7.',
        code: 'Abra qualquer v\u00eddeo bloqueado (com cadeado), toque em <b>Unlock with VIP</b>, digite seu c\u00f3digo em "Already have a code?" e toque em Activate.',
        bin: 'Toque em <b>Pagar com Binance</b> na p\u00e1gina de pagamento: voc\u00ea ver\u00e1 nosso ID verificado da Binance, o valor exato e as redes (Binance Pay, USDT TRC20 ou ERC20). Depois envie o comprovante por Discord ou e-mail (' + MAIL + '). <a href="/paymentmethods/">Abrir p\u00e1gina de pagamento</a>',
        agent: 'Um atendente est\u00e1 dispon\u00edvel 24/7. Escolha onde prefere conversar:', def: 'N\u00e3o encontrei isso. Um atendente pode responder agora:' },
      links: [['Discord (mais r\u00e1pido)', DISCORD], ['E-mail', 'mailto:' + MAIL], ['Telegram', TG]] }
  }[lang];
  var KW = [['bin', /binance|usdt|crypto|cripto|trc|erc/i], ['nocode', /pagu[eé]|paid|no code|sin c[oó]digo|didn.?t get|no recib|receipt|comprobante/i], ['code', /c[oó]digo|code|activate|activar|unlock|desbloq/i], ['safe', /segur|safe|scam|estafa|confi|trust|legit/i], ['fast', /r[aá]pid|fast|tiempo|how long|cu[aá]nto tarda|instant/i], ['pay', /pag|pay|cart[aã]o|pre[cç]o|paypal|tarjeta|card|precio|price|cost|cu[aá]nto|vip|membres/i], ['agent', /agente|agent|humano|human|persona|ayuda|help|soporte|support|contact/i]];
  if (!document.querySelector('link[href*="twk-ui.css"]')) { var uil = document.createElement('link'); uil.rel = 'stylesheet'; uil.href = '/assets/twk-ui.css?v=1'; document.head.appendChild(uil); }
  var css = '\.th-b{position:fixed;left:16px;bottom:16px;z-index:9990;height:52px!important;min-height:52px!important;padding:0 20px 0 16px!important;border-radius:999px!important}.th-b svg{width:22px;height:22px}.th-b i{position:absolute;right:6px;top:6px;width:11px;height:11px;border-radius:50%;background:#2fdc72;border:2px solid #f7c83a}' +
    '.th-t{position:fixed;left:16px;bottom:78px;z-index:9990;max-width:240px;padding:10px 14px;border-radius:14px 14px 14px 4px;background:#14110a;border:1px solid #e8b84a;color:#ffe9a8;font:700 13px/1.4 system-ui;box-shadow:0 8px 24px #000a;cursor:pointer;animation:thIn .3s}@keyframes thIn{from{opacity:0;transform:translateY(8px)}}' +
    '.th-w{position:fixed;left:16px;bottom:80px;z-index:9991;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 110px));display:none;flex-direction:column;border-radius:20px;overflow:hidden;border:1.5px solid #e8b84a;background:#0b0904;box-shadow:0 20px 60px #000c;font-family:Inter,system-ui,sans-serif}.th-w.on{display:flex}' +
    '.th-h{display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(180deg,#2a2208,#14110a);border-bottom:1px solid #e8b84a55}.th-h b{display:block;color:#fff;font-size:15px}.th-s{display:flex;align-items:center;gap:6px;margin-top:2px;color:#a99b72;font:700 11px system-ui}.th-s:before{content:"";width:8px;height:8px;border-radius:50%;background:#a99b72}.th-s.live{color:#9dffb4}.th-s.live:before{background:#2fdc72;box-shadow:0 0 8px #2fdc72}.th-av{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#1a1200;background:linear-gradient(180deg,#fff0a8,#f7c83a 50%,#d99a0b);box-shadow:0 3px 0 #8a6205,inset 0 1px 0 #fff9}.th-av svg{width:24px;height:24px}.th-a{align-self:flex-start;max-width:88%;padding:10px 13px;border-radius:14px;border-bottom-left-radius:4px;background:linear-gradient(180deg,#2c240e,#1c170a);border:1px solid #e8b84a66;color:#fff;font:500 14px/1.5 system-ui}.th-a em{display:block;margin-bottom:3px;font:800 10px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;font-style:normal;color:#ffd76a}.th-mail input{width:100%;padding:10px 14px;border-radius:12px;border:1px dashed #e8b84a77;background:#000;color:#fff;font:500 13px system-ui}.th-b i.n{width:auto;min-width:20px;height:20px;padding:0 5px;right:2px;top:-6px;border-radius:10px;border:2px solid #14110a;background:#ff4d4d;color:#fff;font:800 11px/16px system-ui;text-align:center;font-style:normal}.th-x{margin-left:auto;width:32px;height:32px;border:0;border-radius:50%;background:#ffffff14;color:#fff;font-size:20px;cursor:pointer}' +
    '.th-m{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}.th-g,.th-u{max-width:88%;padding:10px 13px;border-radius:14px;font:500 14px/1.5 system-ui}.th-g{align-self:flex-start;background:#1c1810;color:#eee;border-bottom-left-radius:4px}.th-g a{color:#ffd76a;font-weight:800}.th-u{align-self:flex-end;background:linear-gradient(180deg,#ffe08a,#c99a2e);color:#1a1200;font-weight:700;border-bottom-right-radius:4px}' +
    '.th-q{display:flex;flex-wrap:wrap;gap:7px}.th-q button{padding:8px 13px;border-radius:999px;border:1px solid #c99a2e88;background:#14110a;color:#f7dd8b;font:700 12px system-ui;cursor:pointer}.th-q button:hover{background:#c99a2e22}.th-l{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    '.th-f{display:flex;gap:8px;padding:10px;border-top:1px solid #e8b84a33;background:#100d06}.th-f input{flex:1;min-width:0;padding:11px 14px;border-radius:999px;border:1px solid #3a3115;background:#000;color:#fff;font:500 14px system-ui}' +
    '@media(max-width:560px){.th-b span{display:none}.th-b{padding:0 14px!important;height:48px!important;min-height:48px!important}.th-w{left:8px;bottom:72px;width:calc(100vw - 16px)}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'th-b twk-btn'; btn.setAttribute('aria-label', L.name);
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/></svg><span>' + ({ es: 'Ayuda', pt: 'Ajuda' }[lang] || 'Help') + '</span><i></i>';
  var win = document.createElement('div'); win.className = 'th-w'; win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', L.name);
  win.innerHTML = '<div class="th-h"><div class="th-av"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26v-4a15 15 0 0 1 30 0v4"/><rect x="6" y="24" width="7" height="11" rx="3.5" fill="currentColor" stroke="none"/><rect x="35" y="24" width="7" height="11" rx="3.5" fill="currentColor" stroke="none"/><path d="M38.5 35c0 5-4.5 7-10 7"/></svg></div><div><b>' + L.name + '</b><span class="th-s live">' + onStat().t + '</span></div><button class="th-x" type="button" aria-label="Close">&times;</button></div><div class="th-m"></div><form class="th-f"><input type="text" placeholder="' + L.ph + '" aria-label="' + L.ph + '" autocomplete="off"><button type="submit" class="twk-btn twk-btn--sm">' + L.send + '</button></form>';
  var msgs = win.querySelector('.th-m'), input = win.querySelector('input'), stat = win.querySelector('.th-s'), started = false, tease, mode = 'bot', chat = null, lastId = 0, timer = null, sentFirst = false, waitT = null, unread = 0, transcript = [];
  try { chat = localStorage.getItem('twk_help_chat') || null; if (chat) mode = 'agent'; } catch (_) {}
  var badge = btn.querySelector('i');
  function add(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bubble(role, text) { var d = document.createElement('div'); d.className = role === 'user' ? 'th-u' : role === 'agent' ? 'th-a' : 'th-g'; if (role === 'agent') d.innerHTML = '<em>' + L.ag.agent + '</em>'; var t = document.createElement('span'); t.textContent = text; d.appendChild(t); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; }
  function chips() { var o = msgs.querySelector('.th-q'); if (o) o.remove(); var h = ''; ['pay', 'fast', 'safe', 'nocode', 'code', 'bin', 'agent'].forEach(function (k) { h += '<button type="button" data-k="' + k + '">' + L.q[k] + '</button>'; }); add('th-q', h); }
  function links() { var h = ''; L.links.forEach(function (l) { h += '<a class="twk-btn twk-btn--sm" href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + '</a>'; }); add('th-l', h); }
  function setStat(t, on) { stat.textContent = t; stat.classList.toggle('live', !!on); }
  function setMode(m) { mode = m; input.placeholder = m === 'agent' ? L.ag.ph2 : L.ph; }
  function api(method, body, qs) { return fetch('/api/help/chat' + (qs || ''), { method: method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._s = r.status; return j; }); }); }
  function away() { var h = (new Date().getUTCHours() + 21) % 24; if (h < 3 || h >= 9) return null; var d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function onStat() { var b = away(); return b ? { t: L.ag.awayStat.replace('{b}', b), live: false } : { t: L.on, live: true }; }
  function eta(a) { var b = away(); if (b) return { t: '', msg: L.ag.away.replace('{b}', b), stat: L.ag.awayStat.replace('{b}', b) }; var lo = Math.max(1, a * 3), hi = lo + 3, t = lo + '-' + hi + ' ' + L.ag.min; return { t: t, msg: (a > 0 ? L.ag.q1.replace('{n}', a) : L.ag.next).replace('{t}', t), stat: L.ag.wait + ' \u00b7 ' + t }; }
  function showQueue(a) { var e = eta(a || 0); setStat(e.stat, false); if (!queueShown) { queueShown = true; add("th-g", e.msg); } }
  var queueShown = false;
  function escalate() {
    if (mode === 'agent' && chat) return;
    setMode('agent'); add('th-g', L.ag.conn); var aw = away(); if (aw) queueShown = true; add('th-g', aw ? L.ag.away.replace('{b}', aw) : L.ag.eta0); links(); setStat(aw ? L.ag.awayStat.replace('{b}', aw) : L.ag.wait + ' \u00b7 1-3 ' + L.ag.min, false);
    if (!chat && !win.querySelector('.th-mail')) { var f = document.createElement('div'); f.className = 'th-mail'; f.innerHTML = '<input type="email" placeholder="' + esc(L.ag.mail) + '" aria-label="' + esc(L.ag.mail) + '" autocomplete="email">'; msgs.appendChild(f); }
    msgs.scrollTop = msgs.scrollHeight; input.focus({ preventScroll: true });
  }
  function poll() {
    if (!chat) return;
    api('GET', null, '?chat=' + chat + '&since=' + lastId).then(function (j) {
      if (!j.ok) { if (j._s === 404) { try { localStorage.removeItem('twk_help_chat'); } catch (_) {} chat = null; lastId = 0; stopPoll(); } return; }
      var got = false;
      (j.msgs || []).forEach(function (m) { lastId = Math.max(lastId, m.id); if (m.role === 'agent') { got = true; if (!win.classList.contains('on')) { unread++; markUnread(); } } if (!rendered[m.id]) { rendered[m.id] = 1; if (!(m.role === 'user' && localEcho[m.text])) bubble(m.role, m.text); else delete localEcho[m.text]; } });
      if (j.status === 'closed') { setStat(L.ag.closed, false); if (!closedShown) { closedShown = true; var d = add('th-q', '<button type="button" data-new="1">' + L.ag.new + '</button>'); } stopPoll(); }
      else if (j.status === 'open') { setStat(L.ag.open, true); clearTimeout(waitT); } else setStat(eta(j.ahead || 0).stat, false);
      if (got) clearTimeout(waitT);
    }).catch(function () {});
  }
  var rendered = {}, localEcho = {}, closedShown = false;
  function markUnread() { badge.className = 'n'; badge.textContent = unread > 9 ? '9+' : unread; }
  function startPoll() { stopPoll(); poll(); timer = setInterval(poll, win.classList.contains('on') ? 3000 : 12000); }
  function stopPoll() { if (timer) { clearInterval(timer); timer = null; } }
  function restore() { rendered = {}; lastId = 0; closedShown = false; msgs.innerHTML = ''; api('GET', null, '?chat=' + chat + '&since=0').then(function (j) { if (!j.ok) { try { localStorage.removeItem('twk_help_chat'); } catch (_) {} chat = null; setMode('bot'); started = false; openW(); return; } (j.msgs || []).forEach(function (m) { lastId = Math.max(lastId, m.id); rendered[m.id] = 1; bubble(m.role, m.text); }); if (j.status === 'closed') { setStat(L.ag.closed, false); closedShown = true; add('th-q', '<button type="button" data-new="1">' + L.ag.new + '</button>'); } else { setStat(j.status === 'open' ? L.ag.open : L.ag.wait, j.status === 'open'); startPoll(); } }); }
  function sendAgent(t) {
    var mail = win.querySelector('.th-mail input'), body = { chat: chat, text: t, path: location.pathname, lang: lang, email: mail ? mail.value.trim() : '' };
    if (!chat) body.transcript = transcript.slice(-12);
    localEcho[t] = 1; bubble('user', t);
    api('POST', body).then(function (j) {
      if (!j.ok || !j.chat) { delete localEcho[t]; add('th-g', j._s === 429 ? L.ag.many : L.ag.err); if (j._s === 429) links(); return; }
      if (!chat) { chat = j.chat; try { localStorage.setItem('twk_help_chat', chat); } catch (_) {} } if (j.id) rendered[j.id] = 1;
      var m = win.querySelector('.th-mail'); if (m) m.remove();
      closedShown = false; showQueue(j.ahead); startPoll();
      clearTimeout(waitT); waitT = setTimeout(function () { if (win.querySelector('.th-s.live')) return; add('th-g', L.ag.still); links(); }, 150000);
    }).catch(function () { delete localEcho[t]; add('th-g', L.ag.err); });
  }
  function answer(k) { if (k === 'agent') { escalate(); return; } add('th-g', L.a[k]); transcript.push({ role: 'bot', text: L.a[k].replace(/<[^>]+>/g, '') }); if (k === 'nocode' || k === 'safe') links(); chips(); }
  function route(t) { for (var i = 0; i < KW.length; i++) if (KW[i][1].test(t)) return KW[i][0]; return null; }
  function openW(why) {
    win.classList.add('on'); if (tease) { tease.remove(); tease = null; } try { sessionStorage.setItem('twk_help_t', '1'); } catch (_) {}
    unread = 0; badge.className = ''; badge.textContent = '';
    if (!started) { started = true; if (chat) { setMode('agent'); restore(); } else { add('th-g', L.hi); chips(); } }
    if (chat) startPoll();
    if (why === 'agent') escalate();
    setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
  }
  btn.addEventListener('click', function () { if (win.classList.contains('on')) { win.classList.remove('on'); if (chat) startPoll(); } else openW(); });
  stat.classList.toggle('live', onStat().live);
  win.querySelector('.th-x').addEventListener('click', function () { win.classList.remove('on'); if (chat) startPoll(); });
  msgs.addEventListener('click', function (e) {
    var n = e.target.closest('[data-new]'); if (n) { try { localStorage.removeItem('twk_help_chat'); } catch (_) {} chat = null; lastId = 0; rendered = {}; closedShown = false; stopPoll(); msgs.innerHTML = ''; setMode('bot'); var os = onStat(); setStat(os.t, os.live); add('th-g', L.hi); chips(); return; }
    var b = e.target.closest('[data-k]'); if (!b) return; var k = b.dataset.k; if (k !== 'agent') { bubble('user', L.q[k]); transcript.push({ role: 'user', text: L.q[k] }); } setTimeout(function () { answer(k); }, 250);
  });
  win.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault(); var t = input.value.trim(); if (!t) return; input.value = '';
    if (mode === 'agent') { sendAgent(t); return; }
    bubble('user', t); transcript.push({ role: 'user', text: t }); var k = route(t);
    setTimeout(function () { if (k) answer(k); else { add('th-g', L.a.def); escalate(); } }, 300);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') win.classList.remove('on'); });
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-twk-agent]'); if (a) { e.preventDefault(); openW('agent'); } });
  window.TWK_HELP = { open: openW };
  setMode(mode);
  function mount() {
    document.body.appendChild(btn); document.body.appendChild(win);
    var seen = false; try { seen = sessionStorage.getItem('twk_help_t') === '1'; } catch (_) {}
    var pay = /paymentmethods|tokens|membership/.test(location.pathname);
    if (!seen) setTimeout(function () { if (win.classList.contains('on')) return; tease = document.createElement('div'); tease.className = 'th-t'; tease.textContent = L.tease; tease.onclick = openW; document.body.appendChild(tease); try { sessionStorage.setItem('twk_help_t', '1'); } catch (_) {} setTimeout(function () { if (tease) { tease.remove(); tease = null; } }, 9000); }, pay ? 3000 : 12000);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
