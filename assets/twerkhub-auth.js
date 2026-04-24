/* ═══ TWERKHUB · AUTH / REGISTRATION ═══
 * v20260424-p1
 *
 * Replaces the old "Anti (firestarter)" hardcoded identity. Now:
 *   1. When no user is logged in, the home portal shows a registration modal
 *      asking for name, email, nickname (minimum legal fields).
 *   2. Registration saves locally AND (if configured) POSTs to a webhook so
 *      you collect emails centrally. Falls back to pure-local if no webhook.
 *   3. Token balance resets to 0 for new users — no more inheriting someone
 *      else's 2,170 tokens on logout/re-entry.
 *   4. Logout clears the session AND the token state.
 *   5. Admin can download all registered emails as CSV at /admin-users.html.
 *
 * Storage (localStorage keys):
 *   alexia_current_user            · JSON of the currently logged-in user
 *   alexia_registered_users        · JSON array of ALL registrations from
 *                                    this browser (CSV export source)
 *   alexia_registration_webhook    · optional POST endpoint for cross-browser
 *                                    email capture (set via admin panel)
 */
(function(){
  'use strict';
  if (window.__twerkhubAuthInit) return;
  window.__twerkhubAuthInit = true;

  var KEY_CURRENT = 'alexia_current_user';
  var KEY_USERS   = 'alexia_registered_users';
  var KEY_HOOK    = 'alexia_registration_webhook';

  // ── State helpers ────────────────────────────────────────────────────
  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(_){ return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){ } }
  function getCurrent(){ return lsGet(KEY_CURRENT, null); }
  function setCurrent(u){ lsSet(KEY_CURRENT, u); }
  function clearCurrent(){ try { localStorage.removeItem(KEY_CURRENT); } catch(_){ } }
  function getAllUsers(){ var v = lsGet(KEY_USERS, []); return Array.isArray(v) ? v : []; }
  function saveUser(u){
    var list = getAllUsers();
    var idx  = list.findIndex(function(x){ return x && x.email && x.email === u.email; });
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], u);
    else list.push(u);
    lsSet(KEY_USERS, list);
  }

  // ── Session reset on logout ──────────────────────────────────────────
  // When logging out we clear the AlexiaTokens state so the next registrant
  // starts from zero. Stops the "I logged out but I'm still Anti with 2,170
  // tokens" bug.
  function wipeTokenState(){
    var keys = [
      'alexia_tokens_v1.balance','alexia_tokens_v1.total',
      'alexia_tokens_v1.streak','alexia_tokens_v1.lastLogin',
      'alexia_tokens_v1.registered','alexia_tokens_v1.visited',
      'alexia_tokens_v1.videos','alexia_tokens_v1.shares',
      'alexia_tokens_v1.welcomed','alexia_tokens_v1.tier',
      'twerkhub_tokens','twerkhub_tokens_seen_paths',
      'twerkhub_tokens_seen_vids','twerkhub_online_count_v2',
      'twerkhub_viewed_vids'
    ];
    keys.forEach(function(k){ try { localStorage.removeItem(k); } catch(_){} });
  }

  function logout(){
    clearCurrent();
    wipeTokenState();
    // Back to portal so the registration form shows.
    location.href = '/';
  }

  // ── Registration flow ────────────────────────────────────────────────
  function register(name, email, nick){
    var clean = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      name: String(name || '').trim().slice(0, 80),
      email: String(email || '').trim().toLowerCase().slice(0, 160),
      nick: String(nick || '').trim().slice(0, 40),
      registeredAt: Date.now(),
      ua: (navigator.userAgent || '').slice(0, 180),
      ref: document.referrer || ''
    };
    if (!clean.name || !clean.email || !clean.nick) return { ok:false, error:'Missing required fields' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return { ok:false, error:'Invalid email' };

    // Save locally.
    saveUser(clean);
    setCurrent(clean);

    // Mirror to a webhook if one is configured (lets you capture signups
    // across browsers — Formspree, n8n, Cloudflare Worker, whatever).
    var hook = lsGet(KEY_HOOK, null);
    if (hook && typeof hook === 'string') {
      try {
        fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean),
          keepalive: true,
          mode: 'no-cors'
        }).catch(function(){});
      } catch(_){}
    }

    // Reset and seed the token state for the NEW user.
    try {
      if (window.AlexiaTokens && window.AlexiaTokens.setBalance) {
        window.AlexiaTokens.setBalance(0);
      }
    } catch(_){}
    // Grant the welcome bonus after the modal closes so the toast is visible.
    setTimeout(function(){
      try { window.AlexiaTokens && window.AlexiaTokens.grant && window.AlexiaTokens.grant(200, 'Welcome, ' + clean.nick + ' 🔥'); } catch(_){}
    }, 700);

    return { ok:true, user: clean };
  }

  // ── Modal UI ─────────────────────────────────────────────────────────
  var STYLE = '' +
    '.twk-auth-backdrop{position:fixed;inset:0;z-index:2147483644;background:rgba(5,5,10,.82);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);display:flex;align-items:center;justify-content:center;padding:20px;animation:twkAuthFade .35s ease-out both;font-family:"Inter",-apple-system,sans-serif;}' +
    '@keyframes twkAuthFade{from{opacity:0}to{opacity:1}}' +
    '.twk-auth-sheet{position:relative;width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:linear-gradient(165deg,#11111a 0%,#07070b 100%);border:1px solid rgba(255,45,135,.28);border-radius:22px;padding:38px 34px 30px;box-shadow:0 40px 100px rgba(0,0,0,.65),0 0 0 1px rgba(255,45,135,.1),inset 0 1px 0 rgba(255,255,255,.04);animation:twkAuthRise .55s cubic-bezier(.22,.9,.38,1) .05s both;}' +
    '@keyframes twkAuthRise{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '.twk-auth-crest{display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(145deg,#ff2d87,#9d4edd);color:#fff;font:900 17px/1 "Playfair Display",serif;box-shadow:0 12px 30px rgba(255,45,135,.32),0 0 0 4px rgba(255,45,135,.08);letter-spacing:.02em;}' +
    '.twk-auth-eye{display:block;text-align:center;font-size:10px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:#ff6fa8;margin-bottom:12px;}' +
    '.twk-auth-title{font:800 clamp(26px,3.8vw,34px)/1.18 "Playfair Display",Georgia,serif;color:#fff;text-align:center;letter-spacing:-.01em;margin:0 0 8px;}' +
    '.twk-auth-title em{font-style:italic;background:linear-gradient(135deg,#ff6fa8,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent;}' +
    '.twk-auth-lede{font-size:13.5px;line-height:1.58;color:rgba(244,243,247,.72);text-align:center;margin:0 auto 22px;max-width:38ch;}' +
    '.twk-auth-form{display:flex;flex-direction:column;gap:11px;}' +
    '.twk-auth-label{display:block;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8;margin-bottom:6px;}' +
    '.twk-auth-input{width:100%;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#f5f5fb;font:600 14px/1.3 "Inter",sans-serif;transition:border-color .2s,background .2s;box-sizing:border-box;}' +
    '.twk-auth-input:focus{outline:none;border-color:rgba(255,45,135,.6);background:rgba(255,45,135,.04);box-shadow:0 0 0 3px rgba(255,45,135,.1);}' +
    '.twk-auth-error{display:none;color:#ff6fa8;font-size:12px;font-weight:700;text-align:center;margin-top:4px;}' +
    '.twk-auth-error.is-visible{display:block;}' +
    '.twk-auth-submit{margin-top:14px;width:100%;padding:14px;border-radius:10px;background:linear-gradient(180deg,#ff2d87,#9d4edd);color:#fff;font:800 11px/1 "Inter",sans-serif;letter-spacing:.16em;text-transform:uppercase;border:0;cursor:pointer;transition:transform .18s cubic-bezier(.2,1.1,.3,1),filter .2s;box-shadow:0 14px 30px rgba(255,45,135,.36);}' +
    '.twk-auth-submit:hover{transform:translateY(-2px);filter:brightness(1.08);}' +
    '.twk-auth-submit:active{transform:translateY(0);}' +
    '.twk-auth-tos{font-size:11px;line-height:1.5;color:rgba(244,243,247,.5);text-align:center;margin:14px 0 0;}' +
    '.twk-auth-tos a{color:#ff6fa8;}' +
    '.twk-auth-legal{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,243,247,.35);text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06);}' +
    /* Logout chip that lives in the token HUD area — small, unobtrusive. */
    '.twk-auth-logout{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(244,243,247,.7);font:800 9px/1 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-left:6px;}' +
    '.twk-auth-logout:hover{background:rgba(255,45,135,.12);border-color:rgba(255,45,135,.4);color:#fff;}' +
    '';

  function injectStyle(){
    if (document.getElementById('twk-auth-style')) return;
    var s = document.createElement('style');
    s.id = 'twk-auth-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function showForm(){
    injectStyle();
    if (document.getElementById('twk-auth-modal')) return;
    var root = document.createElement('div');
    root.id = 'twk-auth-modal';
    root.className = 'twk-auth-backdrop';
    root.innerHTML =
      '<form class="twk-auth-sheet" novalidate>' +
        '<div class="twk-auth-crest">A·T</div>' +
        '<span class="twk-auth-eye">Private archive · Members only</span>' +
        '<h2 class="twk-auth-title">Make your <em>handle</em>.</h2>' +
        '<p class="twk-auth-lede">Un nombre para saber cómo llamarte. Un email para mandarte los drops. Un nick que te represente adentro. Nada más, nada invasivo.</p>' +
        '<div class="twk-auth-form">' +
          '<div><label class="twk-auth-label" for="twk-auth-name">Your name</label><input class="twk-auth-input" id="twk-auth-name" name="name" type="text" required maxlength="80" placeholder="Como querés que te llame" autocomplete="given-name"></div>' +
          '<div><label class="twk-auth-label" for="twk-auth-email">Email</label><input class="twk-auth-input" id="twk-auth-email" name="email" type="email" required maxlength="160" placeholder="you@domain.com" autocomplete="email" inputmode="email"></div>' +
          '<div><label class="twk-auth-label" for="twk-auth-nick">Your nick (public)</label><input class="twk-auth-input" id="twk-auth-nick" name="nick" type="text" required maxlength="40" placeholder="ej: solo.collector" autocomplete="username"></div>' +
          '<p class="twk-auth-error" id="twk-auth-error"></p>' +
          '<button type="submit" class="twk-auth-submit">Enter the archive · +200 tokens welcome →</button>' +
          '<p class="twk-auth-tos">By entering, you confirm you are 18+ and accept our <a href="/tos.html" target="_blank" rel="noopener">terms</a> and <a href="/privacy.html" target="_blank" rel="noopener">privacy</a>.</p>' +
        '</div>' +
        '<p class="twk-auth-legal">© Alexia Twerk Group · 18+ · 18 U.S.C. §2257 compliant</p>' +
      '</form>';
    document.body.appendChild(root);
    root.addEventListener('submit', function(ev){
      ev.preventDefault();
      var name = root.querySelector('#twk-auth-name').value;
      var email = root.querySelector('#twk-auth-email').value;
      var nick  = root.querySelector('#twk-auth-nick').value;
      var err   = root.querySelector('#twk-auth-error');
      var res = register(name, email, nick);
      if (!res.ok) {
        err.textContent = res.error;
        err.classList.add('is-visible');
        return;
      }
      err.classList.remove('is-visible');
      closeForm();
    });
    // Prevent scroll on the page behind the modal.
    document.documentElement.style.overflow = 'hidden';
  }

  function closeForm(){
    var el = document.getElementById('twk-auth-modal');
    if (el) el.remove();
    document.documentElement.style.overflow = '';
  }

  // ── Logout chip injector ─────────────────────────────────────────────
  function ensureLogoutChip(){
    if (!getCurrent()) return;
    if (document.querySelector('.twk-auth-logout')) return;
    var host = document.querySelector('.twerkhub-topbar-right') || document.querySelector('.twerkhub-tokens-hud');
    if (!host) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'twk-auth-logout';
    btn.title = 'Log out · clears your session';
    btn.textContent = 'Log out';
    btn.addEventListener('click', function(){
      if (confirm('Log out? Your local token balance will be cleared.')) logout();
    });
    host.appendChild(btn);
  }

  // ── Gate ─────────────────────────────────────────────────────────────
  // Only the portal (/) gates hard. Deep pages assume the user will hit the
  // portal at least once — if they're not logged in there, they won't have
  // the welcome bonus or personalized state, but they can still browse.
  function gate(){
    injectStyle();
    ensureLogoutChip();
    if (getCurrent()) return;
    var path = (location.pathname || '/').toLowerCase();
    var isPortal = (path === '/' || path === '/index.html' || path === '/index');
    if (isPortal) showForm();
  }

  // ── Public API ───────────────────────────────────────────────────────
  window.TwerkhubAuth = {
    getCurrent: getCurrent,
    getAllUsers: getAllUsers,
    register: register,
    logout: logout,
    showForm: showForm,
    setWebhook: function(url){ lsSet(KEY_HOOK, String(url || '')); },
    getWebhook: function(){ return lsGet(KEY_HOOK, null); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gate, { once: true });
  } else {
    gate();
  }
  // Re-check once the topbar's right-cluster is mounted (it's async).
  setTimeout(ensureLogoutChip, 1000);
  setTimeout(ensureLogoutChip, 2500);
})();
