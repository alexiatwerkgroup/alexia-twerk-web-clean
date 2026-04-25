/*!
 * ALEXIA TWERK · Global language switcher
 * Injects flag selector (🇺🇸 🇪🇸 🇷🇺) into every page's nav.
 * Remembers preference in localStorage; translates nav items + common UI.
 *
 * Version: 2026-04-17-01
 */
(function(){
  'use strict';
  if (window.__twerkI18nInjected) return;
  window.__twerkI18nInjected = true;

  var LS_KEY = 'alexia_lang_global';
  function getLang(){
    var urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang && /^(en|es|ru)$/.test(urlLang)) return urlLang;
    try { var s = localStorage.getItem(LS_KEY); if (s && /^(en|es|ru)$/.test(s)) return s; } catch(e){}
    return 'en';
  }
  function setLang(l){ try { localStorage.setItem(LS_KEY, l); } catch(e){} }

  // Minimal translations for common nav + UI across the site
  var I18N = {
    en: {
      'nav.home':'Home','nav.alexia':'Alexia Content','nav.playlist':'Playlist','nav.otherside':'Del Otro Lado',
      'nav.community':'Community','nav.top100':'Top 100','nav.bestdancers':'Best Dancers','nav.videopacks':'Video Packs',
      'nav.profile':'Profile','nav.online':'ONLINE NOW'
    },
    es: {
      'nav.home':'Inicio','nav.alexia':'Contenido Alexia','nav.playlist':'Archivo','nav.otherside':'Del Otro Lado',
      'nav.community':'Comunidad','nav.top100':'Top 100','nav.bestdancers':'Mejores Bailarinas','nav.videopacks':'Packs',
      'nav.profile':'Perfil','nav.online':'EN VIVO'
    },
    ru: {
      'nav.home':'Главная','nav.alexia':'Контент Alexia','nav.playlist':'Архив','nav.otherside':'Той Стороны',
      'nav.community':'Сообщество','nav.top100':'Топ 100','nav.bestdancers':'Лучшие Танцовщицы','nav.videopacks':'Паки',
      'nav.profile':'Профиль','nav.online':'В ЭФИРЕ'
    }
  };

  // Auto-tag common nav links based on href so they get translated without per-page HTML edits
  function autoTagNav(){
    var rules = [
      {href:/^\/(\?|$|index\.html$)/,   key:'nav.home'},
      {href:/alexia-twerk-leaks/,        key:'nav.alexia'},
      {href:/^\/playlist\/?(\?|$)/,      key:'nav.playlist'},
      {href:/community\.html/,           key:'nav.community'},
      {href:/top-100/,                   key:'nav.top100'},
      {href:/best-twerk-dancers/,        key:'nav.bestdancers'},
      {href:/alexia-video-packs/,        key:'nav.videopacks'},
      {href:/profile\.html/,             key:'nav.profile'}
    ];
    var links = document.querySelectorAll('.site-nav-final__links a, .topnav nav a');
    links.forEach(function(a){
      if (a.hasAttribute('data-i18n')) return;
      var href = a.getAttribute('href') || '';
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].href.test(href)) { a.setAttribute('data-i18n', rules[i].key); break; }
      }
    });
    // Online-now label
    document.querySelectorAll('.site-nav-final__online').forEach(function(w){
      var span = Array.prototype.find.call(w.querySelectorAll('span'), function(s){ return /online\s*now/i.test(s.textContent||''); });
      if (span && !span.hasAttribute('data-i18n')) span.setAttribute('data-i18n','nav.online');
    });
  }

  function applyLang(lang){
    var dict = I18N[lang] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.documentElement.lang = lang;
    setLang(lang);
    document.querySelectorAll('.gl-lang-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    var ind = document.getElementById('gl-lang-indicator');
    if (ind) {
      var order = ['en','es','ru'];
      var idx = Math.max(0, order.indexOf(lang));
      var isMobile = matchMedia('(max-width: 540px)').matches;
      var step = isMobile ? 32 : 36;
      ind.style.transform = 'translateX(' + (idx * step) + 'px)';
    }
  }

  function mount(){
    // Skip pages that already have their own switcher (e.g., Playlist 2)
    if (document.querySelector('.lang-switch, .gl-lang-switch')) {
      autoTagNav();
      applyLang(getLang());
      return;
    }

    // Where to insert: inside .site-nav-final__inner, at the end (right side)
    var host = document.querySelector('.site-nav-final__inner');
    if (!host) return;

    var sw = document.createElement('div');
    sw.className = 'gl-lang-switch';
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', 'Language');
    sw.innerHTML = [
      '<span class="gl-lang-indicator" id="gl-lang-indicator" aria-hidden="true"></span>',
      '<button type="button" class="gl-lang-btn" data-lang="en" title="English" aria-label="English">🇺🇸</button>',
      '<button type="button" class="gl-lang-btn" data-lang="es" title="Español" aria-label="Español">🇪🇸</button>',
      '<button type="button" class="gl-lang-btn" data-lang="ru" title="Русский" aria-label="Русский">🇷🇺</button>'
    ].join('');
    host.appendChild(sw);

    // Styles
    if (!document.getElementById('gl-lang-style')) {
      var css = document.createElement('style');
      css.id = 'gl-lang-style';
      css.textContent = [
        '.gl-lang-switch{position:relative;display:inline-flex;align-items:center;gap:2px;padding:3px;margin-left:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:999px;backdrop-filter:blur(12px) saturate(1.4);-webkit-backdrop-filter:blur(12px) saturate(1.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 3px 10px rgba(0,0,0,.25)}',
        '.gl-lang-indicator{position:absolute;top:3px;bottom:3px;left:3px;width:36px;border-radius:999px;background:linear-gradient(135deg,rgba(255,45,135,.95),rgba(157,78,221,.95));box-shadow:0 3px 12px rgba(255,45,135,.45),0 0 0 1px rgba(255,255,255,.12) inset;transition:transform .36s cubic-bezier(.3,1.2,.4,1);z-index:0;pointer-events:none}',
        '.gl-lang-btn{position:relative;z-index:1;width:36px;height:28px;border:none;background:transparent;color:#fff;font-size:16px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;transition:transform .25s cubic-bezier(.3,1.2,.4,1), filter .25s;filter:grayscale(.55) brightness(.85) saturate(.8)}',
        '.gl-lang-btn:hover{filter:grayscale(.2) brightness(1) saturate(1);transform:scale(1.08)}',
        '.gl-lang-btn.active{filter:grayscale(0) brightness(1.05) saturate(1.15);transform:scale(1.1)}',
        '@media (max-width:540px){.gl-lang-btn{width:32px;height:26px;font-size:14px}.gl-lang-indicator{width:32px}}'
      ].join('');
      document.head.appendChild(css);
    }

    // Wire click handlers
    sw.querySelectorAll('.gl-lang-btn').forEach(function(b){
      b.addEventListener('click', function(){ applyLang(b.dataset.lang); });
    });

    autoTagNav();
    applyLang(getLang());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
