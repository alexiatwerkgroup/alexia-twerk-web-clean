/* ═══ TWERKHUB · Mobile nav (hamburger drawer) ═══
 * The site has three legacy nav markup shapes across pages:
 *   - .twerkhub-nav   (index.html + playlists)
 *   - .snf__l         (account, membership, community)
 *   - .site-nav-final__links  (profile, top-100)
 * All of them hide or collapse awkwardly under ~880px and on phones the nav
 * often disappears entirely. This module is a universal adapter:
 *   - Detects each known nav
 *   - Adds a hamburger button fixed on the top-left, only visible on phones
 *   - Builds a drawer overlay populated from the existing nav's <a> links
 *   - The drawer is a full-width sheet that slides in from the left
 *   - Click on a link (or the backdrop) closes it
 * Idempotent, progressive-enhancement style · v20260424-p1
 */
(function(){
  'use strict';
  if (window.__twerkhubMobileNavInit) return;
  window.__twerkhubMobileNavInit = true;

  var NAV_SELECTORS = [
    '.twerkhub-nav',
    '.snf__l',
    '.site-nav-final__links'
  ];

  var STYLE = '\
.twerkhub-mnav-btn{position:fixed;top:12px;left:12px;z-index:9850;width:44px;height:44px;border-radius:12px;background:rgba(5,5,10,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45);}\
.twerkhub-mnav-btn span{display:block;width:20px;height:2px;background:#fff;border-radius:2px;position:relative;}\
.twerkhub-mnav-btn span::before,.twerkhub-mnav-btn span::after{content:"";position:absolute;left:0;width:20px;height:2px;background:#fff;border-radius:2px;transition:transform .25s,top .25s;}\
.twerkhub-mnav-btn span::before{top:-6px;}\
.twerkhub-mnav-btn span::after{top:6px;}\
.twerkhub-mnav-btn.is-open span{background:transparent;}\
.twerkhub-mnav-btn.is-open span::before{top:0;transform:rotate(45deg);}\
.twerkhub-mnav-btn.is-open span::after{top:0;transform:rotate(-45deg);}\
.twerkhub-mnav-backdrop{position:fixed;inset:0;z-index:9840;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .28s;}\
.twerkhub-mnav-backdrop.is-open{opacity:1;pointer-events:auto;}\
.twerkhub-mnav-drawer{position:fixed;top:0;left:0;bottom:0;width:min(82vw,320px);z-index:9845;background:linear-gradient(180deg,#05050a 0%,#0a0a14 100%);border-right:1px solid rgba(255,45,135,.2);box-shadow:20px 0 50px rgba(0,0,0,.6);transform:translateX(-100%);transition:transform .32s cubic-bezier(.2,1.2,.3,1);padding:70px 22px 28px;overflow-y:auto;overscroll-behavior:contain;}\
.twerkhub-mnav-drawer.is-open{transform:translateX(0);}\
.twerkhub-mnav-drawer a{display:flex;align-items:center;gap:10px;padding:14px 14px;border-radius:12px;color:#f5f5fb;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;border:1px solid transparent;transition:background .2s,border-color .2s,transform .2s;margin-bottom:6px;}\
.twerkhub-mnav-drawer a:hover,.twerkhub-mnav-drawer a:focus{background:rgba(255,255,255,.04);border-color:rgba(255,45,135,.35);transform:translateX(2px);}\
.twerkhub-mnav-drawer a.is-active{background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(157,78,221,.12));border-color:rgba(255,45,135,.55);color:#fff;}\
.twerkhub-mnav-drawer-head{position:absolute;top:16px;left:20px;right:20px;font-family:"Playfair Display",Georgia,serif;font-size:16px;font-weight:800;color:#ff6fa8;letter-spacing:-.005em;}\
@media (max-width:880px){.twerkhub-mnav-btn{display:inline-flex;}}\
@media print{.twerkhub-mnav-btn,.twerkhub-mnav-drawer,.twerkhub-mnav-backdrop{display:none!important;}}\
';

  function findFirstNav(){
    for (var i=0; i<NAV_SELECTORS.length; i++){
      var nav = document.querySelector(NAV_SELECTORS[i]);
      if (nav) return nav;
    }
    return null;
  }

  function collectLinks(nav){
    var links = [];
    nav.querySelectorAll('a').forEach(function(a){
      // Skip if link is hidden (e.g. brand/logo wrappers)
      if (a.offsetParent === null && !a.getAttribute('href')) return;
      var txt = (a.textContent || '').trim();
      if (!txt) return;
      links.push({
        href: a.getAttribute('href') || '#',
        text: txt,
        active: a.classList.contains('is-active') || a.classList.contains('active') || a.getAttribute('aria-current') === 'page'
      });
    });
    return links;
  }

  function mount(){
    var nav = findFirstNav();
    if (!nav) return;

    // Inject style once.
    if (!document.querySelector('style[data-twerkhub-mnav]')) {
      var s = document.createElement('style');
      s.setAttribute('data-twerkhub-mnav', '');
      s.textContent = STYLE;
      document.head.appendChild(s);
    }

    // Hamburger.
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'twerkhub-mnav-btn';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span aria-hidden="true"></span>';
    document.body.appendChild(btn);

    // Backdrop + drawer.
    var backdrop = document.createElement('div');
    backdrop.className = 'twerkhub-mnav-backdrop';
    document.body.appendChild(backdrop);

    var drawer = document.createElement('nav');
    drawer.className = 'twerkhub-mnav-drawer';
    drawer.setAttribute('aria-label', 'Mobile menu');

    var head = document.createElement('div');
    head.className = 'twerkhub-mnav-drawer-head';
    head.textContent = 'Twerkhub';
    drawer.appendChild(head);

    collectLinks(nav).forEach(function(item){
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      if (item.active) a.classList.add('is-active');
      drawer.appendChild(a);
    });
    document.body.appendChild(drawer);

    function close(){
      btn.classList.remove('is-open');
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    function open(){
      btn.classList.add('is-open');
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    btn.addEventListener('click', function(){
      (drawer.classList.contains('is-open') ? close : open)();
    });
    backdrop.addEventListener('click', close);
    drawer.addEventListener('click', function(ev){
      var a = ev.target.closest('a');
      if (a) close();
    });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
