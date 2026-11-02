/* Universal profile avatar for the shell header (all pages). Photo from the saved profile, initials as fallback. Owner sees the admin panel links. */
(function () {
  if (window.__twkProfile) return; window.__twkProfile = 1;
  var KEY = 'alexia_forum_profile_v1';
  function prof() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function owner() { return /(?:^|;\s*)twx=1/.test(document.cookie); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var css = document.createElement('style');
  css.textContent = '.twk-pf{position:relative;flex:none}.twk-pf>button{width:40px;height:40px;border-radius:50%;padding:0;cursor:pointer;border:2px solid #ff8f00;background:#15110a;color:#ffd27a;font:700 14px "JetBrains Mono",monospace;overflow:hidden;display:grid;place-items:center;box-shadow:0 0 14px rgba(255,143,0,.35)}.twk-pf>button img{width:100%;height:100%;object-fit:cover;display:block}.twk-pf>div{display:none;position:absolute;right:0;top:48px;min-width:210px;background:#0b0a07;border:1px solid #3a2a10;border-radius:14px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.6);z-index:200}.twk-pf.open>div{display:block}.twk-pf a{display:block;padding:10px 12px;border-radius:9px;color:#e9dfc0;text-decoration:none;font:700 12px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.twk-pf a:hover{background:#1a0f00;color:#ffb03a}.twk-pf h6{margin:6px 12px 2px;font:700 10px "JetBrains Mono",monospace;letter-spacing:.2em;color:#ff8f00;text-transform:uppercase}';
  document.head.appendChild(css);
  var el;
  function mount() {
    if (el || !document.body) return;
    var w = document.querySelector('.tn2-w'); if (!w) return;
    var p = prof(), nm = p.nickname || 'Claudio';
    el = document.createElement('div'); el.className = 'twk-pf';
    var inner = p.avatar_url ? '<img src="' + esc(p.avatar_url) + '" alt="">' : esc(nm.slice(0, 1).toUpperCase());
    var adm = owner() ? '<h6>Panel Twerkhub</h6><a href="/admin/stats/">Estadísticas</a><a href="/admin-users.html">Registrados</a><a href="/jenny/uncensored/">Uncensored</a>' : '';
    el.innerHTML = '<button type="button" aria-label="Perfil" aria-expanded="false">' + inner + '</button><div><a href="/account">My account</a><a href="/tokens/">My wallet</a>' + adm + '</div>';
    var d = w.querySelector('details'); if (d) w.insertBefore(el, d); else w.appendChild(el);
    var b = el.querySelector('button');
    b.addEventListener('click', function (e) { e.stopPropagation(); el.classList.toggle('open'); b.setAttribute('aria-expanded', el.classList.contains('open')); });
    document.addEventListener('click', function () { el.classList.remove('open'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 900);
})();
