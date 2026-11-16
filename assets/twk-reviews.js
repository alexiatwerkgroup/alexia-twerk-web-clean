/* Seccion "Reviews de compradores" (home). Solo reviews reales aprobadas por el dueño.
   - Visitantes: ven las aprobadas (si no hay ninguna, la seccion no se muestra).
   - VIP con sesion: formulario para dejar su review (queda pendiente hasta que se aprueba).
   - Dueño: ve pendientes (aprobar/borrar) y puede agregar la review de un comprador. */
(function () {
  var host = document.getElementById('reviews'); if (!host) return;
  var API = '/api/reviews';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var star = function (n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<span class="rv-s' + (i <= n ? ' on' : '') + '">★</span>'; return s; };
  var css = '#reviews{padding:30px 0 50px}#reviews .rv-top{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:22px}#reviews .rv-avg{font:400 clamp(30px,4vw,46px)/1 Anton,sans-serif;color:#f7dd8b}#reviews .rv-avg small{font:700 12px "JetBrains Mono",monospace;letter-spacing:.14em;color:var(--mut,#a6a6b2);margin-left:10px}' +
    '#reviews .rv-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}#reviews .rv-c{border:1px solid #4a3b1a;border-radius:18px;background:radial-gradient(400px 160px at 0 0,rgba(232,200,114,.10),transparent),var(--card,#101014);padding:20px 22px;display:flex;flex-direction:column;gap:10px}' +
    '#reviews .rv-s{color:#4a3b1a;font-size:18px}#reviews .rv-s.on{color:#f0b90b;text-shadow:0 0 10px rgba(240,185,11,.4)}#reviews .rv-t{margin:0;color:#e9e9f0;line-height:1.55;font-size:15px}#reviews .rv-w{margin-top:auto;display:flex;justify-content:space-between;gap:10px;font:700 11px "JetBrains Mono",monospace;letter-spacing:.08em;color:var(--mut,#a6a6b2);text-transform:uppercase}#reviews .rv-w b{color:#e8c872}' +
    '#reviews .rv-f{margin-top:22px;border:1px dashed #4a3b1a;border-radius:18px;padding:20px 22px;display:grid;gap:12px;max-width:640px}#reviews .rv-f h3{margin:0;font-size:18px}#reviews .rv-pick{display:flex;gap:4px}#reviews .rv-pick button{background:none;border:0;cursor:pointer;font-size:28px;color:#4a3b1a;padding:0 2px}#reviews .rv-pick button.on{color:#f0b90b}' +
    '#reviews input,#reviews textarea{width:100%;box-sizing:border-box;background:#0b0b0e;border:1px solid #3a3a42;border-radius:12px;color:#fff;padding:12px 14px;font:inherit}#reviews textarea{min-height:92px;resize:vertical}#reviews .rv-m{font:700 12px "JetBrains Mono",monospace;color:var(--mut,#a6a6b2)}#reviews .rv-adm{margin-top:18px;border:1px solid #2b2b33;border-radius:14px;padding:14px 16px;display:grid;gap:10px}#reviews .rv-adm .rv-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}#reviews .rv-adm button.sm{padding:8px 14px;font-size:11px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var get = function (u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function () { return null; }); };
  var post = function (b) { return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; }); };

  function render(pub, me, all) {
    var items = (pub && pub.items) || [], canWrite = me && me.vip, isOwner = me && me.owner;
    var standalone = host.hasAttribute('data-page');
    if (!items.length && !canWrite && !isOwner && !standalone) { host.hidden = true; return; }
    host.hidden = false;
    var h = '<div class="w"><div class="rv-top"><div><div class="eyebrow">Buyer reviews</div><h2>What buyers say</h2></div>' +
      (items.length ? '<div class="rv-avg">' + pub.avg.toFixed(1) + ' <span style="font-size:.55em">' + star(Math.round(pub.avg)) + '</span><small>' + items.length + ' REVIEWS</small></div>' : '') + '</div>';
    h += '<div class="rv-g">' + items.map(function (x) { return '<article class="rv-c"><div>' + star(x.stars) + '</div><p class="rv-t">' + esc(x.text) + '</p><div class="rv-w"><span>' + esc(x.name) + '</span><b>Verified' + (x.product ? ' · ' + esc(x.product) : '') + '</b></div></article>'; }).join('') + '</div>';
    if (canWrite && !isOwner) {
      var m = me.mine;
      h += '<form class="rv-f" id="rv-form"><h3>' + (m ? 'Update your review' : 'Leave your review') + '</h3><div class="rv-pick" id="rv-pick">' + [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-v="' + i + '" class="' + (m && i <= m.stars ? 'on' : '') + '">★</button>'; }).join('') + '</div>' +
        '<input id="rv-name" maxlength="24" placeholder="Name to show (optional)" value="' + esc(m ? m.name : '') + '"><textarea id="rv-text" maxlength="500" placeholder="What did you get and how was it? (min. 15 characters)">' + esc(m ? m.text : '') + '</textarea>' +
        '<div><button class="btn k" type="submit">Send review</button></div><div class="rv-m" id="rv-msg">' + (m ? (m.status === 'ok' ? 'Your review is published.' : 'Your review is waiting for approval.') : 'Reviews are checked before they appear.') + '</div></form>';
    }
    if (standalone && !canWrite && !isOwner) {
      h += '<div class="rv-f"><h3>Leave your review</h3><div class="rv-m">' + (me && me.user ? 'Reviews can be left by VIP buyers. Activate your VIP on this browser and come back to this page.' : 'Log in with your Twerkhub account to leave your review.') + '</div>' + (me && me.user ? '' : '<div><a class="btn k" href="/account?next=/reviews/">Log in</a></div>') + '</div>';
    }
    if (isOwner) {
      h += '<div class="rv-adm"><div class="rv-m">OWNER · pending reviews and add a buyer review</div>' +
        ((all && all.items) || []).filter(function (x) { return x.status === 'pending'; }).map(function (x) { return '<div class="rv-row"><div><div>' + star(x.stars) + ' <b>' + esc(x.name) + '</b></div><div class="rv-t">' + esc(x.text) + '</div></div><div><button class="btn k sm" data-ap="' + x.id + '">Approve</button> <button class="btn sm" data-del="' + x.id + '">Delete</button></div></div>'; }).join('') +
        '<form id="rv-add" style="display:grid;gap:8px"><input id="a-name" placeholder="Buyer name (as they want it shown)" maxlength="24"><input id="a-prod" placeholder="What they bought (e.g. VIP 30 days)" maxlength="40"><input id="a-stars" type="number" min="1" max="5" value="5"><textarea id="a-text" placeholder="Their words (real message from the buyer)"></textarea><div><button class="btn k sm" type="submit">Add review</button> <span class="rv-m" id="a-msg"></span></div></form>' +
        ((all && all.items) || []).filter(function (x) { return x.status === 'ok'; }).map(function (x) { return '<div class="rv-row"><div class="rv-m">' + esc(x.name) + ' · ' + x.stars + '★ · ' + esc(x.text.slice(0, 60)) + '</div><button class="btn sm" data-del="' + x.id + '">Delete</button></div>'; }).join('') + '</div>';
    }
    host.innerHTML = h + '</div>';
    var pick = document.getElementById('rv-pick'), val = me && me.mine ? me.mine.stars : 0;
    if (pick) pick.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; val = +b.dataset.v; [].forEach.call(pick.children, function (c) { c.classList.toggle('on', +c.dataset.v <= val); }); };
    var f = document.getElementById('rv-form');
    if (f) f.onsubmit = function (e) { e.preventDefault(); var msg = document.getElementById('rv-msg'); if (!val) { msg.textContent = 'Pick the stars first.'; return; } post({ stars: val, name: document.getElementById('rv-name').value, text: document.getElementById('rv-text').value }).then(function (r) { msg.textContent = r.ok ? 'Thanks! Your review will appear once it is approved.' : (r.error === 'too_short' ? 'Write at least 15 characters.' : 'Could not send. Try again.'); }); };
    var add = document.getElementById('rv-add');
    if (add) add.onsubmit = function (e) { e.preventDefault(); post({ action: 'add', name: document.getElementById('a-name').value, product: document.getElementById('a-prod').value, stars: document.getElementById('a-stars').value, text: document.getElementById('a-text').value }).then(function (r) { if (r.ok) load(); else document.getElementById('a-msg').textContent = 'Check the fields (min. 15 characters).'; }); };
    host.onclick = function (e) {
      var a = e.target.closest('[data-ap]'), d = e.target.closest('[data-del]');
      if (a) post({ action: 'approve', id: a.dataset.ap }).then(load);
      if (d && confirm('Delete this review?')) post({ action: 'delete', id: d.dataset.del }).then(load);
    };
  }
  function load() {
    Promise.all([get(API), get(API + '?me=1')]).then(function (r) {
      var me = r[1];
      if (me && me.owner) get(API + '?all=1').then(function (all) { render(r[0], me, all); }); else render(r[0], me, null);
    });
  }
  host.hidden = true; load();
})();
