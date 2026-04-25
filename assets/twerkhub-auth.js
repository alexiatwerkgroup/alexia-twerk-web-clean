/* ═══ TWERKHUB · AUTH v3 — username+password ═══
 * v20260425-p3 · Simplified registration: username + password (no name/email/nick).
 *                Adds Sign In flow. Two chips when logged out: Sign In + Sign Up.
 *                Bulletproof logout (prefix-scan wipe + SW unregister + cache clear).
 *                Storage: localStorage. Hashes: SHA-256 via Web Crypto.
 */
(function(){
  'use strict';
  if (window.__twerkhubAuthInit) return;
  window.__twerkhubAuthInit = true;

  var KEY_CURRENT = 'alexia_current_user';
  var KEY_USERS   = 'alexia_registered_users';
  var KEY_HOOK    = 'alexia_registration_webhook';

  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(_){ return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){ } }
  function getCurrent(){ return lsGet(KEY_CURRENT, null); }
  function setCurrent(u){ lsSet(KEY_CURRENT, u); }
  function clearCurrent(){ try { localStorage.removeItem(KEY_CURRENT); } catch(_){ } }
  function getAllUsers(){ var v = lsGet(KEY_USERS, []); return Array.isArray(v) ? v : []; }
  function saveUser(u){
    var list = getAllUsers();
    var idx = list.findIndex(function(x){ return x && x.username && u.username && x.username.toLowerCase() === u.username.toLowerCase(); });
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], u);
    else list.push(u);
    lsSet(KEY_USERS, list);
  }

  function wipeTokenState(){
    var PREFIXES = ['alexia_', 'twerkhub_', 'twerkhub-', 'sb-', 'supabase.auth', 'supabase-auth'];
    var matches = function(k){
      if (!k) return false;
      for (var i = 0; i < PREFIXES.length; i++) if (k.indexOf(PREFIXES[i]) === 0) return true;
      return false;
    };
    try {
      var lsKeys = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (matches(k)) lsKeys.push(k); }
      lsKeys.forEach(function(k){ try { localStorage.removeItem(k); } catch(_){} });
    } catch(_){}
    try {
      var ssKeys = [];
      for (var j = 0; j < sessionStorage.length; j++) { var k2 = sessionStorage.key(j); if (matches(k2)) ssKeys.push(k2); }
      ssKeys.forEach(function(k){ try { sessionStorage.removeItem(k); } catch(_){} });
    } catch(_){}
  }

  function logout(){
    try { clearCurrent(); } catch(_){}
    try { wipeTokenState(); } catch(_){}
    try { window.dispatchEvent(new CustomEvent('alexia-tokens-changed', { detail: { balance: 0, tier: 'basic', logout: true } })); } catch(_){}
    var done = false;
    function go(){ if (done) return; done = true; location.replace('/?logout=' + Date.now()); }
    setTimeout(go, 800);
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function(regs){
          regs.forEach(function(r){ try { r.unregister(); } catch(_){} });
        }).catch(function(){});
      }
      if (window.caches && caches.keys) {
        caches.keys().then(function(keys){
          return Promise.all(keys.map(function(k){ return caches.delete(k).catch(function(){}); }));
        }).then(go).catch(go);
      } else { go(); }
    } catch(_){ go(); }
  }

  async function hashPassword(pw){
    try {
      var enc = new TextEncoder().encode('twk-salt-v1:' + String(pw || ''));
      var buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    } catch(_){
      var h = 0, s = 'twk-salt-v1:' + String(pw || '');
      for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
      return 'h' + (h >>> 0).toString(16);
    }
  }

  async function register(username, password){
    var u = String(username || '').trim();
    var pw = String(password || '');
    if (!u || !pw) return { ok:false, error:'Username and password required' };
    if (!/^[A-Za-z0-9_.\-]{2,32}$/.test(u)) return { ok:false, error:'Username: 2-32 chars, letters/digits/dots/dashes/underscores' };
    if (pw.length < 4 || pw.length > 64) return { ok:false, error:'Password must be 4-64 characters' };
    var existing = getAllUsers().find(function(x){ return x && x.username && x.username.toLowerCase() === u.toLowerCase(); });
    if (existing) return { ok:false, error:'Username already taken - try Sign In' };
    var clean = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      username: u,
      passwordHash: await hashPassword(pw),
      nick: u,
      registeredAt: Date.now(),
      ua: (navigator.userAgent || '').slice(0, 180)
    };
    saveUser(clean);
    setCurrent(clean);
    var hook = lsGet(KEY_HOOK, null);
    if (hook && typeof hook === 'string') {
      try {
        fetch(hook, { method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: clean.id, username: clean.username, registeredAt: clean.registeredAt }) }).catch(function(){});
      } catch(_){}
    }
    try { if (window.AlexiaTokens && window.AlexiaTokens.setBalance) window.AlexiaTokens.setBalance(0); } catch(_){}
    setTimeout(function(){
      try { window.AlexiaTokens && window.AlexiaTokens.grant && window.AlexiaTokens.grant(200, 'Welcome, ' + clean.username); } catch(_){}
    }, 700);
    return { ok:true, user: clean };
  }

  async function signIn(username, password){
    var u = String(username || '').trim();
    var pw = String(password || '');
    if (!u || !pw) return { ok:false, error:'Enter your username and password' };
    var match = getAllUsers().find(function(x){ return x && x.username && x.username.toLowerCase() === u.toLowerCase(); });
    if (!match) return { ok:false, error:'No user with that username - try Sign Up' };
    var hash = await hashPassword(pw);
    if (!match.passwordHash || match.passwordHash !== hash) return { ok:false, error:'Wrong password' };
    setCurrent(match);
    return { ok:true, user: match };
  }

  var STYLE = '' +
    '.twk-auth-backdrop{position:fixed;inset:0;z-index:2147483644;background:rgba(5,5,10,.82);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);display:flex;align-items:flex-start;justify-content:center;padding:24px 20px 40px;overflow-y:auto;animation:twkAuthFade .35s ease-out both;font-family:"Inter",-apple-system,sans-serif;}' +
    '@media (min-height:780px){.twk-auth-backdrop{align-items:center;}}' +
    '@keyframes twkAuthFade{from{opacity:0}to{opacity:1}}' +
    '.twk-auth-sheet{position:relative;width:100%;max-width:440px;margin:auto 0;background:linear-gradient(165deg,#11111a 0%,#07070b 100%);border:1px solid rgba(255,45,135,.28);border-radius:22px;padding:38px 34px 30px;box-shadow:0 40px 100px rgba(0,0,0,.65);animation:twkAuthRise .55s cubic-bezier(.22,.9,.38,1) .05s both;}' +
    '@keyframes twkAuthRise{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '.twk-auth-crest{display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(145deg,#ff2d87,#9d4edd);color:#fff;font:900 17px/1 "Playfair Display",serif;box-shadow:0 12px 30px rgba(255,45,135,.32);}' +
    '.twk-auth-eye{display:block;text-align:center;font-size:10px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:#ff6fa8;margin-bottom:12px;}' +
    '.twk-auth-title{font:800 clamp(24px,3.5vw,32px)/1.18 "Playfair Display",Georgia,serif;color:#fff;text-align:center;letter-spacing:-.01em;margin:0 0 8px;}' +
    '.twk-auth-title em{font-style:italic;background:linear-gradient(135deg,#ff6fa8,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent;}' +
    '.twk-auth-lede{font-size:13px;line-height:1.55;color:rgba(244,243,247,.72);text-align:center;margin:0 auto 22px;max-width:36ch;}' +
    '.twk-auth-form{display:flex;flex-direction:column;gap:11px;}' +
    '.twk-auth-label{display:block;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8;margin-bottom:6px;}' +
    '.twk-auth-input{width:100%;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#f5f5fb;font:600 14px/1.3 "Inter",sans-serif;transition:border-color .2s,background .2s;box-sizing:border-box;}' +
    '.twk-auth-input:focus{outline:none;border-color:rgba(255,45,135,.6);background:rgba(255,45,135,.04);box-shadow:0 0 0 3px rgba(255,45,135,.1);}' +
    '.twk-auth-error{display:none;color:#ff6fa8;font-size:12px;font-weight:700;text-align:center;margin-top:4px;}' +
    '.twk-auth-error.is-visible{display:block;}' +
    '.twk-auth-submit{margin-top:10px;width:100%;padding:14px;border-radius:10px;background:linear-gradient(180deg,#ff2d87,#9d4edd);color:#fff;font:800 11px/1 "Inter",sans-serif;letter-spacing:.16em;text-transform:uppercase;border:0;cursor:pointer;transition:transform .18s,filter .2s;box-shadow:0 14px 30px rgba(255,45,135,.36);}' +
    '.twk-auth-submit:hover{transform:translateY(-2px);filter:brightness(1.08);}' +
    '.twk-auth-submit:disabled{opacity:.5;cursor:wait;transform:none;}' +
    '.twk-auth-toggle{margin-top:6px;width:100%;padding:10px;border-radius:10px;background:transparent;color:#ff7eb0;font:700 11.5px/1 "Inter",sans-serif;letter-spacing:.04em;border:1px solid rgba(255,45,135,.25);cursor:pointer;transition:all .2s;}' +
    '.twk-auth-toggle:hover{background:rgba(255,45,135,.08);border-color:rgba(255,45,135,.5);color:#fff;}' +
    '.twk-auth-skip{margin-top:6px;width:100%;padding:10px;border-radius:10px;background:transparent;color:rgba(244,243,247,.55);font:600 11px/1 "Inter",sans-serif;letter-spacing:.06em;border:1px solid rgba(255,255,255,.08);cursor:pointer;transition:all .2s;}' +
    '.twk-auth-skip:hover{color:#fff;border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.04);}' +
    '.twk-auth-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(244,243,247,.7);font:400 22px/1 "Inter",sans-serif;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;padding:0;}' +
    '.twk-auth-close:hover{background:rgba(255,45,135,.22);border-color:rgba(255,45,135,.5);color:#fff;transform:rotate(90deg);}' +
    '.twk-auth-tos{font-size:11px;line-height:1.5;color:rgba(244,243,247,.5);text-align:center;margin:14px 0 0;}' +
    '.twk-auth-tos a{color:#ff6fa8;}' +
    '.twk-auth-legal{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,243,247,.35);text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06);}' +
    '.twk-nav-v1-links .twk-auth-chip{display:inline-flex !important;align-items:center;gap:6px;padding:8px 12px !important;border-radius:8px;border:1px solid rgba(255,255,255,.18);font-family:"Inter",ui-sans-serif,system-ui,sans-serif !important;font-size:11px !important;font-weight:800 !important;letter-spacing:.12em !important;text-transform:uppercase;cursor:pointer;transition:all .2s ease;line-height:1;white-space:nowrap;margin-left:6px;background:transparent;color:rgba(230,230,240,.78);text-decoration:none;}' +
    '.twk-nav-v1-links .twk-auth-chip.twk-auth-signin{background:transparent;border-color:rgba(255,255,255,.22);color:rgba(230,230,240,.85);}' +
    '.twk-nav-v1-links .twk-auth-chip.twk-auth-signin:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.45);color:#fff;transform:translateY(-1px);}' +
    '.twk-nav-v1-links .twk-auth-chip.twk-auth-signup{background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(255,180,84,.12));border-color:rgba(255,45,135,.45);color:#ff7eb0;}' +
    '.twk-nav-v1-links .twk-auth-chip.twk-auth-signup:hover{background:linear-gradient(135deg,#ff2d87,#ffb454);border-color:transparent;color:#1a0a14;transform:translateY(-1px);box-shadow:0 6px 18px rgba(255,45,135,.4);}' +
    '.twk-nav-v1-links .twk-auth-chip.twk-auth-logout{background:transparent;border-color:rgba(255,255,255,.18);color:rgba(230,230,240,.78);}' +
    '.twk-nav-v1-links .twk-auth-chip.twk-auth-logout:hover{background:rgba(255,45,135,.1);border-color:rgba(255,45,135,.45);color:#fff;transform:translateY(-1px);}' +
    '@media(max-width:1024px){.twk-nav-v1-links .twk-auth-chip{padding:7px 9px !important;font-size:10px !important;letter-spacing:.06em !important;}}' +
    '@media(max-width:880px){.twk-nav-v1-links .twk-auth-chip{padding:6px 8px !important;font-size:9.5px !important;}}' +
    '';

  function injectStyle(){
    if (document.getElementById('twk-auth-style')) return;
    var s = document.createElement('style');
    s.id = 'twk-auth-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function showForm(mode){
    mode = mode === 'signin' ? 'signin' : 'signup';
    injectStyle();
    if (document.getElementById('twk-auth-modal')) return;
    var root = document.createElement('div');
    root.id = 'twk-auth-modal';
    root.className = 'twk-auth-backdrop';
    root.setAttribute('data-mode', mode);
    var isSignUp = (mode === 'signup');
    var titleHtml = isSignUp ? 'Create your <em>handle</em>.' : 'Welcome <em>back</em>.';
    var lede = isSignUp ? 'Username + password. Pick what you want — only you see it. We never email you.' : 'Enter your username and password to come back in.';
    var submitText = isSignUp ? 'Create account · +200 tokens' : 'Sign in';
    var altText = isSignUp ? 'Already a member? · Sign in' : 'Need an account? · Sign up';

    root.innerHTML =
      '<form class="twk-auth-sheet" novalidate>' +
        '<button type="button" class="twk-auth-close" aria-label="Close">×</button>' +
        '<div class="twk-auth-crest">A·T</div>' +
        '<span class="twk-auth-eye">' + (isSignUp ? 'New member' : 'Members only') + '</span>' +
        '<h2 class="twk-auth-title">' + titleHtml + '</h2>' +
        '<p class="twk-auth-lede">' + lede + '</p>' +
        '<div class="twk-auth-form">' +
          '<div><label class="twk-auth-label" for="twk-auth-username">Username</label>' +
          '<input class="twk-auth-input" id="twk-auth-username" name="username" type="text" required maxlength="32" minlength="2" pattern="[A-Za-z0-9_.\\-]+" placeholder="solo.collector" autocomplete="username" autocorrect="off" autocapitalize="none" spellcheck="false"></div>' +
          '<div><label class="twk-auth-label" for="twk-auth-password">Password</label>' +
          '<input class="twk-auth-input" id="twk-auth-password" name="password" type="password" required maxlength="64" minlength="4" placeholder="Your secret" autocomplete="' + (isSignUp ? 'new-password' : 'current-password') + '"></div>' +
          '<p class="twk-auth-error" id="twk-auth-error"></p>' +
          '<button type="submit" class="twk-auth-submit">' + submitText + '</button>' +
          '<button type="button" class="twk-auth-toggle" data-toggle-mode>' + altText + '</button>' +
          '<button type="button" class="twk-auth-skip">Maybe later</button>' +
          '<p class="twk-auth-tos">By entering, you confirm you are 18+ and accept our <a href="/tos.html" target="_blank" rel="noopener">terms</a> and <a href="/privacy.html" target="_blank" rel="noopener">privacy</a>.</p>' +
        '</div>' +
        '<p class="twk-auth-legal">© Alexia Twerk Group · 18+</p>' +
      '</form>';
    document.body.appendChild(root);

    var errEl = root.querySelector('#twk-auth-error');
    function showError(msg){ errEl.textContent = msg; errEl.classList.add('is-visible'); }
    function clearError(){ errEl.classList.remove('is-visible'); errEl.textContent = ''; }

    root.addEventListener('submit', function(ev){
      ev.preventDefault();
      var submitBtn = root.querySelector('.twk-auth-submit');
      var u = root.querySelector('#twk-auth-username').value;
      var pw = root.querySelector('#twk-auth-password').value;
      submitBtn.disabled = true;
      clearError();
      var p = isSignUp ? register(u, pw) : signIn(u, pw);
      Promise.resolve(p).then(function(res){
        submitBtn.disabled = false;
        if (!res.ok) { showError(res.error); return; }
        closeForm();
        try { ensureAuthChip(); } catch(_){}
        setTimeout(function(){ location.reload(); }, 250);
      }).catch(function(err){
        submitBtn.disabled = false;
        showError('Something went wrong: ' + (err && err.message ? err.message : 'try again'));
      });
    });

    root.querySelector('[data-toggle-mode]').addEventListener('click', function(){
      closeForm();
      showForm(isSignUp ? 'signin' : 'signup');
    });

    function dismiss(){ closeForm(); }
    root.querySelector('.twk-auth-close').addEventListener('click', dismiss);
    root.querySelector('.twk-auth-skip').addEventListener('click', dismiss);
    root.addEventListener('click', function(ev){ if (ev.target === root) dismiss(); });
    document.addEventListener('keydown', function escHandler(ev){
      if (ev.key === 'Escape' || ev.keyCode === 27) { dismiss(); document.removeEventListener('keydown', escHandler); }
    });

    document.documentElement.style.overflow = 'hidden';
  }

  function closeForm(){
    var el = document.getElementById('twk-auth-modal');
    if (el) el.remove();
    document.documentElement.style.overflow = '';
  }

  function ensureAuthChip(){
    var host = document.querySelector('.twk-nav-v1 .twk-nav-v1-links') ||
               document.querySelector('.twerkhub-tokens-hud');
    if (!host) return;
    var existing = host.querySelectorAll('.twk-auth-chip');
    existing.forEach(function(el){ el.remove(); });

    if (getCurrent()) {
      var out = document.createElement('button');
      out.type = 'button';
      out.className = 'twk-auth-chip twk-auth-logout';
      out.title = 'Log out · clears your session';
      out.textContent = 'Log Out';
      out.addEventListener('click', function(){
        if (confirm('Log out? Your local token balance will be cleared.')) logout();
      });
      host.appendChild(out);
    } else {
      var inn = document.createElement('button');
      inn.type = 'button';
      inn.className = 'twk-auth-chip twk-auth-signin';
      inn.title = 'Sign in · username + password';
      inn.textContent = 'Sign In';
      inn.addEventListener('click', function(){ showForm('signin'); });
      host.appendChild(inn);

      var up = document.createElement('button');
      up.type = 'button';
      up.className = 'twk-auth-chip twk-auth-signup';
      up.title = 'Create account · username + password';
      up.textContent = 'Sign Up';
      up.addEventListener('click', function(){ showForm('signup'); });
      host.appendChild(up);
    }
  }

  function gate(){ injectStyle(); ensureAuthChip(); }

  window.TwerkhubAuth = {
    getCurrent: getCurrent,
    getAllUsers: getAllUsers,
    register: register,
    signIn: signIn,
    logout: logout,
    showForm: showForm,
    showSignUp: function(){ showForm('signup'); },
    showSignIn: function(){ showForm('signin'); },
    setWebhook: function(url){ lsSet(KEY_HOOK, String(url || '')); },
    getWebhook: function(){ return lsGet(KEY_HOOK, null); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gate, { once: true });
  } else {
    gate();
  }

  var chipPolls = 0;
  var chipInterval = setInterval(function(){
    ensureAuthChip();
    chipPolls++;
    if (chipPolls > 10) clearInterval(chipInterval);
  }, 1000);
  window.addEventListener('storage', function(ev){ if (ev.key === KEY_CURRENT) ensureAuthChip(); });
  window.addEventListener('alexia-tokens-changed', ensureAuthChip);
})();
