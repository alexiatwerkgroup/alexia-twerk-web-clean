(function(){
  if(window.__twkStats)return;
  window.__twkStats=1;
  var OWNER='alexiatwerkoficial@gmail.com', verifiedOwner=false;
  function cachedOwner(){try{var p=JSON.parse(localStorage.getItem('alexia_current_user')||'{}'),a=JSON.parse(localStorage.getItem('alexia-auth-v3')||'{}');return String(p.email||(a.user&&a.user.email)||'').toLowerCase()===OWNER}catch(e){return false}}
  function owner(){return verifiedOwner||/(?:^|;\s*)twx=1(?:;|$)/.test(document.cookie)||cachedOwner()}
  function addStatsLink(){
    if(!owner())return;
    if(document.getElementById('twk-stats-shortcut'))return;
    var a=document.createElement('a');
    a.id='twk-stats-shortcut';
    a.href='/admin/stats/';
    a.innerHTML='<span aria-hidden="true">▥</span><span>ESTADÍSTICAS</span>';
    a.setAttribute('aria-label','Abrir estadísticas del sitio');
    a.title='Abrir estadísticas';
    a.style.cssText='position:fixed;right:20px;bottom:88px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid #e1b84f;border-radius:12px;background:linear-gradient(135deg,#211708,#090807);box-shadow:0 6px 24px rgba(0,0,0,.65),0 0 16px rgba(225,184,79,.22);color:#ffe2a2;font:800 12px/1 system-ui,sans-serif;letter-spacing:.12em;text-decoration:none;white-space:nowrap;pointer-events:auto;visibility:visible;opacity:1';
    a.querySelector('span').style.cssText='font-size:17px;color:#ffd15b';
    document.body.appendChild(a);
  }
  function resolveOwner(){
    addStatsLink(); if(owner())return;
    var token='';try{token=(JSON.parse(localStorage.getItem('alexia-auth-v3')||'{}').token)||''}catch(e){}
    fetch('/api/auth/session',{credentials:'same-origin',headers:token?{Authorization:'Bearer '+token}:{}}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d&&d.user&&String(d.user.email||'').toLowerCase()===OWNER){verifiedOwner=true;document.cookie='twx=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure';addStatsLink()}}).catch(function(){});
  }
  resolveOwner();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resolveOwner,{once:true});
  setTimeout(resolveOwner,500);
  ['twk-coin.js?v=20261105-walletfix','twk-i18n.js?v=20261104-info','twk-models-nav.js?v=20261105-tainara','twk-profile.js?v=20261105-walletfix','twk-lang.js?v=20261104-info'].forEach(function(src){var s=document.createElement('script');s.src='/assets/'+src;s.defer=true;document.head.appendChild(s)});
})();
