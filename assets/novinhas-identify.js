/* Novinhas: boton "Search / Identification" (home y /novinhas/). Nombres o videos de bailarinas sin identificar -> 1 moneda por envio (max 20 videos y 20 nombres). */
(function () {
  if (window.__nvIdent) return; window.__nvIdent = true;
  function f(n) { return Number(n).toLocaleString('en-US'); }
  /* numeros reales en el texto de la home */
  var live = document.querySelector('[data-nv]');
  if (live) fetch('/api/novinhas/stats').then(function (r) { return r.json(); }).then(function (d) {
    var m = { 'tot-ch': d.channels.total, 'tot-vd': d.videos.total, 'done-ch': d.channels.done, 'done-vd': d.videos.done };
    for (var k in m) { var e = document.querySelector('[data-nv="' + k + '"]'); if (e) e.textContent = f(m[k]); }
  }).catch(function () {});
  var css = document.createElement('style');
  css.textContent = '.nvi-bg{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;padding:16px}.nvi-bg.on{display:flex}.nvi{width:min(520px,100%);max-height:92vh;overflow:auto;background:#101014;border:1.5px solid #6b5a22;border-radius:18px;padding:22px;color:#fff;font:14px/1.5 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.7)}.nvi h3{margin:0 0 4px;font:400 26px/1 Anton,Impact,sans-serif;letter-spacing:.04em;color:#ffe27a}.nvi p{margin:6px 0 12px;color:#cfcfd8}.nvi .tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.nvi .tabs button,.nvi .go{height:44px;border:0;border-radius:12px;font:800 12px system-ui;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#f5e6b3;background:linear-gradient(180deg,#2a2a36,#16161d);box-shadow:0 0 0 1.5px #6b5a22 inset}.nvi .tabs button.on,.nvi .go{background:linear-gradient(180deg,#ffe27a,#f0b90b 55%,#c98f00);color:#1a1100;box-shadow:0 4px 14px rgba(0,0,0,.45)}.nvi .go{width:100%;margin-top:6px}.nvi .go[disabled]{opacity:.5;cursor:default}.nvi input[type=text],.nvi input[type=file]{width:100%;box-sizing:border-box;height:44px;border-radius:12px;border:1.5px solid #3a3a46;background:#16161d;color:#fff;padding:0 12px;margin:4px 0 10px;font:14px system-ui}.nvi input[type=file]{padding:9px 10px;height:auto}.nvi label{font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#e8b84a}.nvi .chk{display:flex;gap:8px;align-items:flex-start;margin:4px 0 12px;font-size:13px;text-transform:none;letter-spacing:0;color:#cfcfd8;font-weight:400}.nvi .chk input{margin-top:3px}.nvi .cnt{display:flex;justify-content:space-between;font-weight:700;color:#f5e6b3;margin:0 0 6px}.nvi .msg{min-height:20px;margin:8px 0 0;font-weight:700}.nvi .msg.ok{color:#19d3b5}.nvi .msg.er{color:#ff6b6b}.nvi .x{float:right;background:none;border:0;color:#aaa;font-size:26px;line-height:1;cursor:pointer}';
  document.head.appendChild(css);
  var bg = document.createElement('div'); bg.className = 'nvi-bg';
  bg.innerHTML = '<div class="nvi" role="dialog" aria-modal="true" aria-label="Search and identification"><button class="x" type="button" aria-label="Close">&times;</button><h3>Search / Identification</h3><p>Know a dancer from the YouTube or Instagram funk scene, or have a video we should identify? Send it. If it is not in our archive yet, it goes on search &amp; recovery. <b>1 coin per video or name</b> (up to 20 videos and 20 names).</p><div class="cnt"><span id="nvi-cv">Videos 0/20</span><span id="nvi-cn">Names 0/20</span></div><div class="tabs"><button type="button" data-t="name" class="on">Suggest a name</button><button type="button" data-t="video">Send a video</button></div><div id="nvi-name"><label for="nvi-n">Dancer / creator name</label><input id="nvi-n" type="text" maxlength="80" placeholder="Name as known on YouTube or Instagram" autocomplete="off"><label for="nvi-h">@ or channel (optional)</label><input id="nvi-h" type="text" maxlength="80" placeholder="@handle or channel name" autocomplete="off"></div><div id="nvi-video" style="display:none"><label for="nvi-f">Video file (max 80 MB)</label><input id="nvi-f" type="file" accept="video/*"><label for="nvi-vn">Known name(s) of the dancer (optional)</label><input id="nvi-vn" type="text" maxlength="160" placeholder="If you know who she is" autocomplete="off"><label class="chk"><input id="nvi-a" type="checkbox"><span>I confirm everyone in this video is an adult (18+). Videos of minors are never accepted.</span></label></div><button type="button" class="go" id="nvi-go">Send &middot; earn 1 coin</button><div class="msg" id="nvi-m"></div></div>';
  document.body.appendChild(bg);
  var tab = 'name', $ = function (i) { return document.getElementById(i); };
  function msg(t, c) { var m = $('nvi-m'); m.textContent = t; m.className = 'msg ' + (c || ''); }
  function counts(d) { if (d && d.videos != null) { $('nvi-cv').textContent = 'Videos ' + d.videos + '/20'; $('nvi-cn').textContent = 'Names ' + d.names + '/20'; } }
  function status() { fetch('/api/novinhas/identify', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) { if (!d.auth) msg('Create a free account to earn coins for your contributions.', 'er'); else msg(''); counts(d); }).catch(function () {}); }
  function open(e) { if (e) e.preventDefault(); bg.classList.add('on'); status(); }
  function close() { bg.classList.remove('on'); }
  bg.querySelector('.x').onclick = close; bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  [].forEach.call(bg.querySelectorAll('.tabs button'), function (b) { b.onclick = function () { tab = b.dataset.t; [].forEach.call(bg.querySelectorAll('.tabs button'), function (x) { x.classList.toggle('on', x === b); }); $('nvi-name').style.display = tab === 'name' ? '' : 'none'; $('nvi-video').style.display = tab === 'video' ? '' : 'none'; msg(''); }; });
  var ERR = { login: 'Please log in or create a free account first.', limit: 'You reached the limit of 20 for this type.', name_short: 'Write the name (at least 3 letters).', duplicate: 'You already sent that name.', no_file: 'Choose a video file.', adults_required: 'Please confirm everyone in the video is 18+.', bad_type: 'That file type is not supported (use MP4, MOV or WebM).', too_big: 'The video is too big (max 80 MB).' };
  $('nvi-go').onclick = function () {
    var fd = new FormData(), btn = $('nvi-go'); fd.append('kind', tab);
    if (tab === 'name') { fd.append('name', $('nvi-n').value); fd.append('handle', $('nvi-h').value); }
    else { var fl = $('nvi-f').files[0]; if (!fl) return msg(ERR.no_file, 'er'); fd.append('file', fl); fd.append('names', $('nvi-vn').value); fd.append('adults', $('nvi-a').checked ? '1' : '0'); }
    btn.disabled = true; msg(tab === 'video' ? 'Uploading...' : 'Sending...');
    fetch('/api/novinhas/identify', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); }).then(function (x) {
      btn.disabled = false;
      if (x.d && x.d.ok) { msg('Received! +1 coin added to your balance.', 'ok'); counts(x.d); $('nvi-n').value = ''; $('nvi-h').value = ''; $('nvi-vn').value = ''; $('nvi-f').value = ''; $('nvi-a').checked = false; }
      else msg(ERR[x.d && x.d.error] || 'Something went wrong, try again.', 'er');
    }).catch(function () { btn.disabled = false; msg('Connection error, try again.', 'er'); });
  };
  [].forEach.call(document.querySelectorAll('#nv-ident-open,[data-nv-ident]'), function (b) { b.addEventListener('click', open); });
})();
