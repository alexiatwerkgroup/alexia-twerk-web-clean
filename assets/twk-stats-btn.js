(function(){
  if(window.__twkStats)return;
  window.__twkStats=1;
  // Keep a fixed, direct owner shortcut in addition to the visitor counter.
  var OWNER='alexiatwerkoficial@gmail.com';
  function addStatsLink(){
    if(document.getElementById('twk-stats-shortcut'))return;
    var a=document.createElement('a');
    a.id='twk-stats-shortcut';
    a.href='/admin/stats/';
    a.innerHTML='<span aria-hidden="true">▥</span><span>ESTADÍSTICAS</span>';
    a.setAttribute('aria-label','Abrir estadísticas del sitio');
    a.title='Abrir estadísticas';
    a.style.cssText='position:fixed;right:20px;bottom:88px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid #e1b84f;border-radius:12px;background:linear-gradient(135deg,#211708,#090807);box-shadow:0 6px 24px rgba(0,0,0,.65),0 0 16px rgba(225,184,79,.22);color:#ffe2a2;font:800 12px/1 system-ui,sans-serif;letter-spacing:.12em;text-decoration:none;white-space:nowrap;pointer-events:auto;visibility:visible;opacity:1';
    a.querySelector('span').style.cssText='font-size:17px;color:#ffd15b';
    (document.body||document.documentElement).appendChild(a);
  }
  function verifyOwner(){
    if(location.pathname.indexOf('/admin/')===0)return;
    var token='';
    try{token=(JSON.parse(localStorage.getItem('alexia-auth-v3')||'{}').token)||''}catch(e){}
    fetch('/api/auth/session',{credentials:'same-origin',headers:token?{Authorization:'Bearer '+token}:{}})
      .then(function(r){return r.ok?r.json():null})
      .then(function(d){if(d&&d.user&&String(d.user.email||'').toLowerCase()===OWNER)addStatsLink()})
      .catch(function(){});
  }
  verifyOwner();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',verifyOwner,{once:true});
  window.setTimeout(verifyOwner,1500);
  ['twk-coin.js?v=20261105-ledger','twk-i18n.js?v=20261113-pt1','twk-models-nav.js?v=20261105-alexia-paused-5','twk-profile.js?v=20261105-walletfix','twk-lang.js?v=20261104-info'].forEach(function(src){var s=document.createElement('script');s.src='/assets/'+src;s.defer=true;document.head.appendChild(s)});
})();
