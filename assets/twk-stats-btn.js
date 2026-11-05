(function(){
  if(window.__twkStats)return;
  window.__twkStats=1;
  // The persistent visitor counter is the single stats shortcut.
  ['twk-coin.js?v=20261105-ledger','twk-i18n.js?v=20261104-info','twk-models-nav.js?v=20261105-tainara','twk-profile.js?v=20261105-walletfix','twk-lang.js?v=20261104-info'].forEach(function(src){var s=document.createElement('script');s.src='/assets/'+src;s.defer=true;document.head.appendChild(s)});
})();
