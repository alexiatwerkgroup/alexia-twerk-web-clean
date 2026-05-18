
(function(){
  if (window.__alexiaProfileTopNavInitV2) return;
  window.__alexiaProfileTopNavInitV2 = true;
  var PROFILE_KEY = 'alexia_forum_profile_v1';
  var STYLE_ID = 'alexia-profile-topnav-style';
  var BTN_ATTR = 'data-alexia-profile-topnav';
  function loadJson(key, fallback){ try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch(e){ return fallback; } }
  function esc(str){ return String(str || '').replace(/[&<>"']/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]); }); }
  function initials(name){ var text = String(name || '').trim(); if (!text) return 'P'; var parts = text.split(/\s+/).filter(Boolean).slice(0,2); if (!parts.length) return text.slice(0,1).toUpperCase(); return parts.map(function(p){ return p.slice(0,1).toUpperCase(); }).join('').slice(0,2); }
  function profile(){ return loadJson(PROFILE_KEY, { nickname:'', bio:'', avatar_url:'', updated_at:'' }) || {}; }
  function avatarMarkup(current){
    if (current && current.avatar_url) return '<span class="alexia-profile-btn__avatar is-image"><img src="' + esc(current.avatar_url) + '" alt="Profile avatar"></span>';
    return '<span class="alexia-profile-btn__avatar">' + esc(initials(current && current.nickname)) + '</span>';
  }
  function ensureStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .alexia-profile-topnav-btn{
        display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;
        padding:8px 11px!important;min-height:40px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.10)!important;
        background:rgba(255,255,255,.03)!important;color:#f1f1f6!important;font-size:10px!important;font-weight:700!important;
        letter-spacing:.08em!important;text-transform:uppercase!important;line-height:1!important;white-space:nowrap!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important;text-decoration:none!important;cursor:pointer!important;flex:0 0 auto!important;
      }
      .alexia-profile-topnav-btn:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.16)!important;transform:translateY(-1px)!important}
      .alexia-profile-btn__avatar{
        width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;max-width:18px!important;max-height:18px!important;
        border-radius:50%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;
        background:linear-gradient(180deg,#ff748f,#ff4f73)!important;color:#fff!important;font-size:9px!important;font-weight:800!important;letter-spacing:0!important;flex:0 0 18px!important;
        box-shadow:0 0 0 1px rgba(255,255,255,.10),0 0 12px rgba(255,79,115,.22)!important;
      }
      .alexia-profile-btn__avatar img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      @media (max-width:1220px){.alexia-profile-topnav-btn{padding:6px 10px!important;font-size:9.1px!important;min-height:36px!important}}
      @media (max-width:760px){.alexia-profile-topnav-btn .label{display:none!important}.alexia-profile-topnav-btn{padding:8px 9px!important}}
    `;
    document.head.appendChild(style);
  }
  function targetContainers(){
    var nodes = [];
    ['.alexia-global-links', '.alexia-nav-managed', '.entry-links'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if (!el || nodes.indexOf(el) !== -1) return;
        nodes.push(el);
      });
    });
    return nodes;
  }
  function ensureButton(container){
    if (!container || container.querySelector('['+BTN_ATTR+']')) return;
    var btn = document.createElement('a');
    btn.href = '/profile.html';
    btn.className = 'alexia-profile-topnav-btn';
    btn.setAttribute(BTN_ATTR, '1');
    btn.innerHTML = avatarMarkup(profile()) + '<span class="label">Profile</span>';
    var online = container.querySelector('.alexia-online-pill,[data-alexia-online-count]') || null;
    if (online && online.classList && online.classList.contains('alexia-online-pill')) container.insertBefore(btn, online);
    else if (online && online.closest('.alexia-online-pill') && online.closest('.alexia-online-pill').parentNode === container) container.insertBefore(btn, online.closest('.alexia-online-pill'));
    else container.appendChild(btn);
  }
  function refreshButtons(){
    ensureStyle();
    targetContainers().forEach(ensureButton);
    var current = profile();
    document.querySelectorAll('['+BTN_ATTR+']').forEach(function(btn){
      btn.innerHTML = avatarMarkup(current) + '<span class="label">Profile</span>';
    });
  }
  function boot(){
    ensureStyle();
    refreshButtons();
    window.addEventListener('resize', refreshButtons);
    window.addEventListener('storage', function(e){ if (e && e.key === PROFILE_KEY) refreshButtons(); });
    setTimeout(refreshButtons, 250);
    setTimeout(refreshButtons, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
