/* Navegador universal de Twerkhub para todas las paginas de Novinhas: header del sitio (tn2) + boton "My account" y home en la barra local.
   Los scripts globales (twk-stats-btn.js -> twk-coin / twk-lang / twk-models-nav) se enganchan solos al .tn2-w. */
(function () {
  if (window.__nvNav) return; window.__nvNav = true;
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assets/twk-shell-v2.css?v=20261110-typescale1'; document.head.appendChild(css);
  if (!document.querySelector('link[href*="twk-ui.css"]')) { var ui = document.createElement('link'); ui.rel = 'stylesheet'; ui.href = '/assets/twk-ui.css?v=1'; document.head.appendChild(ui); }
  var st = document.createElement('style');
  st.textContent = '\.nv-home svg,.nv-acc svg{width:22px;height:22px;fill:currentColor}.nv-home{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;color:#fff;text-decoration:none!important}.nv-home:hover{background:#ffffff18}.nv-act{display:flex;align-items:center;gap:10px}@media(max-width:560px){.nv-acc span{display:none}.nv-acc{padding:0 12px!important}}';
  document.head.appendChild(st);
  var HDR = '<header class="tn2 site-nav"><div class="tn2-w"><a class="tn2-logo" href="/" aria-label="Twerkhub home"><img src="/assets/patreon-logo-final.png" alt="Twerkhub.lat" width="190" height="43"></a><div class="tn2-lk"><a href="/#playlists">Playlists</a><a href="/creators">Creators</a><a href="/tokens/">Membership</a><a href="/account">My account</a><a class="tn2-jn" href="/novinhas/">Novinhas</a></div><details><summary aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary><nav><a href="/">Home</a><a href="/novinhas/">Novinhas</a><a href="/creators">Creators</a><a href="/tokens/">Membership</a><a href="/account">My account</a></nav></details></div></header>';
  var USER = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 12 5zm0 14.5a7.5 7.5 0 0 1-5.9-2.9C6.7 14.6 8.9 13 12 13s5.3 1.6 5.9 3.6a7.5 7.5 0 0 1-5.9 2.9z"/></svg>';
  var HOME = '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3z"/></svg>';
  function mount() {
    if (!document.querySelector('header.tn2')) document.body.insertAdjacentHTML('afterbegin', HDR);
    var bar = document.querySelector('body > header:not(.tn2), main ~ header:not(.tn2)'); if (!bar || bar.querySelector('.nv-act')) return;
    var box = document.createElement('div'); box.className = 'nv-act';
    box.innerHTML = '<a class="nv-home" href="/novinhas/" aria-label="Novinhas home">' + HOME + '</a><a class="twk-btn twk-btn--ghost twk-btn--sm nv-acc" href="/account" aria-label="My account">' + USER + '<span>My account</span></a>';
    [].forEach.call(bar.querySelectorAll(':scope > a'), function (a) { var h = a.getAttribute('href'); if (h === '/' || h === '/account') a.remove(); });
    bar.appendChild(box);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
