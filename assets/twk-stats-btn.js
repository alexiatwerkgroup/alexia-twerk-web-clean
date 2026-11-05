(function(){
  if(window.__twkStats)return;
  window.__twkStats=1;
  function owner(){return /(?:^|;\s*)twx=1(?:;|$)/.test(document.cookie)}
  function addStatsLink(){
    if(!owner())return;
    var nav=document.querySelector('.tn2-lk');
    if(!nav||document.getElementById('twk-stats-shortcut'))return;
    var a=document.createElement('a');
    a.id='twk-stats-shortcut';
    a.className='twk-stats-nav';
    a.href='/admin/stats/';
    a.textContent='ESTADÍSTICAS';
    a.setAttribute('aria-label','Abrir estadísticas del sitio');
    a.title='Abrir estadísticas';
    a.style.cssText='border:1px solid #b58a3d;border-radius:9px;background:#100d08;color:#ffe2a2;font-weight:800;padding:8px 11px;letter-spacing:.08em;white-space:nowrap';
    var account=Array.prototype.find.call(nav.querySelectorAll('a'),function(x){return /account/i.test(x.href)});
    if(account)nav.insertBefore(a,account);else nav.appendChild(a);
  }
  addStatsLink();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addStatsLink,{once:true});
  setTimeout(addStatsLink,500);
  ['twk-coin.js?v=1','twk-i18n.js?v=20261104-info','twk-models-nav.js?v=6','twk-profile.js?v=1','twk-lang.js?v=20261104-info'].forEach(function(src){var s=document.createElement('script');s.src='/assets/'+src;s.defer=true;document.head.appendChild(s)});
})();
