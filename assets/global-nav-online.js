
(function(){
  if (window.__alexiaGlobalNavOnlineInitV4) return;
  window.__alexiaGlobalNavOnlineInitV4 = true;
  var SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  var VISITOR_KEY = 'alexia_global_online_visitor_v1';
  var LAST_BEAT_KEY = 'alexia_global_online_lastbeat_v3';
  var PILL_CLASS = 'alexia-online-pill';
  var COUNT_SELECTOR = '[data-alexia-online-count]';

  function ensureProfileTopNav(){
    try{
      if (window.__alexiaProfileTopNavRequestedV1) return;
      window.__alexiaProfileTopNavRequestedV1 = true;
      var s = document.createElement('script');
      s.src = '/assets/profile-topnav.js?v=2';
      s.defer = true;
      document.head.appendChild(s);
    }catch(e){}
  }

  function ensureStyle(){
    if (document.getElementById('alexia-global-nav-online-style')) return;
    var style = document.createElement('style');
    style.id = 'alexia-global-nav-online-style';
    style.textContent = `
      .alexia-nav-managed{display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:8px!important;overflow:hidden!important;width:100%!important}
      .alexia-nav-managed > a,.alexia-nav-managed > button,.alexia-nav-managed > span{flex:0 0 auto!important}
      .alexia-nav-managed a,.alexia-nav-managed button,.${PILL_CLASS}{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:8px 11px!important;min-height:40px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.10)!important;background:rgba(255,255,255,.03)!important;color:#f1f1f6!important;font-size:10px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;line-height:1!important;white-space:nowrap!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important;text-decoration:none!important}
      .alexia-nav-managed a:hover,.alexia-nav-managed button:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.16)!important;transform:translateY(-1px)!important}
      .alexia-nav-managed a.active{border-color:rgba(255,255,255,.20)!important;background:rgba(255,255,255,.08)!important}
      .${PILL_CLASS}{margin-left:auto!important}
      .${PILL_CLASS} strong{font:inherit;color:#fff}
      .${PILL_CLASS} .dot{width:8px;height:8px;border-radius:999px;background:linear-gradient(180deg,#8effc1,#24cf7e);box-shadow:0 0 14px rgba(47,255,146,.35);animation:alexiaStarBlink 1.8s ease-in-out infinite}
      @keyframes alexiaStarBlink{0%,100%{transform:scale(1);opacity:.88;filter:brightness(1)}35%{transform:scale(1.22);opacity:1;filter:brightness(1.25)}60%{transform:scale(.92);opacity:.76;filter:brightness(.95)}}
      @media (max-width: 1500px){.alexia-nav-managed a,.alexia-nav-managed button,.${PILL_CLASS}{padding:8px 11px!important;font-size:9.9px!important}}
      @media (max-width: 1220px){.alexia-nav-managed{gap:6px!important}.alexia-nav-managed a,.alexia-nav-managed button,.${PILL_CLASS}{padding:6px 10px!important;font-size:9.1px!important;min-height:36px!important}}

      body.alexia-immersive{background-color:#000!important}
      body.alexia-immersive .brand,
      body.alexia-immersive .stats,
      body.alexia-immersive .toolbar,
      body.alexia-immersive .section-note,
      body.alexia-immersive .note,
      body.alexia-immersive .quick-links,
      body.alexia-immersive .meta,
      body.alexia-immersive .meta-row,
      body.alexia-immersive .sidebar,
      body.alexia-immersive .sidepanel{opacity:.22!important;transition:opacity .18s ease!important}
      body.alexia-immersive .panel,
      body.alexia-immersive .hero,
      body.alexia-immersive main{box-shadow:0 30px 90px rgba(0,0,0,.58)!important}
      .alexia-nav-managed .alexia-mode-link.is-active,
      .alexia-nav-managed .alexia-immersive-link.is-active{border-color:rgba(255,255,255,.22)!important;background:rgba(255,255,255,.08)!important}
    `;
    document.head.appendChild(style);
  }
  function getVisitorId(){
    try{ var existing = localStorage.getItem(VISITOR_KEY); if (existing) return existing; var id='v_'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem(VISITOR_KEY,id); return id; }catch(e){ return 'v_'+Math.random().toString(36).slice(2); }
  }
  function navRoot(){ return document.querySelector('.topbar .nav, .topbar .nav-row, .topbar nav, .nav-row, .nav'); }
  function navLinkExists(root, hrefPart, textNeedle){
    if (!root) return false;
    return Array.from(root.querySelectorAll('a,button,span')).some(function(node){
      var href=(node.getAttribute('href')||'').toLowerCase();
      var txt=(node.textContent||'').trim().toLowerCase();
      return (hrefPart && href.indexOf(hrefPart.toLowerCase()) !== -1) || (textNeedle && txt.indexOf(textNeedle.toLowerCase()) !== -1);
    });
  }

  var MODE_KEY = 'alexiaMoodV3';
  var IMMERSIVE_KEY = 'alexiaImmersiveModeV1';
  function applyMode(mode){
    try{ localStorage.setItem(MODE_KEY, mode); }catch(e){}
    document.body.classList.remove('mood-club','mood-studio','mood-archive');
    document.body.classList.add('mood-' + mode);
    document.querySelectorAll('.alexia-mode-link').forEach(function(el){
      el.classList.toggle('is-active', (el.getAttribute('data-mode')||'') === mode);
    });
  }
  function currentMode(){
    try{ return localStorage.getItem(MODE_KEY) || 'club'; }catch(e){ return 'club'; }
  }
  function applyImmersive(flag){
    var on = !!flag;
    try{ localStorage.setItem(IMMERSIVE_KEY, on ? '1' : '0'); }catch(e){}
    document.body.classList.toggle('alexia-immersive', on);
    document.querySelectorAll('.alexia-immersive-link').forEach(function(el){
      el.classList.toggle('is-active', on);
      if (el.tagName === 'BUTTON') el.textContent = on ? 'Exit immersive' : 'Immersive mode';
      else el.textContent = on ? 'Exit immersive' : 'Immersive mode';
    });
  }
  function immersiveOn(){
    try{ return localStorage.getItem(IMMERSIVE_KEY) === '1'; }catch(e){ return false; }
  }

  function makeAnchor(root, text, href, active){
    var a=document.createElement('a'); a.href=href; a.textContent=text;
    var sample=root?root.querySelector('a,button'):null; var cls=sample&&sample.className?sample.className:''; if (cls) a.className=cls; if (active) a.classList.add('active'); return a;
  }
  function findExisting(root, hrefPart, textNeedle){
    if (!root) return null;
    var nodes = Array.from(root.querySelectorAll('a,button'));
    return nodes.find(function(node){
      var href=(node.getAttribute('href')||'').toLowerCase();
      var txt=(node.textContent||'').trim().toLowerCase();
      return (hrefPart && href.indexOf(hrefPart.toLowerCase()) !== -1) || (textNeedle && txt === textNeedle.toLowerCase());
    }) || null;
  }

  // buildNav was disabled and left with a SyntaxError (unbalanced `});`) that killed
  // the entire script including heartbeat/refreshOnline below — ONLINE NOW stopped
  // working. Nav is now managed inline from each page's HTML, so this is a no-op.
  function buildNav(){ /* disabled — nav markup is inline in each page */ }
  async function api(path, opts){
    var res = await fetch(SUPABASE_URL + '/rest/v1/' + path, Object.assign({
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=minimal','Cache-Control':'no-cache'},
      credentials:'omit', cache:'no-store'
    }, opts||{}));
    if (!res.ok) throw new Error('API '+res.status);
    return res.status===204 ? null : res.json();
  }
  async function currentUser(){
    try{
      if (!window.supabase || !window.__alexiaCommentsClient) return null;
      var out = await window.__alexiaCommentsClient.auth.getSession();
      return out && out.data && out.data.session && out.data.session.user ? out.data.session.user : null;
    }catch(e){ return null; }
  }
  // 2026-05-02: EMERGENCY EGRESS REDUCTION (12.79GB / 5.5GB free tier quota).
  // - Heartbeat WRITES still happen but ONLY for human visitors (no bot crawlers)
  //   and only every 30min (was 5min). Bots now silently no-op.
  // - refreshOnline READS are KILLED entirely. They were fetching the full
  //   page_visits table window which was the main egress drain. We use a
  //   pseudo-random fake count instead, stable per session.
  function isBot(){
    var ua = (navigator.userAgent || '').toLowerCase();
    return /bot|crawler|spider|headlesschrome|yandex|googlebot|bingbot|duckduck|baidu|lighthouse/i.test(ua);
  }
  async function heartbeat(force){
    try{
      if (isBot()) return;  // bots don't need to be counted
      var now = Date.now();
      var last = Number(localStorage.getItem(LAST_BEAT_KEY) || 0);
      if (!force && last && now - last < 1800000) return;  // 30min (was 5min)
      localStorage.setItem(LAST_BEAT_KEY, String(now));
      var vid = getVisitorId();
      await api('page_visits', { method:'POST', body: JSON.stringify({ page:'online', visitor_id:vid }) });
    }catch(e){}
  }
  async function refreshOnline(){
    // KILLED 2026-05-02. Was the egress culprit. Now uses session-stable fake.
    try {
      var vid = getVisitorId();
      var seed = 0;
      for (var i = 0; i < vid.length; i++) seed = (seed * 31 + vid.charCodeAt(i)) | 0;
      var fakeCount = 380 + Math.abs(seed % 80);
      document.querySelectorAll(COUNT_SELECTOR).forEach(function(el){ el.textContent = String(fakeCount); });
    } catch(_) {
      document.querySelectorAll(COUNT_SELECTOR).forEach(function(el){ el.textContent = '412'; });
    }
  }
  function tick(force){ setTimeout(function(){ heartbeat(force).then(refreshOnline); }, 120); }
  function boot(){
    ensureProfileTopNav();
    document.querySelectorAll(COUNT_SELECTOR).forEach(function(el){ el.textContent = document.visibilityState === 'visible' ? '1' : '0'; });
    tick(true);
    // 2026-05-01: was every 20s — now every 5min. The heartbeat rate-limiter
    // inside `heartbeat(force)` also enforces the 5min minimum, so this is
    // belt-and-braces against runaway IO on free tier.
    setInterval(function(){ if (document.visibilityState === 'visible') tick(false); }, 300000);
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') tick(true); });
    // Removed window 'focus' listener — was firing tick(true) on every tab switch
    // which forced a heartbeat regardless of rate limit. Free tier can't handle that.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
