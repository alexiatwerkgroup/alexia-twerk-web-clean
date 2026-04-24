/* ═══ TWERKHUB · Topbar enhance (online + locale slot) ═══
 * Universal adapter that, on every page:
 *   (1) Detects the site navbar (three possible legacy shapes).
 *   (2) Centers the nav inside the topbar (grid: brand | nav | right-cluster).
 *   (3) Injects an ONLINE NOW pill + a slot where the locale switcher will
 *       attach — both to the right of the nav.
 *   (4) Removes any leftover `.snf__on` / `.site-nav-final__online` pills
 *       that lived inside older layouts.
 *
 * The locale switcher (twerkhub-locale-switcher.js, loaded AFTER this one
 * normally but idempotent either way) looks for `.twerkhub-locale-slot` and
 * mounts inside it; falls back to its old fixed-top-right position only if
 * the slot is missing (e.g. on pages without a navbar).
 *
 * v20260424-p5
 */
(function(){
  'use strict';
  if (window.__twerkhubTopbarEnhanceInit) return;
  window.__twerkhubTopbarEnhanceInit = true;

  // Nav markup variants we have to support, in priority order.
  var NAV_WRAPPER_SELECTORS = [
    '.twerkhub-topbar-inner',
    '.snf__i',
    '.site-nav-final__inner'
  ];
  var NAV_SELECTORS = [
    '.twerkhub-nav',
    '.snf__l',
    '.site-nav-final__links'
  ];

  var STYLE = ''
    // ── Topbar polish · prolijo y consistente cross-browser ──
    + '.twerkhub-topbar,.snf,.site-nav-final{position:sticky;top:0;z-index:60;backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);background:linear-gradient(180deg,rgba(5,5,10,.88),rgba(5,5,10,.72));border-bottom:1px solid rgba(255,255,255,.06);}'
    + '.twerkhub-topbar-inner,.snf__i,.site-nav-final__inner{max-width:1480px;margin:0 auto;padding:12px 22px;}'
    // Brand · crisp gradient sub-label, mono small
    + '.twerkhub-brand,.twerkhub-pl-tb-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0;}'
    + '.twerkhub-brand-sub,.twerkhub-pl-tb-brand-sub{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,111,168,.85);line-height:1;white-space:nowrap;}'
    // Nav links · polished pills
    + '.twerkhub-nav,.snf__l,.site-nav-final__links{display:inline-flex;align-items:center;gap:2px;flex-wrap:wrap;}'
    + '.twerkhub-nav a,.snf__l a,.site-nav-final__links a{padding:8px 13px;border-radius:999px;font-family:"Inter",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(230,230,240,.78);text-decoration:none;border:1px solid transparent;transition:background .22s ease,color .22s ease,border-color .22s ease,transform .2s ease;white-space:nowrap;line-height:1;}'
    + '.twerkhub-nav a:hover,.snf__l a:hover,.site-nav-final__links a:hover{background:rgba(255,255,255,.06);color:#fff;border-color:rgba(255,255,255,.08);transform:translateY(-1px);}'
    + '.twerkhub-nav a.is-active,.twerkhub-nav a.active,.twerkhub-nav a[aria-current="page"],.snf__l a.is-active,.snf__l a.active,.site-nav-final__links a.is-active,.site-nav-final__links a.active{background:linear-gradient(135deg,#ff2d87,#9d4edd);color:#fff;border-color:rgba(255,45,135,.4);box-shadow:0 6px 18px rgba(255,45,135,.35);}'
    + '.twerkhub-nav a.is-active::after,.twerkhub-nav a.active::after,.twerkhub-nav a[aria-current="page"]::after,.snf__l a.is-active::after,.site-nav-final__links a.is-active::after{display:none;}'
    // Layout: brand | nav (centered) | right-cluster
    + '.twerkhub-topbar-inner{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;}'
    + '.twerkhub-topbar-inner > .twerkhub-brand{justify-self:start;}'
    + '.twerkhub-topbar-inner > .twerkhub-nav{justify-self:center;}'
    + '.twerkhub-topbar-inner > .twerkhub-topbar-right{justify-self:end;}'
    // Also normalise the legacy `.snf__i` and `.site-nav-final__inner`.
    + '.snf__i,.site-nav-final__inner{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;}'
    + '.snf__i > .snf__l,.site-nav-final__inner > .site-nav-final__links{justify-self:center;}'
    + '.snf__i > .twerkhub-topbar-right,.site-nav-final__inner > .twerkhub-topbar-right{justify-self:end;}'
    // Right-cluster wrapper
    + '.twerkhub-topbar-right{display:inline-flex;align-items:center;gap:10px;flex-shrink:0;}'
    // Online-now pill
    + '.twerkhub-online-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(30,224,143,.14);border:1px solid rgba(30,224,143,.5);font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#e8e8ef;line-height:1;white-space:nowrap;}'
    + '.twerkhub-online-pill .twerkhub-online-dot{width:7px;height:7px;border-radius:50%;background:#1ee08f;box-shadow:0 0 8px #1ee08f;animation:twerkhub-online-pulse 1.8s ease-in-out infinite;}'
    + '.twerkhub-online-pill .twerkhub-online-count{color:#1ee08f;letter-spacing:.04em;}'
    + '@keyframes twerkhub-online-pulse{0%,100%{opacity:1}50%{opacity:.35}}'
    // Kill any legacy online pill / music button / ONLINE NOW 891 etc.
    + '.snf__on,#snf-music-btn,.site-nav-final__online,.site-nav-final__music,.site-nav-final__dot,[data-alexia-online-count]{display:none!important;}'
    // Logo hover zoom — applies to EVERY nav shape · only the img scales
    // so the `Est. 2018` sub-label underneath stays in place and never gets
    // covered. transform-origin left keeps the growth to the right.
    + '.twerkhub-topbar .twerkhub-brand img,'
    + '.twerkhub-pl-tb-brand img,'
    + '.snf__i a[class*="brand"] img,'
    + '.site-nav-final__inner a[class*="brand"] img{transition:transform .32s cubic-bezier(.2,1.1,.3,1),filter .32s ease;transform-origin:left center;will-change:transform;}'
    + '.twerkhub-topbar .twerkhub-brand:hover img,'
    + '.twerkhub-pl-tb-brand:hover img,'
    + '.snf__i a[class*="brand"]:hover img,'
    + '.site-nav-final__inner a[class*="brand"]:hover img{transform:scale(1.18);filter:drop-shadow(0 6px 14px rgba(255,45,135,.55));}'
    // Cancel the old container-level scale that was covering the sub-label.
    + '.twerkhub-topbar .twerkhub-brand:hover,'
    + '.twerkhub-pl-tb-brand:hover{transform:none!important;}'
    // Brand sub-label needs a little extra vertical room so the zoomed logo
    // never crops it even at peak scale.
    + '.twerkhub-brand-sub,.twerkhub-pl-tb-brand-sub{position:relative;z-index:1;}'
    // Responsive: below 980px the nav wraps; online-pill hides "Online now" label
    + '@media (max-width:980px){'
    + '  .twerkhub-topbar-inner,.snf__i,.site-nav-final__inner{grid-template-columns:auto 1fr auto;}'
    + '  .twerkhub-online-pill .twerkhub-online-label{display:none;}'
    + '}'
    // On real mobile, the hamburger takes over — hide desktop nav + right-cluster label
    + '@media (max-width:880px){'
    + '  .twerkhub-nav,.snf__l,.site-nav-final__links{display:none!important;}'
    + '  .twerkhub-topbar-inner,.snf__i,.site-nav-final__inner{grid-template-columns:1fr auto!important;}'
    + '  .twerkhub-topbar-inner > .twerkhub-brand{justify-self:start;margin-left:56px;}'
    + '  .twerkhub-topbar-right{gap:6px;}'
    + '}'
    ;

  function injectStyle(){
    if (document.querySelector('style[data-twerkhub-topbar-enhance]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-twerkhub-topbar-enhance', '');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function findFirstSelector(selectors){
    for (var i=0; i<selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  // Try to pull a live count from a data attribute the server may have set;
  // otherwise use a stable-random-ish number in 800–1,400 range.
  function pickCount(){
    var el = document.querySelector('[data-alexia-online-count]');
    if (el) {
      var n = parseInt((el.textContent||'').replace(/[^\d]/g,''), 10);
      if (!isNaN(n) && n > 0) return n;
    }
    try {
      var cached = Number(sessionStorage.getItem('twerkhub_online_count_v1'));
      if (cached && cached >= 600 && cached <= 1600) return cached;
    } catch(_){}
    var base = 891 + (Math.floor(Math.random()*180) - 90);
    try { sessionStorage.setItem('twerkhub_online_count_v1', String(base)); } catch(_){}
    return base;
  }

  function mount(){
    var navWrap = findFirstSelector(NAV_WRAPPER_SELECTORS);
    if (!navWrap) return;
    // Skip if already enhanced.
    if (navWrap.querySelector('.twerkhub-topbar-right')) return;

    injectStyle();

    // Clean legacy pills inside this wrapper.
    navWrap.querySelectorAll('.snf__on, #snf-music-btn, .site-nav-final__online, .site-nav-final__music')
      .forEach(function(el){ try { el.remove(); } catch(_){} });

    var right = document.createElement('div');
    right.className = 'twerkhub-topbar-right';

    var online = document.createElement('span');
    online.className = 'twerkhub-online-pill';
    online.title = 'Members connected right now';
    var count = pickCount();
    online.innerHTML =
      '<span class="twerkhub-online-dot" aria-hidden="true"></span>' +
      '<span class="twerkhub-online-label">Online now</span>' +
      '<span class="twerkhub-online-count">' + count.toLocaleString('en-US') + '</span>';

    var localeSlot = document.createElement('div');
    localeSlot.className = 'twerkhub-locale-slot';

    right.appendChild(online);
    right.appendChild(localeSlot);
    navWrap.appendChild(right);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  // Re-check when other scripts inject nav markup late (defensive).
  setTimeout(mount, 800);
  setTimeout(mount, 2500);
})();
