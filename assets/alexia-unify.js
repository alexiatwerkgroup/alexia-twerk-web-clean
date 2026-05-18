
(function(){
  try {
    if (window.__alexiaUnifiedPassV95) return;
    window.__alexiaUnifiedPassV95 = true;
    document.documentElement.classList.add('alexia-v95-html');
    if (document.body) document.body.classList.add('alexia-v95-root');
    var path = (location.pathname || '').toLowerCase();
    var isRootLanding = /(^\/$)|(^\/index\.html$)/.test(path);
    var isCallback = /auth-callback/.test(path);
    var isDancerPage = /\/twerk-dancer\//.test(path);


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

    function activeKey(){
      if (/\/community\.html$/.test(path)) return 'community';
      if (/top-100-twerk-videos/.test(path)) return 'top100';
      if (/best-twerk-dancers/.test(path)) return 'dancers';
      if (/alexia-video-packs/.test(path)) return 'packs';
      if (/\/playlist\//.test(path) || /\/playlist(\/|$)/.test(path)) return 'playlist';
      if (/\/twerk-dancer\//.test(path) || /\/group-/.test(path) || /dance-studio/.test(path) || /nastya-nass/.test(path)) return 'dancers';
      return 'home';
    }

    function hideDuplicateNavs(newNav){
      var selectors = ['.topbar', '.topbar-static', '.nav-row.static-nav', '.nav-row.nav-main', '.headerNav', '.site-nav', '.nav-card'];
      selectors.forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          if (newNav && newNav.contains(el)) return;
          var txt = (el.textContent || '').toLowerCase();
          if (/home/.test(txt) && /playlist/.test(txt) && (/top 100/.test(txt) || /best dancers/.test(txt) || /video packs/.test(txt))) {
            el.classList.add('alexia-hide-duplicate-nav');
          }
        });
      });
    }

    function firstContentNode(){
      return document.querySelector('.wrap, main, .container, .shell, .page, .layout, .topbar, .topbar-static') || document.body.firstElementChild;
    }

    function ensureMainShell(){
      var node = firstContentNode();
      if (!node || !node.parentNode || node.classList.contains('alexia-global-nav')) return;
      if (node.classList.contains('alexia-main-shell')) return;
      if (node.matches('.wrap, main, .container, .shell, .page, .layout')) {
        node.classList.add('alexia-main-shell');
        return;
      }
      var shell = document.createElement('div');
      shell.className = 'alexia-main-shell';
      node.parentNode.insertBefore(shell, node);
      shell.appendChild(node);
    }

    function ensureNav(){
      if (isRootLanding || isCallback || !document.body || isDancerPage) return;
      var existing = document.querySelector('.alexia-global-nav');
      if (existing) return existing;
      var nav = document.createElement('div');
      nav.className = 'alexia-global-nav';
      var key = activeKey();
      var links = [
        ['home','/home.html','Home'],
        ['playlist','/playlist/index.html','Playlist'],
        ['community','/community.html','Community'],
        ['top100','/top-100-twerk-videos.html','Top 100'],
        ['dancers','/best-twerk-dancers.html','Best Dancers'],
        ['packs','/alexia-video-packs.html','Video Packs']
      ];
      nav.innerHTML = '<div class="alexia-global-nav__inner"><div class="alexia-global-links"></div></div>';
      var linksWrap = nav.querySelector('.alexia-global-links');
      links.forEach(function(item){
        var a = document.createElement('a');
        a.href = item[1];
        a.textContent = item[2];
        if (item[0] === key) a.classList.add('is-active');
        linksWrap.appendChild(a);
      });
      var pill = document.createElement('span');
      pill.className = 'alexia-online-pill';
      pill.innerHTML = '<span class="alexia-online-dot"></span>ONLINE NOW <strong data-alexia-online-count>1</strong>';
      linksWrap.appendChild(pill);
      var anchor = firstContentNode();
      document.body.insertBefore(nav, anchor || document.body.firstChild);
      if (isDancerPage) { nav.style.display = 'none'; return nav; }
      hideDuplicateNavs(nav);
      ensureProfileTopNav();
      return nav;
    }

    function unifyButtonRows(){
      document.querySelectorAll('.btnRow,.buttonRow,.toolbar,.quick-links,.jump-row,.filter-chips,.nav').forEach(function(el){
        var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) return;
        el.classList.add('alexia-unified-row');
      });
    }

    function setOnlineCount(){
      var count = 1;
      try {
        count = Math.max(1, parseInt(localStorage.getItem('alexia_online_now_live_value_v2') || '1', 10) || 1);
      } catch(e){}
      document.querySelectorAll('[data-alexia-online-count], #alexia-online-count').forEach(function(el){ el.textContent = String(count); });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){
        if (document.body) document.body.classList.add('alexia-v95-root');
        ensureMainShell();
        ensureNav();
        unifyButtonRows();
        setOnlineCount();
      }, {once:true});
    } else {
      ensureMainShell();
      ensureNav();
      unifyButtonRows();
      setOnlineCount();
    }
  } catch (e) { console && console.warn && console.warn('alexia v95 unify skipped', e); }
})();
