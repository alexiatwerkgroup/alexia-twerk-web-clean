/* TWERKHUB · Home retention engine · v1 (2026-05-08)
 *
 * GOAL: push users into content within 3-5s. Improve retention from 39s avg.
 *
 * FEATURES (lightweight, lazy, no deps):
 *   1. Click history tracker (localStorage) — every playlist/creator/blog click
 *   2. Continue Watching strip ABOVE the hero (only if returning user)
 *   3. First-time funnel pill (only if NO history + idle 4s on home)
 *   4. Pages-per-session counter (sessionStorage)
 *   5. Smart Quick Nav chips next to hero CTAs → /profile, /community,
 *      /membership, /creators (sections with proven engagement)
 *   6. Auto-prefetch on hover for the most likely next page
 *
 * RULES:
 *   - DOM ops happen AFTER DOMContentLoaded (no render block)
 *   - All injects are non-disruptive (above hero or appended to existing CTA bar)
 *   - Mobile-aware (chips wrap, strip shrinks)
 *   - Self-disabling on /profile, /account, /community, /membership (only home)
 */
(function(){
  'use strict';
  if (window.__twkHomeRetentionInit) return;
  window.__twkHomeRetentionInit = true;

  // Only run on home pages — / and /index.html
  var path = location.pathname.replace(/\/index\.html$/, '/');
  if (path !== '/' && path !== '/es/' && path !== '/ru/' && path !== '/ja/' && path !== '/ko/') return;

  // ─── Storage keys ─────────────────────────────────────────────────────
  var HISTORY_KEY = 'twk_watch_history_v1';
  var DISMISS_KEY = 'twk_resume_dismissed_v1';
  var FUNNEL_KEY  = 'twk_funnel_dismissed_v1';
  var PAGES_KEY   = 'twk_pages_per_session';
  var MAX_HISTORY = 20;

  function lsGet(key, fallback){
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(_){ return fallback; }
  }
  function lsSet(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(_){}
  }
  function ssGet(key, fallback){
    try { var v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(_){ return fallback; }
  }
  function ssSet(key, val){
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch(_){}
  }

  // ─── 1. Click tracker ─────────────────────────────────────────────────
  // Captura clicks en cualquier link interno relevante (playlist, creator,
  // blog, video page) y guarda en localStorage para mostrar como
  // "Continue watching" cuando vuelva.
  var TRACKED_PATTERNS = [
    /\/playlist\//,
    /\/creator\//,
    /\/creators[-.]/,
    /\/ttl-latin-models\//,
    /\/try-on-hot-leaks\//,
    /\/korean-girls-kpop-twerk\//,
    /\/hottest-cosplay-fancam\//,
    /\/blog\//,
    /\/community/,
    /\/membership/,
    /alexia-video-packs/,
    /alexia-twerk-leaks/,
  ];

  function isTrackable(href){
    if (!href || href === '#' || href.indexOf('#') === 0) return false;
    if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return false;
    if (href.indexOf('http') === 0 && href.indexOf('alexiatwerkgroup.com') === -1) return false;
    return TRACKED_PATTERNS.some(function(re){ return re.test(href); });
  }

  function getTitleFromLink(link){
    return (link.getAttribute('aria-label') ||
            (link.querySelector('h2,h3,.twerkhub-fp-title,.rk-title,.twerkhub-pl-title')||{}).textContent ||
            link.textContent || '').trim().slice(0, 80) || 'untitled';
  }
  function getThumbFromLink(link){
    var img = link.querySelector('img');
    return img ? img.src : '';
  }

  document.addEventListener('click', function(e){
    var link = e.target && e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!isTrackable(href)) return;

    var entry = {
      url: href,
      title: getTitleFromLink(link),
      thumb: getThumbFromLink(link),
      ts: Date.now()
    };
    var h = lsGet(HISTORY_KEY, []);
    h = h.filter(function(x){ return x.url !== href; });
    h.unshift(entry);
    lsSet(HISTORY_KEY, h.slice(0, MAX_HISTORY));
  }, true);

  // ─── 2. Pages per session counter ─────────────────────────────────────
  var pages = ssGet(PAGES_KEY, 0);
  ssSet(PAGES_KEY, pages + 1);

  // ─── 3. Inject CSS once ──────────────────────────────────────────────
  function injectCSS(){
    if (document.getElementById('twk-home-retention-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-home-retention-css';
    st.textContent = [
      // Resume strip (above hero, full width)
      '.twk-resume-strip{',
        'position:relative;width:100%;',
        'background:linear-gradient(90deg,rgba(255,144,0,.12),rgba(255,45,135,.08));',
        'border-bottom:1px solid rgba(255,144,0,.25);',
        'overflow:hidden;',
      '}',
      '.twk-resume-inner{',
        'max-width:1320px;margin:0 auto;padding:10px 18px;',
        'display:flex;align-items:center;gap:14px;',
        'font-family:"Inter",ui-sans-serif,system-ui,sans-serif;',
      '}',
      '.twk-resume-label{',
        'font-family:"JetBrains Mono",ui-monospace,monospace;',
        'font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;',
        'color:#ff9000;flex-shrink:0;',
      '}',
      '.twk-resume-list{',
        'display:flex;gap:8px;flex:1;min-width:0;overflow-x:auto;',
        '-webkit-overflow-scrolling:touch;scrollbar-width:none;',
      '}',
      '.twk-resume-list::-webkit-scrollbar{display:none}',
      '.twk-resume-item{',
        'display:inline-flex;align-items:center;gap:8px;',
        'padding:5px 10px 5px 6px;border-radius:999px;',
        'background:rgba(0,0,0,.45);border:1px solid rgba(255,144,0,.3);',
        'color:#fff;text-decoration:none;font-size:12.5px;font-weight:600;',
        'white-space:nowrap;flex-shrink:0;max-width:240px;',
        'transition:background .15s,border-color .15s,transform .15s;',
      '}',
      '.twk-resume-item:hover{',
        'background:rgba(255,144,0,.18);border-color:#ff9000;transform:translateY(-1px);',
      '}',
      '.twk-resume-item img{',
        'width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;',
      '}',
      '.twk-resume-item span{',
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      '}',
      '.twk-resume-close{',
        'background:transparent;border:0;color:rgba(255,255,255,.55);',
        'font-size:18px;line-height:1;cursor:pointer;padding:4px 6px;',
        'flex-shrink:0;border-radius:4px;transition:color .15s,background .15s;',
      '}',
      '.twk-resume-close:hover{color:#fff;background:rgba(255,255,255,.06)}',

      // Smart Quick Nav chips (after hero CTAs)
      '.twk-quick-nav{',
        'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;',
      '}',
      '.twk-quick-chip{',
        'display:inline-flex;align-items:center;gap:6px;',
        'padding:7px 13px;border-radius:999px;',
        'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);',
        'color:rgba(230,230,240,.75);text-decoration:none;',
        'font-family:"JetBrains Mono",ui-monospace,monospace;',
        'font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;',
        'transition:color .15s,border-color .15s,background .15s,transform .15s;',
      '}',
      '.twk-quick-chip:hover{',
        'color:#fff;border-color:rgba(255,144,0,.5);background:rgba(255,144,0,.08);',
        'transform:translateY(-1px);',
      '}',
      '.twk-quick-chip strong{color:#ff9000;font-weight:800}',

      // Funnel pill (bottom-left toast for first-time visitors)
      '.twk-funnel-pill{',
        'position:fixed;bottom:18px;left:18px;z-index:9998;',
        'max-width:340px;display:flex;align-items:center;gap:10px;',
        'padding:12px 14px 12px 16px;border-radius:14px;',
        'background:linear-gradient(135deg,#1a0a0a,#0a0a0a);',
        'border:1px solid rgba(255,144,0,.45);',
        'box-shadow:0 18px 50px rgba(255,144,0,.28),0 6px 18px rgba(0,0,0,.6);',
        'color:#fff;font-family:"Inter",ui-sans-serif,system-ui,sans-serif;',
        'font-size:13px;line-height:1.4;',
        'opacity:0;transform:translateY(15px);',
        'transition:opacity .35s ease,transform .35s ease;',
      '}',
      '.twk-funnel-pill.is-visible{opacity:1;transform:translateY(0)}',
      '.twk-funnel-pill .twk-funnel-text{flex:1;min-width:0}',
      '.twk-funnel-pill .twk-funnel-text strong{color:#ff9000;font-weight:800}',
      '.twk-funnel-pill .twk-funnel-cta{',
        'background:#ff9000;color:#000;text-decoration:none;',
        'padding:8px 12px;border-radius:8px;flex-shrink:0;',
        'font-family:"Anton","Bebas Neue",sans-serif;',
        'font-size:13px;font-weight:400;letter-spacing:.06em;text-transform:uppercase;',
        'transition:background .15s,transform .15s;',
      '}',
      '.twk-funnel-pill .twk-funnel-cta:hover{background:#ffa733;transform:translateY(-1px)}',
      '.twk-funnel-pill .twk-funnel-x{',
        'background:transparent;border:0;color:rgba(255,255,255,.5);',
        'font-size:18px;line-height:1;cursor:pointer;padding:4px;flex-shrink:0;',
      '}',

      '@media(max-width:640px){',
        '.twk-resume-inner{padding:8px 14px;gap:10px}',
        '.twk-resume-label{font-size:9.5px;letter-spacing:.14em}',
        '.twk-resume-item{font-size:11.5px;max-width:180px}',
        '.twk-funnel-pill{left:8px;right:8px;bottom:8px;max-width:none}',
      '}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ─── 4. Build & inject Continue Watching strip ───────────────────────
  function injectResumeStrip(){
    if (lsGet(DISMISS_KEY, false)) return;
    var history = lsGet(HISTORY_KEY, []);
    if (!history.length) return;

    // Limit to last 5 unique entries
    var items = history.slice(0, 5);
    var nav = document.querySelector('.twk-nav-v1') || document.querySelector('nav[aria-label="Primary"]');
    if (!nav || !nav.parentNode) return;

    var strip = document.createElement('div');
    strip.className = 'twk-resume-strip';
    strip.setAttribute('role', 'region');
    strip.setAttribute('aria-label', 'Continue watching');

    var listHTML = items.map(function(item){
      var thumb = item.thumb ? '<img src="'+item.thumb+'" alt="" loading="lazy">' : '';
      var safeTitle = String(item.title).replace(/[<>"]/g,'').slice(0,60);
      return '<a class="twk-resume-item" href="'+item.url+'">'+thumb+'<span>'+safeTitle+'</span></a>';
    }).join('');

    strip.innerHTML =
      '<div class="twk-resume-inner">' +
        '<span class="twk-resume-label">★ Continue:</span>' +
        '<div class="twk-resume-list">' + listHTML + '</div>' +
        '<button class="twk-resume-close" aria-label="Dismiss">×</button>' +
      '</div>';

    nav.parentNode.insertBefore(strip, nav.nextSibling);

    strip.querySelector('.twk-resume-close').addEventListener('click', function(){
      lsSet(DISMISS_KEY, true);
      strip.style.display = 'none';
    });
  }

  // ─── 5. Smart Quick Nav chips next to existing hero CTAs ─────────────
  function injectQuickNav(){
    var ctaBar = document.querySelector('.twerkhub-home-hero-ctas');
    if (!ctaBar) return;
    if (ctaBar.parentNode.querySelector('.twk-quick-nav')) return;

    var nav = document.createElement('div');
    nav.className = 'twk-quick-nav';
    nav.innerHTML = [
      '<a class="twk-quick-chip" href="/community.html">/ <strong>community</strong></a>',
      '<a class="twk-quick-chip" href="/profile.html">/ <strong>profile</strong></a>',
      '<a class="twk-quick-chip" href="/creators.html">/ <strong>60+ creators</strong></a>',
      '<a class="twk-quick-chip" href="/membership.html">/ <strong>membership</strong></a>',
    ].join('');
    ctaBar.parentNode.insertBefore(nav, ctaBar.nextSibling);
  }

  // ─── 6. First-time visitor funnel pill ───────────────────────────────
  function injectFunnelPill(){
    if (lsGet(FUNNEL_KEY, false)) return;
    if (lsGet(HISTORY_KEY, []).length > 0) return; // returning user — skip
    if (pages > 1) return; // already navigated this session

    var pill = document.createElement('div');
    pill.className = 'twk-funnel-pill';
    pill.innerHTML =
      '<span class="twk-funnel-text">' +
        '<strong>Quick start →</strong> The hottest playlist updated every Monday.' +
      '</span>' +
      '<a class="twk-funnel-cta" href="/playlist/">Watch</a>' +
      '<button class="twk-funnel-x" aria-label="Dismiss">×</button>';
    document.body.appendChild(pill);

    // Show after 4s of idle (no scroll)
    var scrolled = false;
    function onScroll(){ scrolled = true; window.removeEventListener('scroll', onScroll); }
    window.addEventListener('scroll', onScroll, { passive: true });

    setTimeout(function(){
      // Show only if user hasn't scrolled (= idle on hero = needs nudge)
      if (!scrolled) {
        pill.classList.add('is-visible');
      }
    }, 4000);

    pill.querySelector('.twk-funnel-x').addEventListener('click', function(){
      lsSet(FUNNEL_KEY, true);
      pill.classList.remove('is-visible');
      setTimeout(function(){ if (pill.parentNode) pill.parentNode.removeChild(pill); }, 350);
    });

    pill.querySelector('.twk-funnel-cta').addEventListener('click', function(){
      lsSet(FUNNEL_KEY, true); // dismiss after click
    });
  }

  // ─── 7. Hover prefetch (next page likely to be visited) ──────────────
  // Cuando user hace hover sobre un link interno, prefetcheamos su HTML
  // para que la próxima navegación sea instantánea.
  var prefetched = {};
  document.addEventListener('mouseover', function(e){
    var link = e.target && e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!isTrackable(href) || prefetched[href]) return;
    if (href.indexOf('http') === 0 && href.indexOf('alexiatwerkgroup.com') === -1) return;
    prefetched[href] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    l.as = 'document';
    document.head.appendChild(l);
  }, true);

  // ─── Boot ───────────────────────────────────────────────────────────
  function boot(){
    injectCSS();
    injectResumeStrip();
    injectQuickNav();
    injectFunnelPill();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
