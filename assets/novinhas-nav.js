/* Navegador universal de Twerkhub para todas las paginas de Novinhas: header del sitio (tn2) + boton "My account" y home en la barra local.
   Los scripts globales (twk-stats-btn.js -> twk-coin / twk-lang / twk-models-nav) se enganchan solos al .tn2-w. */
(function () {
  if (window.__nvNav) return; window.__nvNav = true;
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assets/twk-shell-v2.css?v=20261110-typescale1'; document.head.appendChild(css);
  if (!document.querySelector('link[href*="twk-ui.css"]')) { var ui = document.createElement('link'); ui.rel = 'stylesheet'; ui.href = '/assets/twk-ui.css?v=1'; document.head.appendChild(ui); }
  if (!document.querySelector('link[href*="Dancing+Script"]')) { var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Dancing+Script:wght@700&display=swap'; document.head.appendChild(fl); }
  var st = document.createElement('style');
  st.textContent = '.nv-home svg,.nv-acc svg{width:22px;height:22px;fill:currentColor}.nv-home{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;color:#fff;text-decoration:none!important}.nv-home:hover{background:#ffffff18}.nv-act{display:flex;align-items:center;gap:10px}@media(max-width:560px){.nv-acc span{display:none}.nv-acc{padding:0 12px!important}}' +
  '.nv-brand{display:block;width:min(560px,92vw);margin:14px auto 6px;container-type:inline-size;text-decoration:none!important}.nv-brand:hover{filter:brightness(1.1)}.nv-bt{display:flex;align-items:center;gap:2.5cqi;width:100%;margin-bottom:6px}.nv-bl{flex:0 0 55%;display:block}.nv-bl video{display:block;width:100%;height:auto;pointer-events:none}.nv-bn{flex:1 1 0;min-width:0;height:auto;overflow:visible;filter:drop-shadow(0 0 14px rgba(255,79,154,.45))}.nv-bn text{font:700 96px "Dancing Script","Pacifico",cursive}.nv-bh{display:flex;flex-wrap:nowrap;align-items:center;width:100%;white-space:nowrap;font:400 10.6cqi/1.05 "Anton","Impact",sans-serif;gap:.26em;margin:0}.nv-bh span{color:#ffe9a6;letter-spacing:.1em;text-transform:uppercase;text-shadow:0 0 28px rgba(232,184,74,.35)}.nv-bh img{height:.92em;width:auto;display:block;filter:drop-shadow(0 0 16px rgba(255,0,0,.35))}' +
  '@keyframes nvLogoIn{0%{opacity:0;transform:translateY(-8px) scale(.96)}60%{opacity:1;transform:translateY(1px) scale(1.01)}100%{opacity:1;transform:none}}' +
  '@keyframes nvLogoShimmer{0%,100%{filter:drop-shadow(0 0 0px #ffd76a00)}50%{filter:drop-shadow(0 0 10px #ffd76acc)}}' +
  '.tn2-logo img{animation:nvLogoIn .55s cubic-bezier(.22,1,.36,1) both,nvLogoShimmer 3s ease-in-out .6s infinite}';
  document.head.appendChild(st);
  var lgst = document.createElement('style'); lgst.textContent = ".nv-logo{display:flex;align-items:center;gap:14px;color:#f1f1f1;text-decoration:none!important;white-space:nowrap}.nv-logo .nv-ham{width:40px;height:40px;border-radius:50%;display:grid;place-items:center}.nv-logo .nv-ham svg{width:24px;height:24px;fill:currentColor}.nv-logo:hover .nv-ham{background:#272727}.nv-logo b{display:flex;align-items:center;gap:4px;font:700 20px/1 Roboto,Arial,sans-serif;letter-spacing:-1.1px;color:#f1f1f1}.nv-logo .nv-mark{width:34px;height:24px;border-radius:8px;background:#f03;display:grid;place-items:center}.nv-logo .nv-mark svg{width:15px;height:15px;fill:#fff}.nv-logo small{font:700 10px Arial,sans-serif;color:#aaa;letter-spacing:0;align-self:flex-start;margin:2px 0 0 2px}@media(max-width:620px){.nv-logo{gap:6px}.nv-logo b{font-size:16px}.nv-logo .nv-mark{width:29px;height:20px;border-radius:6px}.nv-logo small{display:none}}"; document.head.appendChild(lgst);
  var LOGO = '<a class="nv-logo" href="/novinhas/" aria-label="Novinhas - back to all channels"><span class="nv-ham"><svg viewBox="0 0 24 24"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg></span><b><span class="nv-mark"><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg></span>Novinhas<small>DEMO</small></b></a>';
  var HDR = '<header class="tn2 site-nav"><div class="tn2-w"><a class="tn2-logo" href="/" aria-label="Twerkhub home"><img src="/assets/patreon-logo-final.png" alt="Twerkhub.lat" width="190" height="43"></a><div class="tn2-lk"><a href="/#playlists">Playlists</a><a href="/creators">Creators</a><a href="/tokens/">Membership</a><a href="/account">My account</a><a class="tn2-jn" href="/novinhas/">Novinhas</a></div><details><summary aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary><nav><a href="/">Home</a><a href="/novinhas/">Novinhas</a><a href="/creators">Creators</a><a href="/tokens/">Membership</a><a href="/account">My account</a></nav></details></div></header>';
  var USER = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 12 5zm0 14.5a7.5 7.5 0 0 1-5.9-2.9C6.7 14.6 8.9 13 12 13s5.3 1.6 5.9 3.6a7.5 7.5 0 0 1-5.9 2.9z"/></svg>';
  var HOME = '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3z"/></svg>';
  var BRAND = '<a class="nv-brand" href="/novinhas/" aria-label="Twerkhub Novinhas - banned from YouTube - all channels"><span class="nv-bt"><span class="nv-bl"><video class="nv-vid" playsinline preload="auto" poster="/assets/twerkhub-logo-leche-poster.png" aria-label="Twerkhub"><source src="/assets/twerkhub-logo-leche.webm" type="video/webm"></video></span><svg class="nv-bn" viewBox="0 0 330 100" role="img" aria-label="Novinhas"><defs><linearGradient id="nvp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3d6"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient></defs><text x="0" y="72" textLength="330" lengthAdjust="spacingAndGlyphs" fill="url(#nvp)">Novinhas</text></svg></span><span class="nv-bh"><span>Banned from</span><img alt="YouTube" src="/assets/yt-logo.png"></span></a>';
  /* El logo suena UNA sola vez (con sonido, o al primer gesto si el navegador lo bloquea) y queda quieto en la imagen final. En el resto de la sesion se muestra directo la imagen final. */
  function nvLogo(v) {
    var K = "nvLogoHeard", seen = false;
    try { seen = sessionStorage.getItem(K) === "1"; } catch (e) {}
    function rest() { try { v.currentTime = 1e6; } catch (e) {} v.pause(); }
    if (seen) { if (v.readyState >= 1) rest(); else v.addEventListener("loadedmetadata", rest); return; }
    v.volume = .5; v.addEventListener("ended", function () { try { sessionStorage.setItem(K, "1"); } catch (e) {} });
    var ev = ["pointerdown", "keydown", "touchstart", "wheel", "mousemove"];
    function h() { ev.forEach(function (e) { window.removeEventListener(e, h, true); }); v.muted = false; try { v.currentTime = 0; } catch (e) {} var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    function arm() { ev.forEach(function (e) { window.addEventListener(e, h, true); }); }
    v.muted = false; var p = v.play();
    if (p && p.catch) p.catch(function () { v.pause(); try { v.currentTime = 0; } catch (e) {} arm(); });
  }
  function mount() {
    if (!document.querySelector('header.tn2')) document.body.insertAdjacentHTML('afterbegin', HDR);
    if (!document.querySelector('.nv-brand')) { var th = document.querySelector('header.tn2'); if (th) th.insertAdjacentHTML('afterend', BRAND); else document.body.insertAdjacentHTML('afterbegin', BRAND); var v = document.querySelector('.nv-brand video'); if (v) nvLogo(v); }
    if (/^\/novinhas\/(canal|channel)(\/|$)/.test(location.pathname)) {
      var lb = document.querySelector('body > header:not(.tn2), main ~ header:not(.tn2)');
      if (lb && !lb.querySelector('.nv-logo')) {
        [].forEach.call(lb.querySelectorAll(':scope > a'), function (a) { if (a.getAttribute('href') === '/novinhas/' && a.id !== 'back' && /^\u2190|^&larr;/.test(a.textContent.trim())) a.remove(); });
        lb.insertAdjacentHTML('afterbegin', LOGO); lb.style.alignItems = 'center';
      }
    }
    if (/^\/novinhas\/watch/.test(location.pathname)) return;
    var bar = document.querySelector('body > header:not(.tn2), main ~ header:not(.tn2)'); if (!bar || bar.querySelector('.nv-act')) return;
    var box = document.createElement('div'); box.className = 'nv-act';
    box.innerHTML = '<a class="nv-home" href="/novinhas/" aria-label="Novinhas home">' + HOME + '</a><a class="twk-btn twk-btn--ghost twk-btn--sm nv-acc" href="/novinhas/account/" aria-label="My account">' + USER + '<span>My account</span></a>';
    [].forEach.call(bar.querySelectorAll(':scope > a'), function (a) { var h = a.getAttribute('href'); if (h === '/' || h === '/account' || h === '/novinhas/account/') a.remove(); });
    bar.appendChild(box);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
