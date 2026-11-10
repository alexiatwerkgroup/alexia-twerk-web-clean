/* Shared header profile; load its avatar from the authenticated server profile. */
(function () {
  if (window.__twkProfile) return; window.__twkProfile = 1;
  var KEY = 'alexia_forum_profile_v1', OWNER = 'alexiatwerkoficial@gmail.com', el;
  function json(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function owner() {
    if (/(?:^|;\s*)twx=1(?:;|$)/.test(document.cookie)) return true;
    var p = json('alexia_current_user'), a = json('alexia-auth-v3');
    return String(p.email || (a.user && a.user.email) || '').toLowerCase() === OWNER;
  }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function styles() {
    if (document.getElementById('twk-profile-css')) return;
    var s = document.createElement('style'); s.id = 'twk-profile-css';
    s.textContent = '.twk-pf{position:relative;flex:none}.twk-pf>button{width:44px;height:44px;border-radius:50%;padding:0;cursor:pointer;border:2px solid #ff9b13;background:#15110a;color:#ffd27a;font:800 14px "JetBrains Mono",monospace;overflow:hidden;display:grid;place-items:center;box-shadow:0 0 15px rgba(255,143,0,.3)}.twk-pf>button img{width:100%;height:100%;object-fit:cover;display:block}.twk-pf>div{display:none;position:absolute;right:0;top:50px;min-width:210px;background:#0b0a07;border:1px solid #51401a;border-radius:14px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.6);z-index:10001}.twk-pf.open>div{display:block}.twk-pf a{display:block;padding:10px 12px;border-radius:9px;color:#e9dfc0;text-decoration:none;font:700 12px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.twk-pf a:hover{background:#1a0f00;color:#ffb03a}.twk-pf h6{margin:6px 12px 2px;font:700 10px "JetBrains Mono",monospace;letter-spacing:.2em;color:#ff8f00;text-transform:uppercase}@media(max-width:560px){.twk-pf>button{width:38px;height:38px}}';
    document.head.appendChild(s);
  }
  function setAvatar(url, name) {
    if (!el) return;
    var b = el.querySelector('button'), initial = String(name || 'Claudio').trim().slice(0, 1).toUpperCase() || 'C';
    if (!url) { b.textContent = initial; return; }
    b.innerHTML = '<img src="' + esc(url) + '" alt="">';
    b.querySelector('img').onerror = function () { b.textContent = initial; };
  }
  function mount() {
    if (el || !document.body) return;
    var w = document.querySelector('.tn2-w'); if (!w) return; styles();
    var p = json(KEY), name = p.nickname || p.username || 'Claudio';
    el = document.createElement('div'); el.className = 'twk-pf';
    var adm = owner() ? '<h6>Panel Twerkhub</h6><a href="/admin/stats/">Estadísticas</a><a href="/admin-users.html">Registrados</a><a href="/jenny/">Uncensored</a>' : '';
    el.innerHTML = '<button type="button" aria-label="Perfil" aria-expanded="false"></button><div><a href="/account">My account</a><a href="/tokens/">My balance</a>' + adm + '</div>';
    var d = w.querySelector('details'); if (d) w.insertBefore(el, d); else w.appendChild(el);
    setAvatar(p.avatar_url || '', name);
    var b = el.querySelector('button');
    b.addEventListener('click', function (e) { e.stopPropagation(); el.classList.toggle('open'); b.setAttribute('aria-expanded', el.classList.contains('open')); });
    document.addEventListener('click', function () { el.classList.remove('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') el.classList.remove('open'); });
    var auth = json('alexia-auth-v3'), headers = auth.token ? { Authorization: 'Bearer ' + auth.token } : {};
    fetch('/api/profile/me', { credentials: 'same-origin', headers: headers }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.ok || !d.profile) return;
      var q = d.profile;
      try { localStorage.setItem(KEY, JSON.stringify({ nickname: q.username || '', avatar_url: q.avatar_url || '', bio: q.bio || '' })); } catch (e) {}
      try { localStorage.setItem('alexia_current_user', JSON.stringify(Object.assign(json('alexia_current_user'), { email: q.email || '', username: q.username || '' }))); } catch (e) {}
      setAvatar(q.avatar_url || '', q.username || name);
    }).catch(function () {});
    window.addEventListener('alexia-profile-cache-updated', function (e) { var q = e.detail && e.detail.profile || {}; setAvatar(q.avatar_url || '', q.username || name); });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { var q = json(KEY); setAvatar(q.avatar_url || '', q.nickname || q.username || name); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 900);
})();
