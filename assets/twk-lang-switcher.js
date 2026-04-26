/* TWERKHUB · Language switcher click handler · v2 (2026-04-26-p2)
 *
 * Strategy (in order):
 *   1. Compute the equivalent /es/* or /ru/* path for the current page.
 *   2. HEAD-check that path. If it returns 2xx/3xx → navigate there.
 *   3. If it 404s, instead of dropping the user on /es/ or /ru/ home (which
 *      breaks page context — they just clicked RU on /community.html and
 *      ended up on /ru/index.html), fall back to in-place Google Translate:
 *      set the `googtrans` cookie, lazy-load the Google Translate widget,
 *      and trigger translation via the hidden <select>. The current page
 *      stays loaded, just rewritten in RU/ES.
 *   4. Going back to EN clears the cookie + reloads.
 */
(function(){
  'use strict';
  if (window.__twkLangSwitcherInit) return;
  window.__twkLangSwitcherInit = true;

  var LANGS = ['en','es','ru'];
  var GTRANS_COOKIE = 'googtrans';

  function currentLang(){
    var p = location.pathname;
    if (p.indexOf('/es/') === 0) return 'es';
    if (p.indexOf('/ru/') === 0) return 'ru';
    // Also detect translated state via cookie (in-place fallback)
    var raw = readCookie(GTRANS_COOKIE);
    var m = raw && raw.match(/^\/[a-z]+\/([a-z]{2,3})$/);
    if (m && LANGS.indexOf(m[1]) !== -1) return m[1];
    return 'en';
  }

  function targetUrlFor(lang){
    var p = location.pathname;
    var cur = (location.pathname.indexOf('/es/') === 0) ? 'es'
            : (location.pathname.indexOf('/ru/') === 0) ? 'ru'
            : 'en';
    var stripped = p;
    if (cur === 'es') stripped = p.replace(/^\/es/, '') || '/';
    if (cur === 'ru') stripped = p.replace(/^\/ru/, '') || '/';
    if (lang === 'en') return stripped;
    return '/' + lang + (stripped === '/' ? '/' : stripped);
  }

  // ── Cookie helpers (Google Translate uses `googtrans`) ─────────────
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
    document.cookie = name + '=' + expired + '; path=/';
    document.cookie = name + '=' + expired + '; path=/; domain=' + host;
    if (root !== host) document.cookie = name + '=' + expired + '; path=/; domain=.' + root;
  }

  // ── Google Translate fallback (lazy-loaded only when navigation 404s) ──
  function ensureGoogleTranslate(){
    if (window.__twkGTLoaded) return;
    window.__twkGTLoaded = true;
    // Hidden mount point + style to suppress Google's stock UI/banner
    var st = document.createElement('style');
    st.textContent =
      '#google_translate_element{position:absolute!important;left:-9999px!important;top:-9999px!important;width:0!important;height:0!important;overflow:hidden!important;}' +
      '.goog-te-banner-frame,.skiptranslate,.goog-te-gadget-simple{display:none!important;visibility:hidden!important;}' +
      'body{top:0!important;}html{margin-top:0!important;}';
    document.head.appendChild(st);
    if (!document.getElementById('google_translate_element')) {
      var div = document.createElement('div');
      div.id = 'google_translate_element';
      document.body.appendChild(div);
    }
    window.googleTranslateElementInit = function(){
      try {
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,es,ru',
          autoDisplay: false,
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
      } catch(e){ /* quiet */ }
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }
  function applyInPlaceTranslate(lang){
    if (lang === 'en') {
      clearCookie(GTRANS_COOKIE);
      location.reload();
      return;
    }
    writeCookie(GTRANS_COOKIE, '/en/' + lang);
    ensureGoogleTranslate();
    // Try poking the hidden Google select. Retry briefly if it isn't mounted yet.
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var sel = document.querySelector('.goog-te-combo');
      if (sel) {
        sel.value = lang;
        sel.dispatchEvent(new Event('change'));
        clearInterval(iv);
      } else if (tries > 20) {
        // ~6s timeout — just reload so the cookie kicks in
        clearInterval(iv);
        location.reload();
      }
    }, 300);
  }

  function paintActiveState(lang){
    var nav = document.querySelector('.twk-nav-v1-lang');
    if (!nav) return;
    nav.querySelectorAll('a[data-lang]').forEach(function(a){
      a.classList.toggle('is-active', a.getAttribute('data-lang') === lang);
    });
  }

  function attach(){
    var nav = document.querySelector('.twk-nav-v1-lang');
    if (!nav) return;
    // Reflect current language in active state (catches in-place translated state)
    paintActiveState(currentLang());

    var links = nav.querySelectorAll('a[data-lang]');
    links.forEach(function(a){
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        var lang = a.getAttribute('data-lang');
        if (lang === currentLang()) return;

        // EN target on a /es/ or /ru/ page → strip prefix and navigate
        // EN target on an in-place-translated EN page → just clear cookie + reload
        if (lang === 'en') {
          var enUrl = targetUrlFor('en');
          if (enUrl !== location.pathname) { location.href = enUrl; return; }
          clearCookie(GTRANS_COOKIE);
          location.reload();
          return;
        }

        var url = targetUrlFor(lang);
        // HEAD-check: if the physical translated page exists, navigate there.
        // If it 404s, fall back to in-place Google Translate (don't dump
        // the user on /lang/ root — that loses page context).
        try {
          var req = new XMLHttpRequest();
          req.open('HEAD', url, true);
          req.timeout = 3500;
          req.onload  = function(){
            if (req.status >= 200 && req.status < 400) location.href = url;
            else applyInPlaceTranslate(lang);
          };
          req.onerror = function(){ applyInPlaceTranslate(lang); };
          req.ontimeout = function(){ applyInPlaceTranslate(lang); };
          req.send();
        } catch(_){
          applyInPlaceTranslate(lang);
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
