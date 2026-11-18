(function(){
  if(window.__twkStats)return;
  window.__twkStats=1;
  function showJoinCTA(){
    var token='';try{token=(JSON.parse(localStorage.getItem('alexia-auth-v3')||'{}').token)||''}catch(e){}
    if(token){try{var p=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(!p.exp||p.exp*1000>Date.now())return}catch(e){}}
    var lang=(document.documentElement.lang||'en').toLowerCase().slice(0,2),label=lang==='es'?'CREAR CUENTA · +200':lang==='pt'?'CRIAR CONTA · +200':'JOIN FREE · +200';
    document.querySelectorAll('.tn2-lk a[href="/account"],.tn2 details nav a[href="/account"]').forEach(function(a){a.href='/account?utm_source=nav_join';a.textContent=label;a.classList.add('twk-join-cta');a.setAttribute('aria-label',label)});
  }
  function styleJoinCTA(){if(document.getElementById('twk-join-cta-style'))return;var s=document.createElement('style');s.id='twk-join-cta-style';s.textContent='.tn2-lk a.twk-join-cta,.tn2 details nav a.twk-join-cta{display:inline-flex;align-items:center;justify-content:center;border:1px solid #e8b84a;border-radius:10px;background:linear-gradient(180deg,#ffe27a,#e8b84a);color:#1a1100!important;font-weight:900;letter-spacing:.08em;padding:10px 13px;white-space:nowrap}.tn2 details nav a.twk-join-cta{margin:8px 12px;padding:12px 14px}';document.head.appendChild(s)}
  styleJoinCTA();showJoinCTA();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showJoinCTA,{once:true});
  setTimeout(showJoinCTA,1200);
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
  ['novinhas-hunter.js?v=20261115-rep3','twk-coin.js?v=20261115-tkb4','twk-i18n.js?v=20261116-es1','twk-models-nav.js?v=20261105-alexia-paused-5','twk-profile.js?v=20261105-walletfix','twk-lang.js?v=20261104-info'].forEach(function(src){var s=document.createElement('script');s.src='/assets/'+src;s.defer=true;document.head.appendChild(s)});
})();
