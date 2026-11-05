/* Owner-only persistent 3D visitor counter. The stats API verifies ownership. */
(function () {
  if (window.__twc || location.pathname.indexOf('/admin/') === 0) return;
  window.__twc = 1;
  var OWNER = 'alexiatwerkoficial@gmail.com', token = '', verified = false, painted = false, attempts = 0;
  try { token = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}').token) || ''; } catch (_) {}
  var css = '#twc{position:fixed;left:14px;bottom:14px;z-index:9990;perspective:700px;font-family:system-ui,sans-serif;cursor:pointer;user-select:none}#twc .box{transform:rotateX(14deg) rotateY(-10deg);transform-style:preserve-3d;transition:transform .3s;padding:10px 12px 8px;border-radius:16px;background:linear-gradient(180deg,#2a2208,#0a0804);border:1.5px solid #e8b84a;box-shadow:0 14px 30px #000c,6px 8px 0 #7a4c0a,0 0 26px #e8b84a40}#twc:hover .box{transform:rotateX(4deg) rotateY(-3deg) translateY(-3px)}#twc .l{font:800 9px system-ui;letter-spacing:.2em;color:#e8c878;margin-bottom:5px;display:flex;gap:8px;justify-content:space-between}#twc .l i{font-style:normal;color:#5df08a}#twc .d{display:flex;gap:4px}#twc .d b{display:block;min-width:26px;padding:6px 0;text-align:center;font:900 30px/1 "Arial Black",system-ui,sans-serif;color:#fff1a8;border-radius:7px;background:linear-gradient(180deg,#3a3010 0%,#14100a 48%,#000 50%,#1c1608 100%);border:1px solid #6a5420;text-shadow:0 2px 0 #7a4c0a,0 0 14px #e8b84a99;box-shadow:inset 0 1px 0 #fff3}#twc .s{font:600 10px system-ui;color:#b8a878;margin-top:6px;display:flex;justify-content:space-between;gap:10px}#twc .x{position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;background:#000;border:1px solid #e8b84a;color:#e8b84a;font:700 12px/18px system-ui;text-align:center}@media(max-width:600px){#twc{transform:scale(.8);transform-origin:left bottom}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var el = document.createElement('div'); el.id = 'twc'; el.title = 'Ver estadísticas'; el.hidden = true;
  el.setAttribute('role', 'link'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Abrir estadísticas del sitio');
  document.documentElement.appendChild(el);
  function openStats() { location.href = '/admin/stats/'; }
  el.addEventListener('click', openStats);
  el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStats(); } });
  function getStats() {
    return fetch('/api/analytics/stats?mini=1', { credentials: 'same-origin', headers: token ? { Authorization: 'Bearer ' + token } : {} })
      .then(function (r) { if (r.status === 403) { verified = false; el.hidden = true; document.cookie = 'twx=; Max-Age=0; Path=/; SameSite=Lax; Secure'; return null; } return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok) return false;
        el.hidden = false;
        el.innerHTML = '<div class="box"><div class="l"><span>VISITANTES</span><i>● ' + d.online + ' ahora</i></div><div class="d">' + String(d.visitors).split('').map(function (c) { return '<b>' + c + '</b>'; }).join('') + '</div><div class="s"><span>' + d.views + ' vistas</span><span>' + d.today + ' hoy</span></div></div>';
        painted = true;
        return true;
      }).catch(function () { return false; });
  }
  function verifyAndLoad() {
    var headers = token ? { Authorization: 'Bearer ' + token } : {};
    return fetch('/api/auth/session', { credentials: 'same-origin', headers: headers })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.user || String(d.user.email || '').toLowerCase() !== OWNER) return false;
        verified = true;
        document.cookie = 'twx=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure';
        return getStats();
      }).catch(function () { return false; });
  }
  function poll() {
    attempts++;
    var task = verified ? getStats() : verifyAndLoad();
    task.then(function () {
      if (painted) window.setTimeout(poll, 300000);
      else if (verified || attempts < 6) window.setTimeout(poll, verified ? 20000 : 10000);
    });
  }
  poll();
})();
