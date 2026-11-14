/* Novinhas: texto del home + boton "Busca / Identificacao" (home y /novinhas/). PT por defecto, con PT / EN / ES.
   Recompensa en tokens: 50 por nombre, 100 por video. */
(function () {
  if (window.__nvIdent) return; window.__nvIdent = true;
  var T = {
    pt: {
      p1: 'Antes do OnlyFans, o YouTube era o palco. As dançarinas do funk brasileiro construíram grandes audiências com vídeos ousados e picantes que viviam a um strike do banimento — e quando os banimentos chegaram, canais inteiros sumiram da noite para o dia. Quando um canal é apagado, ele se perde para sempre, a menos que alguém tenha guardado uma cópia. <strong>Nós guardamos.</strong>',
      p2: 'Tem um vídeo e quer saber quem é a dançarina? Quer ampliar a coleção de uma das suas favoritas? Envie: nós a identificamos e respondemos com a coleção completa dela. Se ainda não tivermos, ela entra na nossa lista de busca e nós vamos atrás. Cada nome que você enviar rende <strong>50 tokens</strong> e cada vídeo rende <strong>100 tokens</strong> — e cada envio ajuda a resgatar um canal antes que ele desapareça.',
      real: 'O arquivo tem <b><i data-nv="tot-ch">…</i></b> dançarinas e <b><i data-nv="tot-vd">…</i></b> vídeos — <b><i data-nv="done-ch">…</i></b> dançarinas e <b><i data-nv="done-vd">…</i></b> vídeos já recuperados.',
      btn: 'Busca / Identificação', title: 'Busca / Identificação',
      intro: 'Tem um vídeo e quer saber quem é a dançarina? Quer ampliar a coleção de uma das suas favoritas? Envie: nós a identificamos e respondemos com a coleção completa dela. Se ainda não tivermos, ela entra na nossa lista de busca. <b>50 tokens por nome</b> e <b>100 tokens por vídeo</b>.',
      cv: 'Vídeos', cn: 'Nomes', tabN: 'Sugerir um nome', tabV: 'Enviar um vídeo',
      lN: 'Nome da dançarina / criadora', phN: 'Nome como é conhecida no YouTube ou Instagram', lH: '@ ou canal (opcional)', phH: '@usuario ou nome do canal',
      lF: 'Arquivo de vídeo (máx. 80 MB)', lVN: 'Nome(s) conhecido(s) da dançarina (opcional)', phVN: 'Se você sabe quem ela é',
      adults: 'Confirmo que todas as pessoas neste vídeo são maiores de 18 anos. Vídeos de menores nunca são aceitos.',
      sendN: 'Enviar · ganhar 50 tokens', sendV: 'Enviar · ganhar 100 tokens',
      sending: 'Enviando...', uploading: 'Enviando vídeo...', login: 'Crie uma conta gratuita para ganhar tokens pelas suas contribuições.',
      ok50: 'Recebido! +50 tokens adicionados ao seu saldo.', ok100: 'Recebido! +100 tokens adicionados ao seu saldo.',
      e_login: 'Entre ou crie uma conta gratuita primeiro.', e_limit: 'Muitos envios seguidos. Tente de novo em uma hora.', e_name_short: 'Escreva o nome (mínimo 3 letras).', e_duplicate: 'Você já enviou esse nome.', e_no_file: 'Escolha um arquivo de vídeo.', e_adults_required: 'Confirme que todos no vídeo têm 18 anos ou mais.', e_bad_type: 'Tipo de arquivo não suportado (use MP4, MOV ou WebM).', e_too_big: 'O vídeo é grande demais (máx. 80 MB).', e_generic: 'Algo deu errado, tente de novo.', e_net: 'Erro de conexão, tente de novo.'
    },
    en: {
      p1: 'Before OnlyFans, YouTube was the stage. Brazilian funk dancers built huge audiences with bold, spicy videos that lived one strike away from a ban — and when the bans hit, entire channels vanished overnight. Once a channel is deleted, it is gone for good, unless someone kept a copy. <strong>We did.</strong>',
      p2: 'Have a video and want to know who the dancer is? Want to grow the collection of one of your favorites? Send it in: we identify her and reply with her complete collection. If we do not have it yet, we add her to our search list and go get it. Every name you send earns you <strong>50 tokens</strong> and every video earns <strong>100 tokens</strong> — and every one you send helps rescue a channel before it disappears.',
      real: 'The archive holds <b><i data-nv="tot-ch">…</i></b> dancers and <b><i data-nv="tot-vd">…</i></b> videos — <b><i data-nv="done-ch">…</i></b> dancers and <b><i data-nv="done-vd">…</i></b> videos already recovered.',
      btn: 'Search / Identification', title: 'Search / Identification',
      intro: 'Have a video and want to know who the dancer is? Want to grow the collection of one of your favorites? Send it in: we identify her and reply with her complete collection. If we do not have it yet, she goes on our search list. <b>50 tokens per name</b> and <b>100 tokens per video</b>.',
      cv: 'Videos', cn: 'Names', tabN: 'Suggest a name', tabV: 'Send a video',
      lN: 'Dancer / creator name', phN: 'Name as known on YouTube or Instagram', lH: '@ or channel (optional)', phH: '@handle or channel name',
      lF: 'Video file (max 80 MB)', lVN: 'Known name(s) of the dancer (optional)', phVN: 'If you know who she is',
      adults: 'I confirm everyone in this video is an adult (18+). Videos of minors are never accepted.',
      sendN: 'Send · earn 50 tokens', sendV: 'Send · earn 100 tokens',
      sending: 'Sending...', uploading: 'Uploading video...', login: 'Create a free account to earn tokens for your contributions.',
      ok50: 'Received! +50 tokens added to your balance.', ok100: 'Received! +100 tokens added to your balance.',
      e_login: 'Please log in or create a free account first.', e_limit: 'Too many submissions in a row. Try again in an hour.', e_name_short: 'Write the name (at least 3 letters).', e_duplicate: 'You already sent that name.', e_no_file: 'Choose a video file.', e_adults_required: 'Please confirm everyone in the video is 18+.', e_bad_type: 'That file type is not supported (use MP4, MOV or WebM).', e_too_big: 'The video is too big (max 80 MB).', e_generic: 'Something went wrong, try again.', e_net: 'Connection error, try again.'
    },
    es: {
      p1: 'Antes de OnlyFans, YouTube era el escenario. Las bailarinas del funk brasileño armaron grandes audiencias con videos atrevidos que vivían a un strike del ban, y cuando llegaron los bans, canales enteros desaparecieron de un día para otro. Cuando se borra un canal, se pierde para siempre, salvo que alguien guarde una copia. <strong>Nosotros la guardamos.</strong>',
      p2: '¿Tenés un video y querés saber quién es la bailarina? ¿Querés ampliar la colección de una de tus favoritas? Mandalo: la identificamos y te respondemos con su colección completa. Si todavía no la tenemos, la sumamos a la lista de búsqueda y vamos por ella. Cada nombre que mandes te da <strong>50 tokens</strong> y cada video te da <strong>100 tokens</strong>, y cada envío ayuda a rescatar un canal antes de que desaparezca.',
      real: 'El archivo tiene <b><i data-nv="tot-ch">…</i></b> bailarinas y <b><i data-nv="tot-vd">…</i></b> videos — <b><i data-nv="done-ch">…</i></b> bailarinas y <b><i data-nv="done-vd">…</i></b> videos ya recuperados.',
      btn: 'Búsqueda / Identificación', title: 'Búsqueda / Identificación',
      intro: '¿Tenés un video y querés saber quién es la bailarina? ¿Querés ampliar la colección de una de tus favoritas? Mandalo: la identificamos y te respondemos con su colección completa. Si todavía no la tenemos, entra en nuestra lista de búsqueda. <b>50 tokens por nombre</b> y <b>100 tokens por video</b>.',
      cv: 'Videos', cn: 'Nombres', tabN: 'Sugerir un nombre', tabV: 'Enviar un video',
      lN: 'Nombre de la bailarina / creadora', phN: 'Nombre como se la conoce en YouTube o Instagram', lH: '@ o canal (opcional)', phH: '@usuario o nombre del canal',
      lF: 'Archivo de video (máx. 80 MB)', lVN: 'Nombre(s) conocido(s) de la bailarina (opcional)', phVN: 'Si sabés quién es',
      adults: 'Confirmo que todas las personas de este video son mayores de 18 años. Nunca se aceptan videos de menores.',
      sendN: 'Enviar · ganar 50 tokens', sendV: 'Enviar · ganar 100 tokens',
      sending: 'Enviando...', uploading: 'Subiendo video...', login: 'Creá una cuenta gratis para ganar tokens por tus aportes.',
      ok50: '¡Recibido! +50 tokens sumados a tu saldo.', ok100: '¡Recibido! +100 tokens sumados a tu saldo.',
      e_login: 'Iniciá sesión o creá una cuenta gratis primero.', e_limit: 'Demasiados envíos seguidos. Probá de nuevo en una hora.', e_name_short: 'Escribí el nombre (mínimo 3 letras).', e_duplicate: 'Ya enviaste ese nombre.', e_no_file: 'Elegí un archivo de video.', e_adults_required: 'Confirmá que todos en el video son mayores de 18.', e_bad_type: 'Ese tipo de archivo no es compatible (usá MP4, MOV o WebM).', e_too_big: 'El video es demasiado grande (máx. 80 MB).', e_generic: 'Algo salió mal, probá de nuevo.', e_net: 'Error de conexión, probá de nuevo.'
    }
  };
  var lang = 'pt'; try { var sv = localStorage.getItem('nvLang'); if (T[sv]) lang = sv; } catch (e) {}
  var tab = 'name', stats = null, lastMsg = null, counts = { videos: 0, names: 0 }, $ = function (i) { return document.getElementById(i); };
  function t(k) { return T[lang][k]; }
  function f(n) { return Number(n).toLocaleString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-AR' : 'pt-BR'); }
  function fillNums() { if (!stats) return; var m = { 'tot-ch': stats.channels.total, 'tot-vd': stats.videos.total, 'done-ch': stats.channels.done, 'done-vd': stats.videos.done }; for (var k in m) { var e = document.querySelector('[data-nv="' + k + '"]'); if (e) e.textContent = f(m[k]); } }
  /* ---------- CSS ---------- */
  var css = document.createElement('style');
  css.textContent = '.nv-lang{display:flex;gap:6px;margin:0 0 12px}.nv-lang button,.nvi .lg button{height:30px;min-width:44px;padding:0 10px;border:0;border-radius:8px;font:800 11px system-ui;letter-spacing:.1em;cursor:pointer;color:#f5e6b3;background:linear-gradient(180deg,#2a2a36,#16161d);box-shadow:0 0 0 1.5px #6b5a22 inset}.nv-lang button.on,.nvi .lg button.on{background:linear-gradient(180deg,#ffe27a,#f0b90b 55%,#c98f00);color:#1a1100;box-shadow:none}.nvi .lg{display:flex;gap:6px;margin:0 0 10px}.nvi-bg{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;padding:16px}.nvi-bg.on{display:flex}.nvi{width:min(520px,100%);max-height:92vh;overflow:auto;background:#101014;border:1.5px solid #6b5a22;border-radius:18px;padding:22px;color:#fff;font:14px/1.5 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.7)}.nvi h3{margin:0 0 4px;font:400 26px/1 Anton,Impact,sans-serif;letter-spacing:.04em;color:#ffe27a}.nvi p{margin:6px 0 12px;color:#cfcfd8}.nvi .tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.nvi .tabs button,.nvi .go{height:44px;border:0;border-radius:12px;font:800 12px system-ui;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#f5e6b3;background:linear-gradient(180deg,#2a2a36,#16161d);box-shadow:0 0 0 1.5px #6b5a22 inset}.nvi .tabs button.on,.nvi .go{background:linear-gradient(180deg,#ffe27a,#f0b90b 55%,#c98f00);color:#1a1100;box-shadow:0 4px 14px rgba(0,0,0,.45)}.nvi .go{width:100%;margin-top:6px}.nvi .go[disabled]{opacity:.5;cursor:default}.nvi input[type=text],.nvi input[type=file]{width:100%;box-sizing:border-box;height:44px;border-radius:12px;border:1.5px solid #3a3a46;background:#16161d;color:#fff;padding:0 12px;margin:4px 0 10px;font:14px system-ui}.nvi input[type=file]{padding:9px 10px;height:auto}.nvi label{font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#e8b84a}.nvi .chk{display:flex;gap:8px;align-items:flex-start;margin:4px 0 12px;font-size:13px;text-transform:none;letter-spacing:0;color:#cfcfd8;font-weight:400}.nvi .chk input{margin-top:3px}.nvi .cnt{display:flex;justify-content:space-between;font-weight:700;color:#f5e6b3;margin:0 0 6px}.nvi .msg{min-height:20px;margin:8px 0 0;font-weight:700}.nvi .msg.ok{color:#19d3b5}.nvi .msg.er{color:#ff6b6b}.nvi .x{float:right;background:none;border:0;color:#aaa;font-size:26px;line-height:1;cursor:pointer}';
  document.head.appendChild(css);
  /* ---------- modal ---------- */
  var bg = document.createElement('div'); bg.className = 'nvi-bg';
  bg.innerHTML = '<div class="nvi" role="dialog" aria-modal="true"><button class="x" type="button" aria-label="Close">&times;</button><div class="lg"><button type="button" data-l="pt">PT</button><button type="button" data-l="en">EN</button><button type="button" data-l="es">ES</button></div><h3 data-m="title"></h3><p data-m="intro"></p><div class="cnt"><span id="nvi-cv"></span><span id="nvi-cn"></span></div><div class="tabs"><button type="button" data-t="name" data-m="tabN"></button><button type="button" data-t="video" data-m="tabV"></button></div><div id="nvi-name"><label for="nvi-n" data-m="lN"></label><input id="nvi-n" type="text" maxlength="80" autocomplete="off" data-ph="phN"><label for="nvi-h" data-m="lH"></label><input id="nvi-h" type="text" maxlength="80" autocomplete="off" data-ph="phH"></div><div id="nvi-video" style="display:none"><label for="nvi-f" data-m="lF"></label><input id="nvi-f" type="file" accept="video/*"><label for="nvi-vn" data-m="lVN"></label><input id="nvi-vn" type="text" maxlength="160" autocomplete="off" data-ph="phVN"><label class="chk"><input id="nvi-a" type="checkbox"><span data-m="adults"></span></label></div><button type="button" class="go" id="nvi-go"></button><div class="msg" id="nvi-m"></div></div>';
  document.body.appendChild(bg);
  function msg(k, c) { lastMsg = k ? { k: k, c: c } : null; var m = $('nvi-m'); m.textContent = k ? t(k) : ''; m.className = 'msg ' + (c || ''); }
  function paintCounts() { $('nvi-cv').textContent = t('cv') + ' ' + counts.videos; $('nvi-cn').textContent = t('cn') + ' ' + counts.names; }
  function apply() {
    document.documentElement.setAttribute('data-nvlang', lang);
    [].forEach.call(document.querySelectorAll('[data-i]'), function (e) { e.innerHTML = t(e.getAttribute('data-i')); });
    [].forEach.call(bg.querySelectorAll('[data-m]'), function (e) { e.innerHTML = t(e.getAttribute('data-m')); });
    [].forEach.call(bg.querySelectorAll('[data-ph]'), function (e) { e.placeholder = t(e.getAttribute('data-ph')); });
    [].forEach.call(document.querySelectorAll('.nv-lang button,.nvi .lg button'), function (b) { b.classList.toggle('on', b.dataset.l === lang); });
    $('nvi-go').textContent = t(tab === 'name' ? 'sendN' : 'sendV'); paintCounts(); fillNums(); if (lastMsg) msg(lastMsg.k, lastMsg.c);
  }
  function setLang(l) { if (!T[l]) return; lang = l; try { localStorage.setItem('nvLang', l); } catch (e) {} apply(); }
  /* selector de idioma en el texto del home */
  var nt = document.querySelector('#novinhas .nt'); 
  if (nt && !nt.querySelector('.nv-lang')) { var bar = document.createElement('div'); bar.className = 'nv-lang'; bar.innerHTML = '<button type="button" data-l="pt">PT</button><button type="button" data-l="en">EN</button><button type="button" data-l="es">ES</button>'; var firstP = nt.querySelector('p'); if (firstP) nt.insertBefore(bar, firstP); }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.nv-lang button,.nvi .lg button'); if (b) setLang(b.dataset.l); });
  /* estadisticas reales */
  if (document.querySelector('[data-i="real"]')) fetch('/api/novinhas/stats').then(function (r) { return r.json(); }).then(function (d) { stats = d; fillNums(); }).catch(function () {});
  function status() { fetch('/api/novinhas/identify', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) { if (!d.auth) msg('login', 'er'); else msg(''); if (d.videos != null) { counts = { videos: d.videos, names: d.names }; paintCounts(); } }).catch(function () {}); }
  function open(e) { if (e) e.preventDefault(); bg.classList.add('on'); status(); }
  function close() { bg.classList.remove('on'); }
  bg.querySelector('.x').onclick = close; bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  [].forEach.call(bg.querySelectorAll('.tabs button'), function (b) { b.onclick = function () { tab = b.dataset.t; [].forEach.call(bg.querySelectorAll('.tabs button'), function (x) { x.classList.toggle('on', x === b); }); $('nvi-name').style.display = tab === 'name' ? '' : 'none'; $('nvi-video').style.display = tab === 'video' ? '' : 'none'; $('nvi-go').textContent = t(tab === 'name' ? 'sendN' : 'sendV'); msg(''); }; });
  bg.querySelector('.tabs button').classList.add('on');
  $('nvi-go').onclick = function () {
    var fd = new FormData(), btn = $('nvi-go'); fd.append('kind', tab);
    if (tab === 'name') { fd.append('name', $('nvi-n').value); fd.append('handle', $('nvi-h').value); }
    else { var fl = $('nvi-f').files[0]; if (!fl) return msg('e_no_file', 'er'); fd.append('file', fl); fd.append('names', $('nvi-vn').value); fd.append('adults', $('nvi-a').checked ? '1' : '0'); }
    btn.disabled = true; msg(tab === 'video' ? 'uploading' : 'sending');
    fetch('/api/novinhas/identify', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); }).then(function (x) {
      btn.disabled = false;
      if (x.d && x.d.ok) { msg(x.d.tokens === 100 ? 'ok100' : 'ok50', 'ok'); counts = { videos: x.d.videos, names: x.d.names }; paintCounts(); $('nvi-n').value = ''; $('nvi-h').value = ''; $('nvi-vn').value = ''; $('nvi-f').value = ''; $('nvi-a').checked = false; }
      else msg(T[lang]['e_' + (x.d && x.d.error)] ? 'e_' + x.d.error : 'e_generic', 'er');
    }).catch(function () { btn.disabled = false; msg('e_net', 'er'); });
  };
  [].forEach.call(document.querySelectorAll('#nv-ident-open,[data-nv-ident]'), function (b) { b.addEventListener('click', open); });
  apply();
})();
