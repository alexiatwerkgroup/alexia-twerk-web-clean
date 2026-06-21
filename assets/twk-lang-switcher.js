/* TWERKHUB · Language switcher · v3 (2026-06-20) — dropdown UI
 *
 * Transforma la fila .twk-nav-v1-lang en un desplegable (bandera + código + check)
 * manteniendo el diseño oscuro del sitio. Se carga en todas las páginas, así que el
 * dropdown aparece en todo el sitio sin tocar el HTML de cada página.
 *
 * Idiomas:
 *   - EN, ES, RU, PT  → tienen páginas físicas: navega a /es/ /ru/ /pt/ si existen,
 *     y si no, cae a traducción in-place de Google (no pierde el contexto de la página).
 *   - FR, DE, IT, CN(zh-CN), JP(ja), TR → traducción automática in-place de Google.
 */
(function(){
  'use strict';
  if (window.__twkLangSwitcherInit) return;
  window.__twkLangSwitcherInit = true;

  var GTRANS_COOKIE = 'googtrans';

  // Estrella de 5 puntas (centrada en 0,0) para banderas CN y TR
  var STAR = '0,-60 13.5,-18.6 57.1,-18.5 21.9,7.1 35.3,48.5 0,23 -35.3,48.5 -21.9,7.1 -57.1,-18.5 -13.5,-18.6';
  function flag(svg){ return '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' + svg + '</svg>'; }
  var FLAGS = {
    en: flag('<rect width="512" height="512" fill="#b22234"/><g fill="#fff"><rect y="39" width="512" height="40"/><rect y="118" width="512" height="40"/><rect y="197" width="512" height="40"/><rect y="276" width="512" height="40"/><rect y="355" width="512" height="40"/><rect y="434" width="512" height="40"/></g><rect width="256" height="276" fill="#3c3b6e"/>'),
    es: flag('<rect width="512" height="512" fill="#c60b1e"/><rect y="128" width="512" height="256" fill="#ffc400"/>'),
    fr: flag('<rect width="512" height="512" fill="#fff"/><rect width="171" height="512" fill="#0055a4"/><rect x="341" width="171" height="512" fill="#ef4135"/>'),
    pt: flag('<rect width="512" height="512" fill="#009b3a"/><polygon points="256,44 468,256 256,468 44,256" fill="#ffdf00"/><circle cx="256" cy="256" r="92" fill="#002776"/>'),
    de: flag('<rect width="512" height="512" fill="#000"/><rect y="171" width="512" height="171" fill="#dd0000"/><rect y="341" width="512" height="171" fill="#ffce00"/>'),
    it: flag('<rect width="512" height="512" fill="#fff"/><rect width="171" height="512" fill="#009246"/><rect x="341" width="171" height="512" fill="#ce2b37"/>'),
    cn: flag('<rect width="512" height="512" fill="#de2910"/><g transform="translate(256,256) scale(1.7)" fill="#ffde00"><polygon points="' + STAR + '"/></g>'),
    jp: flag('<rect width="512" height="512" fill="#fff"/><circle cx="256" cy="256" r="140" fill="#bc002d"/>'),
    ru: flag('<rect width="512" height="512" fill="#fff"/><rect y="171" width="512" height="171" fill="#0039a6"/><rect y="341" width="512" height="171" fill="#d52b1e"/>'),
    tr: flag('<rect width="512" height="512" fill="#e30a17"/><circle cx="232" cy="256" r="104" fill="#fff"/><circle cx="262" cy="256" r="82" fill="#e30a17"/><g transform="translate(338,256) scale(0.62)" fill="#fff"><polygon points="' + STAR + '"/></g>')
  };

  // code = id interno/display · hasPage = tiene /xx/ físico · gt = código Google Translate
  var LANGS = [
    { code:'en', label:'EN', hasPage:true,  gt:null     },
    { code:'es', label:'ES', hasPage:true,  gt:'es'     },
    { code:'fr', label:'FR', hasPage:false, gt:'fr'     },
    { code:'pt', label:'PT', hasPage:true,  gt:'pt'     },
    { code:'de', label:'DE', hasPage:false, gt:'de'     },
    { code:'it', label:'IT', hasPage:false, gt:'it'     },
    { code:'cn', label:'CN', hasPage:false, gt:'zh-CN'  },
    { code:'jp', label:'JP', hasPage:false, gt:'ja'     },
    { code:'ru', label:'RU', hasPage:true,  gt:'ru'     },
    { code:'tr', label:'TR', hasPage:false, gt:'tr'     }
  ];
  function byCode(c){ for (var i=0;i<LANGS.length;i++) if (LANGS[i].code===c) return LANGS[i]; return null; }
  function byGt(g){ for (var i=0;i<LANGS.length;i++) if (LANGS[i].gt===g) return LANGS[i]; return null; }

  function currentLang(){
    var p = location.pathname;
    if (p.indexOf('/es/') === 0) return 'es';
    if (p.indexOf('/ru/') === 0) return 'ru';
    if (p.indexOf('/pt/') === 0) return 'pt';
    var raw = readCookie(GTRANS_COOKIE);
    var m = raw && raw.match(/^\/[a-z]+\/([a-zA-Z\-]{2,5})$/);
    if (m){ var l = byGt(m[1]); if (l) return l.code; }
    return 'en';
  }

  function targetUrlFor(code){
    var p = location.pathname;
    var cur = (p.indexOf('/es/')===0)?'es':(p.indexOf('/ru/')===0)?'ru':(p.indexOf('/pt/')===0)?'pt':'en';
    var stripped = p;
    if (cur==='es') stripped = p.replace(/^\/es/, '') || '/';
    if (cur==='ru') stripped = p.replace(/^\/ru/, '') || '/';
    if (cur==='pt') stripped = p.replace(/^\/pt/, '') || '/';
    if (code==='en') return stripped;
    return '/' + code + (stripped === '/' ? '/' : stripped);
  }

  // ── Cookies (Google Translate usa `googtrans`) ─────────────────────
  function readCookie(name){
    var c = document.cookie.split(';').map(function(s){ return s.trim(); });
    for (var i=0;i<c.length;i++) if (c[i].indexOf(name+'=')===0) return decodeURIComponent(c[i].slice(name.length+1));
    return '';
  }
  function writeCookie(name, val){
    var host = location.hostname, root = host.replace(/^www\./,'');
    var common = '; expires=' + new Date(Date.now()+30*864e5).toUTCString() + '; path=/';
    document.cookie = name+'='+encodeURIComponent(val)+common;
    document.cookie = name+'='+encodeURIComponent(val)+'; domain='+host+common;
    if (root!==host) document.cookie = name+'='+encodeURIComponent(val)+'; domain=.'+root+common;
  }
  function clearCookie(name){
    var host = location.hostname, root = host.replace(/^www\./,'');
    var ex = '; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    document.cookie = name+'='+ex;
    document.cookie = name+'='+ex+'; domain='+host;
    if (root!==host) document.cookie = name+'='+ex+'; domain=.'+root;
  }

  // ── Google Translate fallback (lazy) ──────────────────────────────
  function ensureGoogleTranslate(){
    if (window.__twkGTLoaded) return;
    window.__twkGTLoaded = true;
    var st = document.createElement('style');
    st.textContent =
      '#google_translate_element{position:absolute!important;left:-9999px!important;top:-9999px!important;width:0!important;height:0!important;overflow:hidden!important;}' +
      '.goog-te-banner-frame,.skiptranslate,.goog-te-gadget-simple{display:none!important;visibility:hidden!important;}' +
      'body{top:0!important;}html{margin-top:0!important;}';
    document.head.appendChild(st);
    if (!document.getElementById('google_translate_element')){
      var div = document.createElement('div'); div.id = 'google_translate_element'; document.body.appendChild(div);
    }
    window.googleTranslateElementInit = function(){
      try {
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'es,ru,pt,fr,de,it,zh-CN,ja,tr',
          autoDisplay: false,
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
      } catch(e){}
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true; s.defer = true; document.head.appendChild(s);
  }
  function applyInPlaceTranslate(gt){
    if (!gt){ clearCookie(GTRANS_COOKIE); location.reload(); return; }
    writeCookie(GTRANS_COOKIE, '/en/' + gt);
    ensureGoogleTranslate();
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var sel = document.querySelector('.goog-te-combo');
      if (sel){ sel.value = gt; sel.dispatchEvent(new Event('change')); clearInterval(iv); }
      else if (tries > 20){ clearInterval(iv); location.reload(); }
    }, 300);
  }

  function selectLang(code){
    if (code === currentLang()) return;
    var l = byCode(code); if (!l) return;
    if (code === 'en'){
      var enUrl = targetUrlFor('en');
      if (enUrl !== location.pathname){ location.href = enUrl; return; }
      clearCookie(GTRANS_COOKIE); location.reload(); return;
    }
    if (l.hasPage){
      var url = targetUrlFor(code);
      try {
        var req = new XMLHttpRequest();
        req.open('HEAD', url, true); req.timeout = 3500;
        req.onload  = function(){ (req.status>=200 && req.status<400) ? (location.href=url) : applyInPlaceTranslate(l.gt); };
        req.onerror = function(){ applyInPlaceTranslate(l.gt); };
        req.ontimeout = function(){ applyInPlaceTranslate(l.gt); };
        req.send();
      } catch(_){ applyInPlaceTranslate(l.gt); }
    } else {
      applyInPlaceTranslate(l.gt);
    }
  }

  // ── Estilos del dropdown (acorde al nav oscuro) ───────────────────
  function injectCSS(){
    if (document.getElementById('twk-lang-dd-css')) return;
    var s = document.createElement('style'); s.id = 'twk-lang-dd-css';
    s.textContent =
      '.twk-lang-dd{position:relative;display:inline-flex;flex-shrink:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif;}' +
      '.twk-lang-dd-btn{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);color:#f5f5fb;font-size:12px;font-weight:800;letter-spacing:.08em;cursor:pointer;line-height:1;transition:background .15s,border-color .15s;}' +
      '.twk-lang-dd-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.32);}' +
      '.twk-lang-flag{width:18px;height:18px;border-radius:50%;overflow:hidden;display:block;flex:0 0 18px;box-shadow:0 0 0 1px rgba(255,255,255,.2);}' +
      '.twk-lang-flag svg{width:100%;height:100%;display:block;}' +
      '.twk-lang-caret{display:inline-flex;opacity:.7;transition:transform .18s;}' +
      '.twk-lang-dd.open .twk-lang-caret{transform:rotate(180deg);}' +
      '.twk-lang-dd-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:122px;margin:0;padding:6px;list-style:none;background:rgba(16,16,24,.98);border:1px solid rgba(255,255,255,.14);border-radius:14px;box-shadow:0 18px 44px rgba(0,0,0,.6);opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .16s,transform .16s,visibility .16s;z-index:99999;max-height:74vh;overflow:auto;}' +
      '.twk-lang-dd.open .twk-lang-dd-menu{opacity:1;visibility:visible;transform:translateY(0);}' +
      '.twk-lang-opt{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;color:#e8e8f0;font-size:13px;font-weight:700;letter-spacing:.05em;cursor:pointer;white-space:nowrap;}' +
      '.twk-lang-opt:hover{background:rgba(255,255,255,.09);}' +
      '.twk-lang-opt .twk-lang-code{flex:1;}' +
      '.twk-lang-opt .twk-lang-check{display:inline-flex;color:#1ee08f;opacity:0;}' +
      '.twk-lang-opt.is-active{background:rgba(30,224,143,.12);}' +
      '.twk-lang-opt.is-active .twk-lang-check{opacity:1;}';
    document.head.appendChild(s);
  }

  var CARET = '<svg class="twk-lang-caret-svg" viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHECK = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M2 7l3.5 3.5L12 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function build(){
    var host = document.querySelector('.twk-nav-v1-lang');
    if (!host || host.dataset.ddReady) return;
    host.dataset.ddReady = '1';
    injectCSS();

    var cur = currentLang();
    var curL = byCode(cur) || LANGS[0];

    var items = LANGS.map(function(l){
      return '<li class="twk-lang-opt' + (l.code===cur?' is-active':'') + '" role="option" data-code="' + l.code + '" tabindex="0">' +
               '<span class="twk-lang-flag">' + FLAGS[l.code] + '</span>' +
               '<span class="twk-lang-code">' + l.label + '</span>' +
               '<span class="twk-lang-check">' + CHECK + '</span>' +
             '</li>';
    }).join('');

    host.innerHTML =
      '<div class="twk-lang-dd">' +
        '<button type="button" class="twk-lang-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">' +
          '<span class="twk-lang-flag twk-lang-cur-flag">' + FLAGS[curL.code] + '</span>' +
          '<span class="twk-lang-cur-code">' + curL.label + '</span>' +
          '<span class="twk-lang-caret">' + CARET + '</span>' +
        '</button>' +
        '<ul class="twk-lang-dd-menu" role="listbox">' + items + '</ul>' +
      '</div>';

    var dd = host.querySelector('.twk-lang-dd');
    var btn = host.querySelector('.twk-lang-dd-btn');

    function close(){ dd.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
    function toggle(){ var o = dd.classList.toggle('open'); btn.setAttribute('aria-expanded', o?'true':'false'); }

    btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
    host.querySelectorAll('.twk-lang-opt').forEach(function(li){
      function go(){ close(); selectLang(li.getAttribute('data-code')); }
      li.addEventListener('click', go);
      li.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.key===' '){ e.preventDefault(); go(); } });
    });
    document.addEventListener('click', function(e){ if (!dd.contains(e.target)) close(); });
    document.addEventListener('keydown', function(e){ if (e.key==='Escape') close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once:true });
  else build();
})();
