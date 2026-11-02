/* Owner admin bar: one clean way around every admin page. Hides the public-site nav/footer on these pages. */
(function () {
  var st = document.createElement('style');
  st.textContent = '#twk-nav-container,footer.twk-mf{display:none!important}#adm{position:sticky;top:0;z-index:90;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:10px max(16px,calc((100% - 1200px)/2));background:#07070a;border-bottom:1px solid #ff8a00;box-shadow:0 0 22px rgba(255,138,0,.25);font:700 13px Rajdhani,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}#adm b{color:#ff8a00;margin-right:10px}#adm a{color:#e9dfc0;text-decoration:none;padding:7px 12px;border:1px solid #2a2418;border-radius:10px;background:#0b0a07}#adm a:hover{border-color:#ff8a00;color:#fff;box-shadow:0 0 12px rgba(255,138,0,.5)}#adm a.on{border-color:#ff8a00;color:#fff;background:#1a0f00}#adm .sp{flex:1}';
  document.head.appendChild(st);
  var L = [['/admin/stats/', 'Estadísticas'], ['/admin-users.html', 'Registrados'], ['/jenny/', 'Jenny'], ['/jenny/uncensored/', 'Uncensored'], ['/', 'Sitio']];
  var p = location.pathname.replace(/index\.html$/, '');
  var bar = document.createElement('nav'); bar.id = 'adm'; bar.setAttribute('aria-label', 'Panel de administración');
  bar.innerHTML = '<b>Panel Twerkhub</b>' + L.map(function (l) { return '<a href="' + l[0] + '"' + (l[0] === p ? ' class="on"' : '') + '>' + l[1] + '</a>'; }).join('') ;
  function put() { document.body.insertBefore(bar, document.body.firstChild); }
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);
})();
