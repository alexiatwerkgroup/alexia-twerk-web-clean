/* ═══ TWERKHUB · Locale switcher (EN / ES / RU) — in-page, no redirect ═══
 *
 * 2026-04-24-p2: v1 redirected to *.translate.goog which failed sometimes
 * and took the user off-domain. This version uses the official Google
 * Translate Element widget, which injects translation in-page without
 * navigating away. The widget's stock UI is hidden with CSS; we drive it
 * via `google.translate.TranslateElement` and the hidden `<select>` that
 * the widget mounts internally.
 *
 * Flow:
 *   1. Mount a hidden div #google_translate_element on DOMReady.
 *   2. Load https://translate.google.com/translate_a/element.js?cb=...
 *   3. Once the widget is up, build our own pill (EN · ES · RU) in the
 *      top-center; clicks set the hidden <select>'s value and dispatch a
 *      change event, which tells the widget to translate the whole page
 *      into the target language.
 *   4. The selected language is persisted in the Google Translate cookie
 *      (`googtrans`), so refreshing keeps the translation.
 *
 * Works on every page the script is included on. No backend, no API key,
 * no off-domain redirect.
 */
(function(){
  'use strict';
  if (window.__twerkhubLocaleSwitcherInit) return;
  window.__twerkhubLocaleSwitcherInit = true;

  var LANGS = ['en','es','ru'];
  var PERSIST_COOKIE = 'googtrans';

  // Read current language from the googtrans cookie (Google's canonical way).
  function readCookie(name){
    var c = document.cookie.split(';').map(function(s){ return s.trim(); });
    for (var i=0; i<c.length; i++) {
      if (c[i].indexOf(name + '=') === 0) {
        return decodeURIComponent(c[i].slice(name.length + 1));
      }
    }
    return '';
  }
  function writeCookie(name, val){
    // Set on both host and eTLD+1 to survive Google Translate's internals.
    var host = location.hostname;
    var root = host.replace(/^www\./,'');
    var expires = new Date(Date.now() + 30*24*3600*1000).toUTCString();
    var common = '; expires=' + expires + '; path=/';
    document.cookie = name + '=' + encodeURIComponent(val) + common;
    document.cookie = name + '=' + encodeURIComponent(val) + '; domain=' + host + common;
    if (root !== host) {
      document.cookie = name + '=' + encodeURIComponent(val) + '; domain=.' + root + common;
    }
  }
  function clearCookie(name){
    var host = location.hostname;
    var root = host.replace(/^www\./,'');
    var expired = '; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    document.cookie = name + '=' + expired;
    document.cookie = name + '=' + expired + '; domain=' + host;
    if (root !== host) document.cookie = name + '=' + expired + '; domain=.' + root;
  }

  function currentLang(){
    // Cookie format: "/en/es" means "translate from en to es". "/en/en" or
    // empty means "not translated".
    var raw = readCookie(PERSIST_COOKIE);
    var m = raw && raw.match(/^\/[a-z]+\/([a-z]{2,3})$/);
    if (m && LANGS.indexOf(m[1]) !== -1) return m[1];
    // Fallback to localStorage.
    try {
      var ls = localStorage.getItem('twerkhub_locale');
      if (ls && LANGS.indexOf(ls) !== -1) return ls;
    } catch(_){}
    return 'en';
  }

  // Style injection — pill top-center + hide Google's stock widget + banner.
  var STYLE = '\
#google_translate_element{position:absolute!important;left:-9999px!important;top:-9999px!important;height:0!important;width:0!important;overflow:hidden!important;}\
.goog-te-banner-frame,.skiptranslate,.goog-te-gadget-simple{display:none!important;visibility:hidden!important;}\
body{top:0!important;}\
html{margin-top:0!important;}\
.twerkhub-locale-switch{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:9800;display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:rgba(5,5,10,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);box-shadow:0 6px 20px rgba(0,0,0,.42);font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;}\
.twerkhub-locale-switch button{appearance:none;border:0;background:transparent;color:#c7c7d3;padding:6px 12px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:background .2s,color .2s,transform .2s;line-height:1;}\
.twerkhub-locale-switch button:hover{background:rgba(255,255,255,.06);color:#fff;}\
.twerkhub-locale-switch button.is-active{background:linear-gradient(135deg,#ff2d87,#9d4edd);color:#fff;box-shadow:0 3px 10px rgba(255,45,135,.4);}\
.twerkhub-locale-switch button.is-loading{opacity:.55;pointer-events:none;}\
@media (max-width:600px){.twerkhub-locale-switch{top:8px;}.twerkhub-locale-switch button{padding:5px 9px;font-size:9.5px;letter-spacing:.14em;}}\
@media print{.twerkhub-locale-switch{display:none!important;}}\
';

  function injectStyle(){
    if (document.querySelector('style[data-twerkhub-locale-switch]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-twerkhub-locale-switch','');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  // Mount a hidden element the Google widget can attach to.
  function mountWidgetTarget(){
    if (document.getElementById('google_translate_element')) return;
    var div = document.createElement('div');
    div.id = 'google_translate_element';
    document.body.appendChild(div);
  }

  // Load the Google Translate Element script exactly once.
  function loadGoogleTranslate(){
    if (window.__twerkhubGTLoaded) return;
    window.__twerkhubGTLoaded = true;
    // The callback name is called by Google once their JS finishes loading.
    window.googleTranslateElementInit = function(){
      try {
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: LANGS.join(','),
          autoDisplay: false,
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
      } catch(e){ console.warn('[twerkhub-locale] google translate init failed', e); }
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  // Switch the site language by setting the googtrans cookie AND poking the
  // hidden <select> the widget mounts. Cookie alone is enough on reload;
  // poking the select makes it instant without reload.
  function setLanguage(lang){
    try { localStorage.setItem('twerkhub_locale', lang); } catch(_){}
    if (lang === 'en') {
      clearCookie(PERSIST_COOKIE);
      // Ask Google Translate to revert to the original (reload). There is no
      // official in-place "restore" API so we reload — still no navigation
      // away from the domain, just a refresh of the current page.
      location.reload();
      return;
    }
    writeCookie(PERSIST_COOKIE, '/en/' + lang);
    var select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
    } else {
      // Widget not ready yet — reload so the cookie takes effect.
      location.reload();
    }
  }

  function buildPill(){
    injectStyle();
    if (document.querySelector('.twerkhub-locale-switch')) return;
    var wrap = document.createElement('div');
    wrap.className = 'twerkhub-locale-switch';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label','Language');
    var cur = currentLang();
    LANGS.forEach(function(lang){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = lang.toUpperCase();
      btn.setAttribute('data-lang', lang);
      if (lang === cur) btn.classList.add('is-active');
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        if (lang === cur) return;
        wrap.querySelectorAll('button').forEach(function(b){
          b.classList.remove('is-active');
          b.classList.add('is-loading');
        });
        btn.classList.add('is-active');
        setLanguage(lang);
      });
      wrap.appendChild(btn);
    });
    document.body.appendChild(wrap);
  }

  function init(){
    mountWidgetTarget();
    loadGoogleTranslate();
    buildPill();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
