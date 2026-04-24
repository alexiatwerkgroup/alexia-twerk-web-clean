/* ═══ TWERKHUB · Locale switcher (EN / ES / RU) ═══
 * Renders a minimal top-right pill with EN · ES · RU. EN is the source (the
 * site is English-first by SAGRADA #1). ES and RU use Google Translate proxy
 * (*.translate.goog) — zero-config, no i18n keys in the HTML, works on every
 * page instantly.
 *
 * v20260424-p1
 */
(function(){
  'use strict';
  if (window.__twerkhubLocaleSwitcherInit) return;
  window.__twerkhubLocaleSwitcherInit = true;

  // If already inside a translate.goog proxy, show which one and expose a way
  // back to English. Don't duplicate the switcher inside the proxied document.
  function currentLocale(){
    var host = location.hostname;
    var m = host.match(/^([a-z-]+?)\.translate\.goog$/i);
    // translate.goog pages read the target lang from ?_x_tr_tl=
    var qs = new URLSearchParams(location.search);
    var tl = qs.get('_x_tr_tl');
    if (tl && /^(es|ru)$/i.test(tl)) return tl.toLowerCase();
    if (m) {
      // Fallback — original site inside subdomain mangled hostname
      return 'en';
    }
    return 'en';
  }

  function buildUrlFor(lang){
    if (lang === 'en') {
      // Drop out of the translate proxy and return to the clean domain.
      return 'https://alexiatwerkgroup.com' + location.pathname + location.search + location.hash;
    }
    // Google Translate proxy format:
    // https://alexiatwerkgroup-com.translate.goog/<path>?_x_tr_sl=en&_x_tr_tl=<lang>&_x_tr_hl=<lang>
    var path = location.pathname + location.search + location.hash;
    var base = 'https://alexiatwerkgroup-com.translate.goog';
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return base + path + sep + '_x_tr_sl=en&_x_tr_tl=' + encodeURIComponent(lang) + '&_x_tr_hl=' + encodeURIComponent(lang);
  }

  var STYLE = '\
.twerkhub-locale-switch{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:9800;display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:rgba(5,5,10,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);box-shadow:0 6px 20px rgba(0,0,0,.4);font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;}\
.twerkhub-locale-switch button{appearance:none;border:0;background:transparent;color:#c7c7d3;padding:6px 12px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:background .2s,color .2s;line-height:1;}\
.twerkhub-locale-switch button:hover{background:rgba(255,255,255,.06);color:#fff;}\
.twerkhub-locale-switch button.is-active{background:linear-gradient(135deg,#ff2d87,#9d4edd);color:#fff;box-shadow:0 3px 10px rgba(255,45,135,.4);}\
@media (max-width:600px){.twerkhub-locale-switch{top:8px;}.twerkhub-locale-switch button{padding:5px 9px;font-size:9.5px;letter-spacing:.14em;}}\
@media print{.twerkhub-locale-switch{display:none!important;}}\
';

  function mount(){
    if (document.querySelector('.twerkhub-locale-switch')) return;

    var style = document.createElement('style');
    style.setAttribute('data-twerkhub-locale-switch','');
    style.textContent = STYLE;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'twerkhub-locale-switch';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label','Language');
    var cur = currentLocale();
    ['en','es','ru'].forEach(function(lang){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = lang.toUpperCase();
      btn.setAttribute('data-lang', lang);
      if (lang === cur) btn.classList.add('is-active');
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        if (lang === cur) return;
        try {
          localStorage.setItem('twerkhub_locale', lang);
        } catch(_){}
        location.href = buildUrlFor(lang);
      });
      wrap.appendChild(btn);
    });
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
