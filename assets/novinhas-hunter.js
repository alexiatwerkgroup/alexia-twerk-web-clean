/* Cartel "¿Quieres ser un cazador?" (Novinhas) + easter egg oculto. Se muestra DESPUES del cartel +18.
   UNA sola implementacion. Datos reales: /api/novinhas/hunt (participacion, sesiones, billetera, platino). */
(function () {
  var END = Date.UTC(2026, 11, 1, 3, 0, 0);
  var EVERY = 6 * 3600 * 1000, FORCE = Date.UTC(2026, 10, 15, 12, 18, 0); /* se muestra a todos (menos a los que ya eligieron categoria) cada 6 h; los cierres anteriores a FORCE no cuentan */
  if (Date.now() >= END || window.__twkHunt) return; window.__twkHunt = 1;
  var LK = 'twk-hunt-lang', XK = 'twk-hunt-x2', PK = 'twk-hunt-pending', JK = 'twk-hunt-joined', EK = 'twk-hunt-egg', SK = 'twk-hunt-sid';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  var T = {
    pt: { t1: 'Quer ser caçador?', t2: 'Acesso grátis a todo o conteúdo', t3: 'Mês que vem, 5 a 10 vagas para quem mais doar conteúdo ao Novinhas: vídeos e canais em recuperação ainda não publicados.', c1h: 'Categoria 1', c1t: 'Quem mais doar conteúdo. Grátis, só por mérito.', c2h: 'Categoria 2', c2t: 'Top doadores Binance e PayPal. Mesmo privilégio, categoria à parte.', t4: 'Esta é a sua chance de ganhar de graça.', cl: 'Termina em', t5: 'Quero participar', t6: 'Requisito: conta registrada, para falarmos com você se for escolhido.', b1: 'Entrar ou criar conta', b1a: 'Participar agora', b2: 'Agora não', b3: 'Ranking de doadores', u: ['dias', 'h', 'min', 'seg'], o1: 'Conquista oculta', o2: 'Grande conquista oculta', eg: 'Só X% dos visitantes achou este easter egg', r5: '+5 moedas de platina', r20: '+20 moedas de platina', vr: '+ 1 voucher VIP', ak: 'Já estão na sua carteira.', gst: 'Entre ou crie sua conta para receber o seu prêmio.', et: 'Emblemas do concurso Caçador', cond: 'Só se você for escolhido como doador de conteúdo ou de dinheiro:', p1: 'Acesso grátis a todo o conteúdo.', p2: 'Emblema especial no fórum.', p3: 'Privilégios de moderador, administrador e líder dos hunters.', p4: 'Os privilégios só se tiver interesse. Se quiser só o conteúdo grátis, vale 100%.', cls: 'Fechar', need: 'Entre ou crie sua conta para participar.', pick: 'Escolha uma categoria para participar.', sel: 'Escolhida', ok: 'Pronto! Você está participando. Entraremos em contato por e-mail.', err: 'Algo deu errado. Tente novamente.' },
    es: { t1: '¿Quieres ser cazador?', t2: 'Acceso gratis al contenido', t3: 'El mes que viene, 5 a 10 lugares para los que más donen contenido a Novinhas: videos y canales en recuperación sin publicar.', c1h: 'Categoría 1', c1t: 'Los que más contenido donen. Gratis, solo por mérito.', c2h: 'Categoría 2', c2t: 'Top donantes de Binance y PayPal. Mismo privilegio, categoría aparte.', t4: 'Esta es tu chance de conseguirlo gratis.', cl: 'Termina en', t5: 'Quiero participar', t6: 'Requisito: cuenta registrada, para contactarte si sos elegido.', b1: 'Entrar o registrarme', b1a: 'Participar ahora', b2: 'Ahora no', b3: 'Ranking de donadores', u: ['días', 'hs', 'min', 'seg'], o1: 'Logro oculto', o2: 'Gran logro oculto', eg: 'Solo el X% de los visitantes encontró este easter egg', r5: '+5 monedas de platino', r20: '+20 monedas de platino', vr: '+ 1 voucher VIP', ak: 'Ya están en tu billetera.', gst: 'Entrá o registrate para recibir tu premio.', et: 'Emblemas del concurso Cazador', cond: 'Solo si resultás elegido como donante de contenido o de dinero:', p1: 'Acceso gratis a todo el contenido.', p2: 'Emblema especial en el foro.', p3: 'Privilegios de moderador, administrador y líder de hunters.', p4: 'Los privilegios, solo si te interesa. Si solo querés el contenido gratis, es 100% válido.', cls: 'Cerrar', need: 'Entrá o registrate para participar.', pick: 'Elegí una categoría para participar.', sel: 'Elegida', ok: '¡Listo! Estás participando. Te contactaremos por mail.', err: 'Algo salió mal. Probá de nuevo.' },
    en: { t1: 'Want to be a hunter?', t2: 'Free access to all content', t3: 'Next month, 5 to 10 spots for the top donors of Novinhas content: unpublished videos and channels still in recovery.', c1h: 'Category 1', c1t: 'Top content donors. Free, on merit alone.', c2h: 'Category 2', c2t: 'Top donors by Binance and PayPal. Same privilege, separate category.', t4: 'This is your chance to get it for free.', cl: 'Ends in', t5: 'I want to take part', t6: "Requirement: a registered account, so we can contact you if you're chosen.", b1: 'Log in or sign up', b1a: 'Join now', b2: 'Not now', b3: 'Donor ranking', u: ['days', 'hrs', 'min', 'sec'], o1: 'Hidden achievement', o2: 'Great hidden achievement', eg: 'Only X% of visitors found this easter egg', r5: '+5 platinum coins', r20: '+20 platinum coins', vr: '+ 1 VIP voucher', ak: "They're already in your wallet.", gst: 'Log in or sign up to receive your reward.', et: 'Hunter contest emblems', cond: "Only if you're chosen as a content or money donor:", p1: 'Free access to all content.', p2: 'Special emblem on the forum.', p3: 'Moderator, administrator and hunter leader privileges.', p4: "Privileges only if you're interested. If you just want the free content, that's 100% valid.", cls: 'Close', need: 'Log in or create your account to take part.', pick: 'Choose a category to take part.', sel: 'Chosen', ok: "Done! You're in. We'll contact you by email.", err: 'Something went wrong. Try again.' }
  };
  var L = ls(LK); if (!T[L]) L = 'pt';
  var who = 'g', rep, root, auth = false, joined = false, cat = ls('twk-hunt-cat') || '', tmr, sid = ls(SK);
  if (!sid || !/^[A-Za-z0-9_-]{8,64}$/.test(sid)) { sid = (Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 32); ls(SK, sid); }
  var BUNNY = 'M113,1.7C111.2,0.5 111.6,0.5 109.2,1.3C106.8,2.2 101.4,5.1 98.5,6.8C95.5,8.6 94.2,9.5 91.5,11.7C88.7,13.9 84.3,17.5 81.7,20C79.1,22.4 78.5,23.1 76.1,26.3C73.7,29.5 70,34.7 67.3,39.1C64.7,43.5 61.5,50.6 60.1,52.8C58.7,55.1 59.5,53.4 59.1,52.5C58.7,51.5 58.5,49.7 57.6,47.3C56.6,44.9 55,41 53.5,38.1C51.9,35.2 50,32.3 48.3,30C46.7,27.6 45.8,26.5 43.7,24.2C41.6,22 38.4,18.6 35.8,16.5C33.3,14.3 30.4,12.4 28.5,11.2C26.5,10 25,9.8 24,9.2C22.9,8.6 23.1,8 22.3,7.6C21.5,7.2 20.4,7.6 19.1,7C17.7,6.4 15.2,4.5 14.2,4C13.2,3.4 13.5,3.7 13.2,3.8C12.9,3.9 12.7,3 12.2,4.6C11.7,6.2 10.3,9.9 10,13.5C9.6,17 9.8,23.5 10,26.1C10.1,28.7 10.8,28 11,29C11.1,29.9 10.6,29.9 11.1,32C11.6,34 12.9,38.3 14.1,41.2C15.3,44.1 16.8,47 18.2,49.5C19.6,51.9 20.2,53.2 22.5,55.8C24.7,58.5 28.4,62.3 32,65.3C35.5,68.3 41.8,72.2 43.7,73.8C45.6,75.4 44.2,73.7 43.3,75C42.4,76.2 39.6,79.2 38.2,81.3C36.8,83.4 36,85.1 35.1,87.5C34.2,89.8 33.3,93.1 33,95.3C32.6,97.6 32.6,98.8 33,101C33.3,103.1 34.4,106.3 35.1,108.2C35.8,110.1 35.4,110.3 37.2,112.5C39,114.6 44.6,119.7 46.1,121.3C47.6,122.9 47.7,121.1 46.1,122C44.4,122.8 38.9,124.8 36.1,126.3C33.3,127.9 30.9,129.9 29.2,131.2C27.5,132.5 27.2,133 26.1,134.3C25,135.6 23.6,137.4 22.5,139.1C21.3,140.8 20.4,142.1 19.3,144.5C18.3,146.8 16.6,151.1 16.1,153.3C15.5,155.6 16.1,156.9 16,158C15.8,159 15.8,159.4 15.1,159.6C14.4,159.7 13.1,159.1 11.8,159C10.5,158.9 8.7,159.1 7.2,159C5.7,158.8 4.3,158 3.1,158.1C1.9,158.2 0.5,158.4 0,159.7C-0.5,161 -0.9,164.1 0,165.8C0.9,167.6 4.7,169.1 5.5,170.1C6.2,171 5.5,171 4.6,171.6C3.7,172.2 0.7,172.6 0,173.7C-0.7,174.8 -2.1,176.3 0,178C2.1,179.6 9.8,182.8 12.6,183.8C15.4,184.8 15.2,184.2 16.7,184C18.2,183.7 20,182.1 21.5,182.3C22.9,182.6 23.3,184.4 25.6,185.5C27.8,186.6 27.4,188.5 35,189C42.6,189.4 62.8,188.2 71.2,188.2C79.6,188.2 82.9,188.7 85.3,188.7C87.8,188.7 86,188.4 85.8,188C85.7,187.5 83.4,186.1 84.5,186.2C85.5,186.3 89.2,188.2 92,188.6C94.7,188.9 98.5,188.2 100.8,188.2C103.2,188.2 104.7,189 106.1,188.8C107.4,188.6 108.2,187.7 108.8,187C109.5,186.2 109.7,185.5 109.8,184.6C110,183.7 110.1,182.5 109.8,181.5C109.6,180.4 109.1,179.3 108.5,178.3C107.9,177.4 108.3,177 106.2,175.8C104.1,174.7 98.2,172.2 95.8,171.3C93.5,170.5 93.1,171.1 92.1,170.8C91.1,170.6 90.6,169.9 89.8,169.7C89,169.5 88,169.9 87.3,169.8C86.7,169.8 86.1,169.6 86.1,169.3C86.1,169.1 86.1,168.5 87.3,168.5C88.6,168.4 92.4,169.2 93.7,169.2C95,169.2 94.1,169.7 95.1,168.3C96.1,167 98.6,163.5 99.7,161.1C100.8,158.7 101.5,156.5 101.8,154.1C102.2,151.6 102.2,148.9 101.8,146.5C101.4,144 100,140.8 99.3,139.2C98.7,137.6 98.5,137.5 97.8,136.7C97.2,135.9 96.2,135.1 95.3,134.6C94.5,134 94.2,134.7 92.8,133.5C91.4,132.2 87.9,128.5 86.8,127.3C85.8,126.2 86.2,126.7 86.6,126.5C86.9,126.2 87.3,125.8 88.8,126C90.4,126.1 93.6,127.3 95.8,127.6C98.1,127.8 100.2,127.7 102.2,127.5C104.2,127.2 106.3,126.4 107.8,125.8C109.3,125.2 110.1,124.7 111.2,124C112.4,123.2 113.7,122 114.7,121.1C115.7,120.1 116.7,119.2 117.2,118.3C117.7,117.5 117.1,116.5 118,116.1C118.8,115.7 120.9,116.1 122.2,115.8C123.5,115.5 124.9,114.8 125.8,114.2C126.7,113.6 127.1,113 127.6,112.2C128.1,111.4 128.6,110.8 128.8,109.6C129.1,108.4 129.2,106.3 129.2,105C129.2,103.6 129.1,102.6 128.7,101.6C128.3,100.5 128,99.8 126.7,98.6C125.5,97.4 122.4,96.2 121.2,94.5C120,92.7 120.5,90.5 119.6,88.3C118.7,86.2 117.4,83.6 115.8,81.5C114.2,79.4 112.1,77.4 110.1,75.7C108.1,74.1 105.1,72.4 103.7,71.6C102.3,70.8 102.6,71.6 101.5,70.8C100.4,70.1 98.5,68.1 97.1,67.2C95.7,66.4 94,66.1 93.1,65.7C92.2,65.3 91.1,65.4 91.8,64.7C92.5,64 95.7,62.7 97.3,61.6C99,60.5 99.9,60 101.8,58.1C103.8,56.2 107,52.8 109,50.2C110.9,47.6 112.1,45.5 113.6,42.6C115,39.7 116.7,35.9 117.7,33C118.7,30 119.5,26.6 119.8,24.7C120.2,22.8 119.7,22.8 119.8,21.6C120,20.3 120.7,19 120.8,17.2C121,15.4 120.9,12.4 120.7,11C120.5,9.5 121,9.9 119.7,8.3C118.4,6.8 114.7,2.9 113,1.7Z';
  function sk(h) {
    var g, gn, ey;
    if (h === 'h') { g = '<path d="M26 40 Q50 33 74 40 L72 33 Q50 24 28 33Z" fill="#1c1c1c" stroke="#fff" stroke-width="1.4"/><ellipse cx="50" cy="41" rx="27" ry="5" fill="#2a2a2a" stroke="#fff" stroke-width="1.4"/><path d="M62 31 Q70 22 76 24 Q70 30 64 34Z" fill="#fff"/>'; gn = '<g stroke="#fff" stroke-width="4.5" stroke-linecap="round"><path d="M16 82 L84 56"/><path d="M84 82 L16 56"/></g>'; ey = '<ellipse cx="43" cy="52" rx="4.5" ry="5.5" fill="#0b0b0d"/><ellipse cx="57" cy="52" rx="4.5" ry="5.5" fill="#0b0b0d"/>'; }
    else { g = '<path d="M30 38 L30 26 L38 32 L44 22 L50 31 L56 22 L62 32 L70 26 L70 38Z" fill="#f0b90b" stroke="#6b5316" stroke-width="1.2"/><ellipse cx="50" cy="40" rx="20" ry="4" fill="#1c1c1c" stroke="#fff" stroke-width="1.2"/>'; gn = '<g fill="#fff" stroke="#0b0b0d"><path d="M14 58 L52 72 L50 78 L12 64Z"/><path d="M86 58 L48 72 L50 78 L88 64Z"/><path d="M48 72 L40 88 L46 90 L52 76Z"/><path d="M52 72 L60 88 L54 90 L48 76Z"/></g>'; ey = '<rect x="35" y="48" width="13" height="8" rx="3" fill="#0b0b0d" stroke="#fff"/><rect x="52" y="48" width="13" height="8" rx="3" fill="#0b0b0d" stroke="#fff"/>'; }
    return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0b0b0d"/>' + gn + '<ellipse cx="50" cy="52" rx="17" ry="18" fill="#efefef"/><rect x="40" y="63" width="20" height="11" rx="3" fill="#efefef"/>' + ey + '<path d="M50 58 L47 64 H53Z" fill="#0b0b0d"/><path d="M43 68 V73 M47 68 V74 M50 68 V74 M53 68 V74 M57 68 V73" stroke="#0b0b0d" stroke-width="1.2"/>' + g + '</svg>');
  }
  var EM = []; for (var ei = 1; ei <= 8; ei++) EM.push('/assets/cazador/emb-' + ei + '.webp?v=1'); EM.push(sk('h'), sk('c'));
  var CSS =
    '#twkh{position:fixed;inset:0;z-index:2147482000;background:rgba(3,2,6,.9);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto;font-family:Inter,system-ui,Arial,sans-serif;color:#f4efe2;-webkit-overflow-scrolling:touch}' +
    '#twkh *{box-sizing:border-box}#twkh button{font-family:inherit}' +
    '#twkh .b{position:relative;width:100%;max-width:640px;margin:auto;border:1px solid #6b5316;border-radius:18px;padding:14px 22px 20px;text-align:center;background:radial-gradient(ellipse at 50% 0,#2a2006 0%,#0e0c07 46%,#0b0b0d 100%);box-shadow:0 0 0 1px #000,0 30px 80px rgba(0,0,0,.7),0 0 60px rgba(240,185,11,.07)}' +
    '#twkh .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}' +
    '#twkh .x{width:34px;height:34px;border-radius:50%;border:1px solid #6b5514;background:#17140a;color:#f0b90b;font-size:20px;line-height:1;cursor:pointer}' +
    '#twkh .lg{display:inline-flex;gap:3px;padding:3px;border:1.5px solid #f0b90b;border-radius:999px;background:#17140a}' +
    '#twkh .lg button{border:0;background:transparent;color:#f0d27a;font-weight:700;font-size:12px;padding:5px 12px;border-radius:999px;cursor:pointer;letter-spacing:.05em}' +
    '#twkh .lg button.on{background:linear-gradient(180deg,#ffd75a,#e0a800);color:#1a1100}' +
    '#twkh canvas{margin-bottom:6px;width:100%;aspect-ratio:528/124;display:block;touch-action:manipulation;user-select:none;-webkit-user-select:none}' +
    '#twkh .t1{height:18px;line-height:18px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#f0b90b;font-weight:700;margin:2px 0 8px;white-space:nowrap;overflow:hidden}' +
    '#twkh .t2{height:36px;line-height:36px;font-size:clamp(22px,5.4vw,30px);font-weight:800;color:#fff;margin:0 0 10px;white-space:nowrap;overflow:hidden;letter-spacing:-.01em}' +
    '#twkh .t3{height:63px;font-size:14px;line-height:21px;color:#d9d2bd;margin:0 auto 14px;max-width:460px;overflow:hidden}' +
    '#twkh .cats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;text-align:left}' +
    '#twkh .c{height:198px;border-radius:12px;padding:12px;display:flex;flex-direction:column;position:relative;overflow:hidden}' +
    '#twkh .c1{border:1px solid #f0b90b;background:linear-gradient(180deg,#1c1709,#120f07)}#twkh .c2{border:1px solid #6b5316;background:linear-gradient(180deg,#171309,#0f0d08)}' +
    '#twkh .c{cursor:pointer;transition:border-color .2s,box-shadow .2s}#twkh .c .rd{position:absolute;top:11px;right:11px;width:16px;height:16px;border-radius:50%;border:1.5px solid #6b5316;background:#0b0b0d}#twkh .c.on{border-color:#ffd75a;box-shadow:0 0 0 1px #f0b90b,0 0 22px rgba(240,185,11,.28)}#twkh .c.on .rd{border-color:#f0b90b;background:radial-gradient(circle,#f0b90b 0 45%,#0b0b0d 50%)}#twkh .c:not(.on){opacity:.88}' +
    '#twkh .ch{height:16px;line-height:16px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#f0b90b;text-transform:uppercase;margin-bottom:5px}' +
    '#twkh .ct{height:54px;font-size:13px;line-height:18px;color:#e8e1cc;overflow:hidden}' +
    '#twkh .pv{flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:8px;min-height:0}' +
    '#twkh .pv i{position:relative;overflow:hidden;display:block;border-radius:6px;border:1px solid #6b5316;background:#241c08 center/cover no-repeat;transition:opacity .2s;min-height:0}' +
    '#twkh .pv video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;transition:opacity .35s}' +
    '#twkh .pv i:before{position:absolute;inset:0;z-index:1;content:"";display:block;width:100%;height:100%;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.55))}' +
    '#twkh .lgf{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;border-radius:10px;border:1px solid #2e2510;background:radial-gradient(ellipse at 50% 50%,rgba(240,185,11,.16),rgba(240,185,11,0) 70%),#0d0b06}' +
    '#twkh .lgf span{display:inline-flex;align-items:center;justify-content:center;height:36px;border-radius:9px;padding:0 10px;transition:opacity .25s}#twkh .lgf .bi{background:#0b0b0d;border:1px solid #4a3d16;box-shadow:0 0 14px rgba(240,185,11,.2)}#twkh .lgf .pp{background:#fff;box-shadow:0 0 14px rgba(255,255,255,.15)}#twkh .lgf img{height:22px;width:auto;display:block}' +
    '#twkh .t4{height:22px;line-height:22px;font-size:15px;font-weight:800;color:#f0b90b;margin-bottom:12px;white-space:nowrap;overflow:hidden}' +
    '#twkh .cl{height:14px;line-height:14px;font-size:11px;letter-spacing:.12em;color:#a89c78;text-transform:uppercase;margin-bottom:6px}' +
    '#twkh .cd{display:flex;justify-content:center;gap:8px;margin-bottom:14px;height:58px}' +
    '#twkh .u{width:68px;background:linear-gradient(180deg,#1d1809,#120f07);border:1px solid #4a3d16;border-radius:9px;padding:7px 0;height:58px}#twkh .u b{display:block;font:800 24px/26px ui-monospace,Consolas,monospace;color:#f0b90b}#twkh .u span{display:block;font-size:10px;line-height:14px;letter-spacing:.08em;text-transform:uppercase;color:#a89c78}' +
    '#twkh .ck{display:flex;align-items:center;gap:9px;justify-content:center;font-size:14px;font-weight:600;color:#f4efe2;margin:0 auto 6px;height:22px;cursor:pointer}#twkh .ck input{accent-color:#f0b90b;width:17px;height:17px;margin:0}' +
    '#twkh .rq{height:36px;font-size:12px;line-height:18px;color:#a89c78;margin:0 auto 12px;max-width:430px;overflow:hidden}' +
    '#twkh .bt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}' +
    '#twkh .b1,#twkh .b2,#twkh .b3{width:100%;height:46px;line-height:44px;border-radius:9px;font-size:14px;white-space:nowrap;cursor:pointer;text-align:center;text-decoration:none;display:block;border:0;padding:0}' +
    '#twkh .b1{font-weight:800;color:#1a1100;background:linear-gradient(180deg,#ffe27a 0%,#f0b90b 48%,#c98f00 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 4px 18px rgba(240,185,11,.28)}#twkh .b1:hover{filter:brightness(1.08)}' +
    '#twkh .b2,#twkh .b3{font-weight:700;color:#f0b90b;background:#0b0b0d;border:1px solid #f0b90b;line-height:44px;overflow:hidden;text-overflow:ellipsis}#twkh .b2:hover,#twkh .b3:hover{background:#17130a}' +
    '#twkh .ms{height:22px;line-height:22px;margin-top:10px;font-size:13px;color:#f0d27a;overflow:hidden;white-space:nowrap}#twkh .ms.ok{color:#5be08a;font-weight:600}' +
    '#twkh .ov{position:absolute;inset:0;border-radius:18px;background:radial-gradient(ellipse at 50% 0,#2a2006,#0b0b0d 60%);display:none;opacity:0;transition:opacity .5s;flex-direction:column;align-items:center;justify-content:center;padding:14px;z-index:5;overflow:auto}' +
    '#twkh .eg{height:24px;line-height:22px;padding:0 12px;border:1px solid #f0b90b;border-radius:999px;font-size:12px;font-weight:800;color:#f0b90b;background:#1a1608;margin-bottom:10px;white-space:nowrap}' +
    '#twkh .ot{height:30px;line-height:30px;font-size:20px;font-weight:800;letter-spacing:.06em;color:#fff;text-transform:uppercase}' +
    '#twkh .rw{display:flex;align-items:center;gap:8px;height:32px;margin-top:4px;font-size:17px;font-weight:800;color:#e7eaf0}' +
    '#twkh .plc{display:inline-block;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#d9dde5 45%,#737986);border:1.5px solid #e6e9ef;box-shadow:0 0 10px rgba(220,225,235,.6)}' +
    '#twkh .hvr{height:26px;line-height:26px;font-size:15px;font-weight:800;color:#f0b90b;visibility:hidden}#twkh .hvr.on{visibility:visible}' +
    '#twkh .ak{min-height:18px;line-height:18px;font-size:12px;color:#a89c78;margin-bottom:10px}#twkh .ak a{color:#f0b90b;font-weight:700}' +
    '#twkh .et{height:16px;line-height:16px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#f0b90b;margin-bottom:8px}' +
    '#twkh .gr{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;width:100%;max-width:340px;margin:0 auto 10px}#twkh .gr div{aspect-ratio:1/1;border-radius:8px;overflow:hidden;border:1px solid #6b5316;background:#000}#twkh .gr img{width:100%;height:100%;display:block;object-fit:cover}' +
    '#twkh .pk{background:#16120a;border:1px solid #4a3d16;border-radius:10px;padding:8px 12px;text-align:left;width:100%;max-width:420px}' +
    '#twkh .pk .cn{display:block;min-height:34px;font-size:12px;line-height:17px;font-weight:700;color:#f0b90b;margin-bottom:4px}#twkh .pk div{display:flex;gap:8px;font-size:12px;line-height:20px;color:#e8e1cc}#twkh .pk b{color:#f0b90b}' +
    '#twkh .pk .n{height:36px;line-height:18px}#twkh .pk .f{display:block;min-height:34px;font-size:11px;line-height:17px;color:#a89c78;border-top:1px solid #2a2310;padding-top:6px;overflow:hidden}' +
    '#twkh .cx{margin-top:10px;width:120px;height:34px;line-height:32px;border-radius:8px;border:1px solid #f0b90b;color:#f0b90b;background:#0b0b0d;font-size:13px;font-weight:700;cursor:pointer}' +
    '@media(max-width:560px){#twkh{padding:8px}#twkh .b{padding:12px 12px 16px}#twkh .t3{font-size:13px;height:80px}#twkh .c{height:210px;padding:10px}#twkh .ct{font-size:12px}#twkh .u{width:60px}#twkh .bt{gap:6px}#twkh .b1,#twkh .b2,#twkh .b3{font-size:12px;height:44px;line-height:42px;padding:0 4px}#twkh .lgf{flex-wrap:wrap;gap:6px}}' +
    '#twkh .fm{position:absolute;inset:0;border-radius:18px;background:radial-gradient(ellipse at 50% 0,#2a2006,#0b0b0d 60%);display:none;flex-direction:column;align-items:center;justify-content:center;padding:18px;z-index:6;gap:9px;text-align:center}' +
    '#twkh .fm h3{margin:0;font-size:22px;font-weight:800;color:#fff}#twkh .fm p{margin:0;font-size:13px;line-height:18px;color:#d9d2bd;max-width:420px}#twkh .fm .nf{font-size:12px;color:#f0b90b;font-weight:700}#twkh .fm .dl{display:inline-block;font:800 14px system-ui;color:#f0b90b;text-decoration:underline;text-underline-offset:3px}#twkh .fm .dl:hover{color:#ffe27a}' +
    '#twkh .fm input,#twkh .fm textarea{width:100%;max-width:420px;background:#0b0b0d;border:1px solid #6b5316;border-radius:9px;color:#f4efe2;font:500 14px system-ui;padding:10px 12px;outline:0}#twkh .fm input:focus,#twkh .fm textarea:focus{border-color:#f0b90b}#twkh .fm textarea{height:96px;resize:none}' +
    '#twkh .fm .rw2{display:flex;gap:8px;justify-content:center}#twkh .fm .go{width:170px;height:42px;border:0;border-radius:9px;font-weight:800;font-size:14px;color:#1a1100;cursor:pointer;background:linear-gradient(180deg,#ffe27a 0%,#f0b90b 48%,#c98f00 100%)}#twkh .fm .no{width:110px;height:42px;border-radius:9px;font-weight:700;font-size:14px;color:#f0b90b;background:#0b0b0d;border:1px solid #f0b90b;cursor:pointer}#twkh .fm .fs{min-height:18px;font-size:13px;color:#f0d27a}#twkh .fm .fs.ok{color:#5be08a;font-weight:600}' +
    '@media(prefers-reduced-motion:reduce){#twkh .ov{transition:none}}';
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function api(body) {
    body = Object.assign({ lang: L }, body);
    var h = { 'Content-Type': 'application/json' }, a = {}; try { a = JSON.parse(ls('alexia-auth-v3') || '{}') || {}; } catch (e) {} if (a.token) h.Authorization = 'Bearer ' + a.token;
    return fetch('/api/novinhas/hunt', { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); });
  }
  var FT = {
    pt: { h: 'Fale com a gente', p: 'Deixe seu Discord ou e-mail e uma mensagem. Nós falamos com você direto. Não envie vídeos nem fotos por aqui.', c: 'Seu Discord ou e-mail', m: 'Mensagem (opcional)', s: 'Enviar', x: 'Voltar', ok: 'Recebido! Entraremos em contato.', e: 'Digite seu Discord ou e-mail.', er: 'Não foi possível enviar. Tente de novo.', l: 'Muitas mensagens hoje. Tente amanhã.' },
    es: { h: 'Hablá con nosotros', p: 'Dejá tu Discord o mail y un mensaje. Hablamos con vos directamente. No envíes videos ni fotos por acá.', c: 'Tu Discord o mail', m: 'Mensaje (opcional)', s: 'Enviar', x: 'Volver', ok: '¡Recibido! Te vamos a contactar.', e: 'Escribí tu Discord o mail.', er: 'No se pudo enviar. Probá de nuevo.', l: 'Muchos mensajes hoy. Probá mañana.' },
    en: { h: 'Talk to us', p: 'Leave your Discord or email and a message. We will talk to you directly. Do not send videos or photos here.', c: 'Your Discord or email', m: 'Message (optional)', s: 'Send', x: 'Back', ok: 'Received! We will contact you.', e: 'Enter your Discord or email.', er: 'Could not send. Try again.', l: 'Too many messages today. Try tomorrow.' }
  };
  function openForm() {
    if (!root) return; var f = root.querySelector('.fm'); if (!f) {
      f = document.createElement('div'); f.className = 'fm';
      f.innerHTML = '<h3></h3><p></p><a class="dl" href="https://twerkhub.lat/discord" target="_blank" rel="noopener">Discord: twerkhub.lat/discord</a><input type="text" maxlength="120" autocomplete="off"><textarea maxlength="800"></textarea><div class="rw2"><button type="button" class="go"></button><button type="button" class="no"></button></div><div class="fs" aria-live="polite"></div>';
      root.querySelector('.b').appendChild(f);
      f.querySelector('.no').onclick = function () { f.style.display = 'none'; };
      f.querySelector('.go').onclick = function () {
        var t = FT[L] || FT.pt, c = f.querySelector('input').value.trim(), st = f.querySelector('.fs'); st.className = 'fs';
        if (c.length < 3) { st.textContent = t.e; return; }
        st.textContent = '…'; f.querySelector('.go').disabled = true;
        api({ ev: 'contact', contact: c, msg: f.querySelector('textarea').value }).then(function (o) {
          f.querySelector('.go').disabled = false;
          if (o.j && o.j.ok) { st.className = 'fs ok'; st.textContent = t.ok; f.querySelector('textarea').value = ''; } else { st.textContent = o.st === 429 ? t.l : t.er; }
        }).catch(function () { f.querySelector('.go').disabled = false; st.textContent = t.er; });
      };
    }
    var t2 = FT[L] || FT.pt; f.querySelector('h3').textContent = t2.h; f.querySelector('p').textContent = t2.p; f.querySelector('input').placeholder = t2.c; f.querySelector('textarea').placeholder = t2.m; f.querySelector('.go').textContent = t2.s; f.querySelector('.no').textContent = t2.x; f.querySelector('.fs').textContent = '';
    f.style.display = 'flex'; try { f.querySelector('input').focus(); } catch (e) {}
  }
  function build() {
    var st = document.createElement('style'); st.id = 'twkhs'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'twkh'; root.className = 'notranslate'; root.setAttribute('translate', 'no'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.innerHTML = '<div class="b"><div class="top"><button type="button" class="x" aria-label="Close">&times;</button><span class="lg"><button type="button" data-l="pt">PT</button><button type="button" data-l="es">ES</button><button type="button" data-l="en">EN</button></span></div>' +
      '<canvas width="1056" height="248"></canvas>' +
      '<div class="t1" data-i="t1"></div><div class="t2" data-i="t2"></div><div class="t3" data-i="t3"></div>' +
      '<div class="cats"><div class="c c1" data-cat="content" role="radio" tabindex="0"><span class="rd"></span><div class="ch" data-i="c1h"></div><div class="ct" data-i="c1t"></div><div class="pv"></div></div>' +
      '<div class="c c2" data-cat="money" role="radio" tabindex="0"><span class="rd"></span><div class="ch" data-i="c2h"></div><div class="ct" data-i="c2t"></div><div class="lgf"><span class="bi" data-g="bn"><img src="/assets/binance-logo.svg" alt="Binance"></span><span class="pp" data-g="pp"><img src="/assets/paypal-logo-sm.png" alt="PayPal"></span></div></div></div>' +
      '<div class="t4" data-i="t4"></div><div class="cl" data-i="cl"></div><div class="cd"></div>' +
      '<label class="ck"><input type="checkbox" id="twkh-c"><span data-i="t5"></span></label><div class="rq" data-i="t6"></div>' +
      '<div class="bt"><a class="b1" href="/account"></a><button type="button" class="b2" data-i="b2"></button><button type="button" class="b3" data-i="b3"></button></div><div class="ms" id="twkh-m" aria-live="polite"></div>' +
      '<div class="ov"><div class="eg"></div><div class="ot"></div><div class="rw"><span class="plc"></span><span class="rwt"></span></div><div class="hvr" data-i="vr"></div><div class="ak"></div><div class="et" data-i="et"></div><div class="gr"></div>' +
      '<div class="pk"><span class="cn" data-i="cond"></span><div><b>&#10003;</b><span data-i="p1"></span></div><div><b>&#10003;</b><span data-i="p2"></span></div><div class="n"><b>&#10003;</b><span data-i="p3"></span></div><span class="f" data-i="p4"></span></div><button type="button" class="cx" data-i="cls"></button></div></div>';
    document.body.appendChild(root);
    root.querySelector('.gr').innerHTML = EM.map(function (s) { return '<div><img alt="" src="' + s + '"></div>'; }).join('');
    root.querySelector('.lg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; L = b.dataset.l; ls(LK, L); paint(); });
    root.querySelector('.x').onclick = function () { api({ ev: 'close', sid: sid }).catch(function () {}); dismiss(); };
    root.querySelector('.b3').onclick = function () {
      function op() { if (window.TWK_DON) window.TWK_DON.open(true); }
      if (window.TWK_DON) { op(); return; }
      var sc = document.createElement('script'); sc.src = '/assets/twk-donor-rank.js?v=20261115-r2'; sc.onload = op; document.head.appendChild(sc);
    };
    root.querySelector('.b2').onclick = function () { api({ ev: 'later', sid: sid }).catch(function () {}); dismiss(); };
    function ovOpen() { var o = root && root.querySelector('.ov'); return !!(o && o.style.display === 'flex'); }
    function closeOv() { var o = root && root.querySelector('.ov'); if (!o) return; o.style.opacity = '0'; setTimeout(function () { o.style.display = 'none'; }, 220); var t = tier, au = auth; if (t && au) setTimeout(function () { try { window.TwkCoin && window.TwkCoin.celebrate(t === 'great' ? 20 : 5, true, 'coin'); } catch (e) {} }, 400); }
    root.querySelector('.cx').onclick = closeOv;
    root.addEventListener('click', function (e) { if (e.target === root && !ovOpen()) dismiss(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && root) { if (ovOpen()) closeOv(); else dismiss(); } });
    root.querySelector('#twkh-c').addEventListener('change', onCheck);
    root.querySelector('.b1').addEventListener('click', function () { api({ ev: 'reg', sid: sid }).catch(function () {}); });
    root.querySelector('.b1').addEventListener('click', function (e) { if (auth) { e.preventDefault(); var c = root.querySelector('#twkh-c'); if (!cat) { msg('pick'); return; } if (cat === 'money') { var go2 = function () { location.href = '/paymentmethods/?item=donate'; }; if (joined) { go2(); } else { api({ join: 1, cat: cat }).then(function (o) { if (o.j && o.j.ok) { joined = true; ls(JK, '1'); } go2(); }).catch(go2); } return; } if (!c.checked) { c.checked = true; onCheck({ target: c }); } openForm(); } else { if (!cat) { e.preventDefault(); msg('pick'); return; } ls(PK, '1'); } });
    previews(); egg(); setCat(cat, false); [].forEach.call(root.querySelectorAll('.c'), function (e) { e.addEventListener('click', function () { api({ ev: e.dataset.cat === 'money' ? 'cat2' : 'cat1', sid: sid }).catch(function () {}); setCat(e.dataset.cat, true); if (joined && auth) api({ join: 1, cat: cat }).catch(function () {}); }); e.addEventListener('keydown', function (k) { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); e.click(); } }); }); paint(); tick(); tmr = setInterval(tick, 1000);
    if (joined) { root.querySelector('#twkh-c').checked = true; msg('ok'); }
    api({ ev: 'play', sid: sid }).catch(function () {});
  }
  function setCat(c, save) { cat = c; if (save) ls('twk-hunt-cat', c); if (!root) return; [].forEach.call(root.querySelectorAll('.c'), function (e) { var on = e.dataset.cat === c; e.classList.toggle('on', on); e.setAttribute('aria-checked', on ? 'true' : 'false'); }); }
  function msg(k) { var m = root && root.querySelector('#twkh-m'); if (!m) return; m.className = 'ms' + (k === 'ok' ? ' ok' : ''); m.dataset.k = k || ''; m.textContent = k ? T[L][k] : ''; }
  function paint() {
    var t = T[L]; [].forEach.call(root.querySelectorAll('[data-i]'), function (el) { el.textContent = t[el.dataset.i]; });
    root.querySelector('.b1').textContent = auth ? t.b1a : t.b1;
    [].forEach.call(root.querySelectorAll('.lg button'), function (b) { b.classList.toggle('on', b.dataset.l === L); });
    var m = root.querySelector('#twkh-m'); if (m && m.dataset.k) msg(m.dataset.k);
    if (tier) fillOv(); tick();
  }
  function tick() {
    if (!root) return; var d = Math.max(0, END - Date.now()), s = Math.floor(d / 1000), v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    root.querySelector('.cd').innerHTML = v.map(function (x, i) { return '<div class="u"><b>' + p2(x) + '</b><span>' + T[L].u[i] + '</span></div>'; }).join('');
  }
  function dismiss() { ls(XK, String(Date.now())); ls('twk-hunt-xu', who); clearInterval(tmr); stopGame(); if (root) { root.remove(); root = null; } var s = document.getElementById('twkhs'); if (s) s.remove(); clearTimeout(rep); rep = setTimeout(function () { if (!root && Date.now() < END) start(); }, EVERY + 1000); }
  function onCheck(e) {
    var cb = e.target;
    if (cb.checked && !cat) { cb.checked = false; msg('pick'); return; }
    if (!auth) { cb.checked = false; ls(PK, '1'); msg('need'); return; }
    api({ join: cb.checked ? 1 : 0, cat: cat }).then(function (o) { if (o.j && o.j.ok) { joined = !!o.j.joined; ls(JK, joined ? '1' : null); msg(joined ? 'ok' : ''); } else { cb.checked = !cb.checked; msg('err'); } }).catch(function () { cb.checked = !cb.checked; msg('err'); });
  }
  /* previews reales de canales (Categoria 1) */
  function previews() {
    var box = root.querySelector('.pv'), i, c = '';
    var hs = [330, 200, 45, 280, 160]; for (i = 0; i < 5; i++) { var fb = 'linear-gradient(160deg,hsl(' + hs[i] + ',50%,30%),hsl(' + hs[i] + ',55%,12%))'; c += '<i data-p="1" data-fb="' + fb + '" style="background-image:' + fb + '"></i>'; } box.innerHTML = c;
    /* previews HOT animados: los mismos clips cortos (marcados a mano) que se ven en la fila de Novinhas; si falla, quedan los posters estaticos */
    fetch('/api/novinhas/featured?row=5', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!root || !j || !j.items || !j.items.length) throw 0;
      [].forEach.call(box.children, function (el, k) {
        var x = j.items[k]; if (!x) return; el.style.backgroundImage = 'url(' + x.poster + '),' + el.dataset.fb;
        var v = document.createElement('video'); v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'metadata'; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.setAttribute('disablePictureInPicture', ''); v.src = x.src; v.poster = x.poster;
        v.addEventListener('playing', function () { v.style.opacity = '1'; }); v.style.opacity = '0'; el.insertBefore(v, el.firstChild); var pl = v.play(); if (pl && pl.catch) pl.catch(function () {});
      });
    }).catch(function () { prevStatic(); });
  }
  function prevStatic() {
    var box = root && root.querySelector('.pv'); if (!box) return;
    fetch('/novinhas/channels-live.json', { cache: 'force-cache' }).then(function (r) { return r.json(); }).then(function (a) {
      if (!root || !a || !a.length) return; a = a.slice().sort(function () { return Math.random() - .5; }).slice(0, 5);
      [].forEach.call(box.children, function (el, k) { var ch = a[k]; if (!ch) return; el.style.backgroundImage = 'url(' + (ch.img || ('/api/novinhas/file?k=' + encodeURIComponent(ch.slug) + '/previews/poster-' + String(ch.poster || 1).padStart(2, '0') + '.webp')) + '),' + el.dataset.fb; });
    }).catch(function () {});
  }
  /* ---- easter egg oculto ---- */
  var A = null, ammo = 3, over = false, fin = false, pv = 0, ft = null, tier = null, raf = 0, hit = { bu: false, bn: false, pp: false };
  function ac() { if (!A) { try { A = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (A && A.state === 'suspended') A.resume(); return A; }
  function tone(f1, f2, d, ty, v) { var a = ac(); if (!a) return; var o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = ty || 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v || .3, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02); }
  function shot() { var a = ac(); if (!a) return; var n = Math.floor(a.sampleRate * .18), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0), i; for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = 2400; g.gain.value = .55; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); tone(150, 40, .16, 'sine', .5); }
  function burst(el) {
    var r = el.getBoundingClientRect(), b = root.querySelector('.b').getBoundingClientRect(), x0 = r.left - b.left + r.width / 2, y0 = r.top - b.top + r.height / 2, c = ['#f0b90b', '#ffd75a', '#fff', '#ff5fd6', '#f10aa8'], i;
    for (i = 0; i < 18; i++) {
      var s = document.createElement('span'), a = Math.random() * 6.283, d = 18 + Math.random() * 44, z = 3 + Math.random() * 4;
      s.style.cssText = 'position:absolute;pointer-events:none;z-index:9;width:' + z + 'px;height:' + z + 'px;left:' + x0 + 'px;top:' + y0 + 'px;background:' + c[i % 5];
      root.querySelector('.b').appendChild(s);
      if (s.animate) { var an = s.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 16) + 'px)', opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'ease-out' }); an.onfinish = (function (n) { return function () { n.remove(); }; })(s); } else s.remove();
    }
  }
  function great() { return pv >= 3 || (hit.bu && hit.bn && hit.pp); }
  function sched() { clearTimeout(ft); ft = setTimeout(finish, (ammo <= 0 || great()) ? 900 : 3500); }
  function use() { if (over || ammo <= 0) return false; ammo--; shot(); return true; }
  function pop(el, key) { if (!root || el.dataset.dead || !use()) return; el.dataset.dead = '1'; burst(el); tone(660, 990, .22, 'sine', .35); el.style.opacity = '0'; el.style.pointerEvents = 'none'; if (key === 'pv') pv++; else hit[key] = true; sched(); }
  function stopGame() { clearTimeout(ft); cancelAnimationFrame(raf); }
  function egg() {
    var cv = root.querySelector('canvas'), cx = cv.getContext('2d'), W = 528, H = 124, dpr = 2, P = new Path2D(BUNNY), inside = false;
    var aim = { x: W / 2, y: H / 2 }, tg = { x: W / 2, y: H / 2 }, marks = [], parts = [], BX = W / 2, WALL = 98, S = .36, t0 = performance.now() + 600, ph = 'hid', dur = 900, peek = 0, last = performance.now();
    function ease(x) { return x * x * (3 - 2 * x); }
    function step(now) { var e = now - t0; if (hit.bu || over) { peek = 0; return; } if (ph === 'hid') { peek = 0; if (e > dur) { ph = 'up'; t0 = now; dur = 140; } } else if (ph === 'up') { peek = ease(Math.min(1, e / dur)); if (e > dur) { ph = 'stay'; t0 = now; dur = 380 + Math.random() * 320; } } else if (ph === 'stay') { peek = 1; if (e > dur) { ph = 'down'; t0 = now; dur = 130; } } else { peek = 1 - ease(Math.min(1, e / dur)); if (e > dur) { ph = 'hid'; t0 = now; dur = 800 + Math.random() * 1600; } } }
    function bunny(now) { var py = WALL - 64 * peek, sw = Math.sin(now / 260) * 1.6 * peek; cx.save(); cx.translate(BX - 40 * S + sw, py); cx.scale(S, S); cx.save(); cx.translate(3.2, 4.2); cx.fillStyle = '#7a0052'; cx.fill(P); cx.restore(); var g = cx.createLinearGradient(0, 0, 40, 190); g.addColorStop(0, '#ff5fd6'); g.addColorStop(.55, '#f10aa8'); g.addColorStop(1, '#b3007a'); cx.fillStyle = g; cx.fill(P); cx.fillStyle = '#fff'; cx.beginPath(); cx.ellipse(88, 91, 7.2, 8.2, 0, 0, 6.3); cx.fill(); cx.fillStyle = '#2a0020'; cx.beginPath(); cx.ellipse(90, 92, 3.6, 4.6, 0, 0, 6.3); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(91, 90, 1.2, 0, 6.3); cx.fill(); cx.strokeStyle = '#3a0028'; cx.lineWidth = 2.1; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(80, 82); cx.lineTo(76, 76); cx.moveTo(87, 80); cx.lineTo(86, 73); cx.moveTo(94, 82); cx.lineTo(97, 76); cx.stroke(); cx.fillStyle = '#8a005c'; cx.beginPath(); cx.ellipse(118, 100, 3.2, 2.6, 0, 0, 6.3); cx.fill(); cx.restore(); }
    var ST = []; for (var si = 0; si < 26; si++) ST.push([(si * 97.3 + 13) % W, (si * 41.7 + 7) % 70, .6 + (si % 3) * .5, si * 1.3]);
    function scene(now) {
      var g = cx.createRadialGradient(W / 2, 62, 8, W / 2, 62, 250); g.addColorStop(0, 'rgba(240,185,11,.20)'); g.addColorStop(.55, 'rgba(240,185,11,.05)'); g.addColorStop(1, 'rgba(240,185,11,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      ST.forEach(function (t) { cx.globalAlpha = .25 + .55 * Math.abs(Math.sin(now / 900 + t[3])); cx.fillStyle = '#ffe9a3'; cx.beginPath(); cx.arc(t[0], t[1], t[2], 0, 6.3); cx.fill(); }); cx.globalAlpha = 1;
      [70, W - 70].forEach(function (x, k) { var fl = .85 + .15 * Math.sin(now / 230 + k * 2), lg = cx.createRadialGradient(x, 62, 2, x, 62, 34); lg.addColorStop(0, 'rgba(255,214,102,' + (.75 * fl) + ')'); lg.addColorStop(1, 'rgba(240,185,11,0)'); cx.fillStyle = lg; cx.fillRect(x - 36, 26, 72, 72); cx.strokeStyle = '#6b5316'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, WALL); cx.lineTo(x, 66); cx.stroke(); cx.fillStyle = '#ffe9a3'; cx.beginPath(); cx.roundRect ? cx.roundRect(x - 5, 56, 10, 12, 3) : cx.rect(x - 5, 56, 10, 12); cx.fill(); });
    }
    function wall() { var h = H - WALL, g = cx.createLinearGradient(0, WALL, 0, H); g.addColorStop(0, '#2c2411'); g.addColorStop(1, '#120f07'); cx.fillStyle = g; cx.fillRect(0, WALL, W, h); cx.strokeStyle = '#4a3b12'; cx.lineWidth = 1; cx.beginPath(); var r, c; for (r = 0; r < 3; r++) { cx.moveTo(0, WALL + 9 + r * 9); cx.lineTo(W, WALL + 9 + r * 9); for (c = (r % 2) * 22; c < W; c += 44) { cx.moveTo(c, WALL + r * 9); cx.lineTo(c, WALL + 9 + r * 9); } } cx.stroke(); cx.strokeStyle = '#f0b90b'; cx.lineWidth = 1.6; cx.globalAlpha = .75; cx.beginPath(); cx.moveTo(0, WALL + .8); cx.lineTo(W, WALL + .8); cx.stroke(); cx.globalAlpha = 1; }
    function reticle() { var x = aim.x, y = aim.y; cx.save(); cx.strokeStyle = '#f0b90b'; cx.lineWidth = 1.8; cx.beginPath(); cx.arc(x, y, 16, 0, 6.3); cx.stroke(); cx.lineWidth = 1; cx.globalAlpha = .7; cx.beginPath(); cx.arc(x, y, 7, 0, 6.3); cx.stroke(); cx.globalAlpha = 1; cx.lineWidth = 1.8; cx.beginPath(); cx.moveTo(x - 26, y); cx.lineTo(x - 9, y); cx.moveTo(x + 9, y); cx.lineTo(x + 26, y); cx.moveTo(x, y - 26); cx.lineTo(x, y - 9); cx.moveTo(x, y + 9); cx.lineTo(x, y + 26); cx.stroke(); cx.fillStyle = '#ff3b3b'; cx.beginPath(); cx.arc(x, y, 2, 0, 6.3); cx.fill(); cx.restore(); }
    function frame(now) { if (!root) return; var dt = Math.min(40, now - last); last = now; step(now); aim.x += (tg.x - aim.x) * .16 + Math.sin(now / 310) * .4; aim.y += (tg.y - aim.y) * .16 + Math.cos(now / 270) * .4; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); scene(now); if (!hit.bu) bunny(now); wall(); marks.forEach(function (m) { cx.fillStyle = '#6b5316'; cx.beginPath(); cx.arc(m.x, m.y, 3, 0, 6.3); cx.fill(); cx.fillStyle = '#000'; cx.beginPath(); cx.arc(m.x, m.y, 1.5, 0, 6.3); cx.fill(); }); parts = parts.filter(function (p) { return p.l > 0; }); parts.forEach(function (p) { p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.vy += .1; p.l -= dt; cx.globalAlpha = Math.max(0, p.l / p.m); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s); }); cx.globalAlpha = 1; if (inside && !over) reticle(); raf = requestAnimationFrame(frame); }
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    cv.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { inside = true; cv.style.cursor = 'none'; } });
    cv.addEventListener('pointerleave', function () { inside = false; });
    cv.addEventListener('pointermove', function (e) { var p = pos(e); tg.x = p.x; tg.y = p.y; });
    cv.addEventListener('pointerdown', function (e) {
      var p = pos(e); tg.x = p.x; tg.y = p.y; inside = true; if (e.pointerType !== 'mouse') { aim.x = p.x; aim.y = p.y; }
      if (!use()) return; var x = aim.x, y = aim.y, top = WALL - 64 * peek + 6; aim.y -= 6;
      if (!hit.bu && peek > .35 && Math.abs(x - BX) < 30 && y > top && y < WALL - 1) { hit.bu = true; tone(660, 990, .22, 'sine', .35); var c = ['#f0b90b', '#ffd75a', '#ff5fd6', '#fff', '#f10aa8'], i; for (i = 0; i < 30; i++) { var a = Math.random() * 6.283, s = 1.5 + Math.random() * 3.5; parts.push({ x: BX, y: WALL - 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, l: 800, m: 800, s: 2 + Math.random() * 4, c: c[i % 5] }); } } else marks.push({ x: x, y: y });
      sched();
    });
    root.querySelector('.pv').addEventListener('pointerdown', function (e) { var t = e.target.closest('[data-p]'); if (t) pop(t, 'pv'); });
    root.querySelector('[data-g="bn"]').addEventListener('pointerdown', function (e) { pop(e.currentTarget, 'bn'); });
    root.querySelector('[data-g="pp"]').addEventListener('pointerdown', function (e) { pop(e.currentTarget, 'pp'); });
    raf = requestAnimationFrame(frame);
  }
  function fmtPct(n) { var s = (Math.max(0.1, n)).toFixed(1); return L === 'en' ? s : s.replace('.', ','); }
  var pct = null;
  function fillOv() {
    var o = T[L], ov = root.querySelector('.ov'); ov.querySelector('.ot').textContent = tier === 'great' ? o.o2 : o.o1;
    ov.querySelector('.rwt').textContent = tier === 'great' ? o.r20 : o.r5; ov.querySelector('.hvr').classList.toggle('on', tier === 'great');
    ov.querySelector('.eg').textContent = pct === null ? '' : o.eg.replace('X', fmtPct(pct));
    ov.querySelector('.ak').innerHTML = auth ? o.ak : (o.gst + ' <a href="/account">' + o.b1 + '</a>');
  }
  function finish() {
    if (fin || !root) return; var tr = great() ? 'great' : (hit.bu ? 'bunny' : null);
    if (!tr) { if (ammo <= 0) over = true; return; }
    fin = true; over = true; tier = tr; ls(EK, tr); var ev = tr === 'great' ? 'great' : 'hit';
    var go = function (res) {
      if (res && res.j && res.j.auth) { try { window.dispatchEvent(new CustomEvent('twk-platinum-changed', { detail: { platinum: res.j.platinum, voucher: res.j.voucher } })); } catch (e) {} } else { ls(PK + '-egg', ev); }
      fetch('/api/novinhas/hunt?stats=1', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) { pct = tr === 'great' ? s.pctGreat : s.pct; if (root) fillOv(); }).catch(function () { pct = 0.1; if (root) fillOv(); });
    };
    (hit.bu && tr === 'great' ? api({ ev: 'hit', sid: sid }).catch(function () {}) : Promise.resolve()).then(function () { return api({ ev: ev, sid: sid }); }).then(go).catch(function () { go(null); });
    tone(880, 1760, .4, 'sine', .2); setTimeout(function () { tone(1320, 1760, .3, 'triangle', .2); }, 180);
    var ov = root.querySelector('.ov'); fillOv(); ov.style.display = 'flex'; setTimeout(function () { ov.style.opacity = '1'; }, 20);
  }
  function afterGate(run) {
    function gone() { return !document.getElementById('twk18'); }
    if (gone()) { run(); return; }
    var mo = new MutationObserver(function () { if (gone()) { mo.disconnect(); setTimeout(run, 350); } });
    mo.observe(document.body, { childList: true });
  }
  function start() {
    var ah = {}; try { var au0 = JSON.parse(ls('alexia-auth-v3') || '{}') || {}; if (au0.token) ah.Authorization = 'Bearer ' + au0.token; } catch (e) {}
    fetch('/api/novinhas/hunt', { credentials: 'same-origin', cache: 'no-store', headers: ah }).then(function (r) { return r.ok ? r.json() : { auth: false }; }).catch(function () { return { auth: false }; }).then(function (j) {
      auth = !!j.auth; who = auth ? String(j.uid || 'u') : 'g'; joined = !!j.joined; if (j.cat) { cat = j.cat; ls('twk-hunt-cat', cat); }
      if (auth && !joined && ls(PK) === '1') { ls(PK, null); api({ join: 1, cat: cat || 'content' }).then(function (o) { if (o.j && o.j.ok) { joined = true; ls(JK, '1'); } afterGate(build); }).catch(function () {}); return; }
      var force = /[?&]cazador=1(&|$)/.test(location.search); /* enlace de prueba del dueño: siempre abre */
      if (joined && !force) return; /* ya eligio ser donador (cat. 1 o 2): no vuelve a verlo */
      var x = +ls(XK) || 0; if (!force && x >= FORCE && Date.now() - x < EVERY && (ls('twk-hunt-xu') || 'g') === who) return;
      afterGate(build);
    });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  /* panel sticky de donadores en todo el sitio (menos admin/pagos/cuenta); se cierra con la X y queda una pastilla */
  if (!/^\/(admin|paymentmethods|account|login|auth)/.test(location.pathname)) setTimeout(function () { if (window.TWK_DON) return; var sc = document.createElement('script'); sc.src = '/assets/twk-donor-rank.js?v=20261115-r2'; document.head.appendChild(sc); }, 2500);
})();
