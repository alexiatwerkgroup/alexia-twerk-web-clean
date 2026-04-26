/* TWERKHUB · Language switcher click handler · v1
 * Translates the current path into its EN/ES/RU equivalent and navigates.
 * Falls back to the language root if no exact translation exists. */
(function(){
  'use strict';
  if (window.__twkLangSwitcherInit) return;
  window.__twkLangSwitcherInit = true;

  function currentLang(){
    var p = location.pathname;
    if (p.indexOf('/es/') === 0) return 'es';
    if (p.indexOf('/ru/') === 0) return 'ru';
    return 'en';
  }

  function targetUrlFor(lang){
    var p = location.pathname;
    var cur = currentLang();
    // Strip current lang prefix
    var stripped = p;
    if (cur === 'es') stripped = p.replace(/^\/es/, '') || '/';
    if (cur === 'ru') stripped = p.replace(/^\/ru/, '') || '/';
    if (lang === 'en') return stripped;
    return '/' + lang + (stripped === '/' ? '/' : stripped);
  }

  function attach(){
    var nav = document.querySelector('.twk-nav-v1-lang');
    if (!nav) return;
    var links = nav.querySelectorAll('a[data-lang]');
    links.forEach(function(a){
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        var lang = a.getAttribute('data-lang');
        var url = targetUrlFor(lang);
        // Try a HEAD request to confirm existence, fall back to /lang/ root
        try {
          var req = new XMLHttpRequest();
          req.open('HEAD', url, true);
          req.timeout = 3500;
          req.onload  = function(){ location.href = (req.status >= 200 && req.status < 400) ? url : ('/' + lang + '/'); };
          req.onerror = function(){ location.href = '/' + lang + '/'; };
          req.ontimeout = function(){ location.href = '/' + lang + '/'; };
          req.send();
        } catch(_){
          location.href = '/' + lang + '/';
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();
