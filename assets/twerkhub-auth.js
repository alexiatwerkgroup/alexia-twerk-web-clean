/* ═══ TWERKHUB · AUTH v5 — Supabase ═══
 * v20260425-p7
 *  - Email + password via Supabase Auth (real DB, real email verification)
 *  - Username-based login: looks up email from username via RPC
 *  - Auth UI inside /account.html (chips out of navbar)
 *  - Forgot password: real email via Supabase auth.resetPasswordForEmail
 *  - Remember-me: defaults true (Supabase persists), unchecked = sessionStorage
 *  - Logout: signOut + localStorage wipe + SW unregister + cache clear
 *  - LocalStorage import: on first signin we attempt to migrate old user data
 */
(function(){
  'use strict';
  if (window.__twerkhubAuthInit) return;
  window.__twerkhubAuthInit = true;

  // ── Supabase client (from supabase-config.js) ───────────────────────
  function getClient(){
    return window.twkGetSupabase ? window.twkGetSupabase() : Promise.resolve(window.__twkSupabase || null);
  }

  // ── Local helpers ───────────────────────────────────────────────────
  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(_){ return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){} }
  function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim()); }
  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Current user (Supabase session + cached profile) ────────────────
  // We cache the profile in localStorage `alexia_current_user` for instant
  // UI rendering. Source of truth is always the Supabase session.
  var KEY_CURRENT = 'alexia_current_user';
  function getCachedUser(){ return lsGet(KEY_CURRENT, null); }
  function setCachedUser(u){ if (u) lsSet(KEY_CURRENT, u); else try { localStorage.removeItem(KEY_CURRENT); } catch(_){} }

  // Fetch fresh profile + session from Supabase. Returns { user, profile } or null.
  async function refreshSession(){
    try {
      var sb = await getClient();
      if (!sb) return null;
      var sess = await sb.auth.getSession();
      var user = sess && sess.data && sess.data.session && sess.data.session.user;
      if (!user) { setCachedUser(null); return null; }
      var p = await sb.from('profiles').select('id,username,email,tokens,total_earned,streak,tier,registered_at').eq('id', user.id).maybeSingle();
      var profile = p && p.data;
      if (profile) {
        setCachedUser({
          id: profile.id, username: profile.username, email: profile.email,
          tokens: profile.tokens, totalEarned: profile.total_earned,
          streak: profile.streak, tier: profile.tier,
          registeredAt: profile.registered_at ? new Date(profile.registered_at).getTime() : Date.now(),
          nick: profile.username
        });
      }
      return { user: user, profile: profile };
    } catch(e){ console.warn('[twk-auth] refreshSession', e); return null; }
  }

  function getCurrent(){ return getCachedUser(); }

  // ── Wipe everything on logout (prefix scan + SW + caches) ───────────
  function wipeTokenState(){
    var P = ['alexia_', 'twerkhub_', 'twerkhub-', 'sb-', 'supabase.auth', 'supabase-auth'];
    var match = function(k){ if (!k) return false; for (var i = 0; i < P.length; i++) if (k.indexOf(P[i]) === 0) return true; return false; };
    try { var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (match(k)) ks.push(k); } ks.forEach(function(k){ try { localStorage.removeItem(k); } catch(_){} }); } catch(_){}
    try { var ks2 = []; for (var j = 0; j < sessionStorage.length; j++) { var k2 = sessionStorage.key(j); if (match(k2)) ks2.push(k2); } ks2.forEach(function(k){ try { sessionStorage.removeItem(k); } catch(_){} }); } catch(_){}
  }

  async function logout(){
    try { var sb = await getClient(); if (sb) await sb.auth.signOut(); } catch(_){}
    try { wipeTokenState(); } catch(_){}
    try { window.dispatchEvent(new CustomEvent('alexia-tokens-changed', { detail:{ balance:0, tier:'basic', logout:true } })); } catch(_){}
    var done = false;
    function go(){ if (done) return; done = true; location.replace('/?logout=' + Date.now()); }
    setTimeout(go, 800);
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ try { r.unregister(); } catch(_){} }); }).catch(function(){});
      }
      if (window.caches && caches.keys) {
        caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k).catch(function(){}); })); }).then(go).catch(go);
      } else { go(); }
    } catch(_){ go(); }
  }

  // ── Register (Supabase) ─────────────────────────────────────────────
  async function register(username, password, email, remember){
    var u = String(username || '').trim();
    var pw = String(password || '');
    var em = String(email || '').trim().toLowerCase();
    if (!u || !pw) return { ok:false, error:'Username, email and password required' };
    if (!/^[A-Za-z0-9_.\-]{2,32}$/.test(u)) return { ok:false, error:'Username: 2-32 chars (letters, digits, dots, dashes, underscores)' };
    if (pw.length < 6) return { ok:false, error:'Password must be at least 6 characters' };
    if (!em || !isValidEmail(em)) return { ok:false, error:'Valid email required (used for verification + recovery)' };

    var sb = await getClient();
    if (!sb) return { ok:false, error:'Auth service unavailable. Try again in a moment.' };

    // Pre-check username availability via RPC (fast feedback before signup attempt).
    try {
      var avail = await sb.rpc('username_available', { check_username: u });
      if (avail && avail.data === false) {
        return { ok:false, error:'Username already taken — try another or Sign In' };
      }
    } catch(_){ /* if RPC fails we still try the signup */ }

    var redirectTo = location.origin + '/auth-callback.html';
    var resp = await sb.auth.signUp({
      email: em,
      password: pw,
      options: {
        emailRedirectTo: redirectTo,
        data: { username: u }
      }
    });
    if (resp.error) {
      var msg = resp.error.message || 'Sign up failed';
      if (/already.*registered|already.*exists/i.test(msg)) msg = 'Email already registered — try Sign In or use Forgot password';
      return { ok:false, error: msg };
    }

    // The handle_new_user trigger creates the profile row automatically.
    // Cache a stub so UI shows correct state immediately while email confirmation
    // is pending.
    setCachedUser({ id: resp.data.user && resp.data.user.id, username: u, email: em, tokens: 0, totalEarned: 0, streak: 0, tier: 'basic', registeredAt: Date.now(), nick: u });

    // Best-effort: claim welcome bonus immediately if email confirmation is OFF
    // in Supabase config. If confirmation is required, this RPC won't run yet.
    try { if (resp.data.session) await sb.rpc('claim_welcome'); } catch(_){}

    return {
      ok: true,
      user: resp.data.user,
      requiresEmailConfirmation: !resp.data.session
    };
  }

  // ── Sign in (Supabase) — accepts username OR email ──────────────────
  async function signIn(usernameOrEmail, password, remember){
    var input = String(usernameOrEmail || '').trim();
    var pw = String(password || '');
    if (!input || !pw) return { ok:false, error:'Enter your username/email and password' };

    var sb = await getClient();
    if (!sb) return { ok:false, error:'Auth service unavailable.' };

    // Determine if input is email or username, lookup email if username.
    var email = input;
    if (!isValidEmail(input)) {
      try {
        var rpc = await sb.rpc('email_for_username', { check_username: input });
        if (!rpc || !rpc.data) return { ok:false, error:'No account with that username — try Sign Up' };
        email = rpc.data;
      } catch(e){ return { ok:false, error:'Login lookup failed. Try with your email instead.' }; }
    }

    var resp = await sb.auth.signInWithPassword({ email: email, password: pw });
    if (resp.error) {
      var m = resp.error.message || 'Sign in failed';
      if (/invalid.*credentials/i.test(m)) m = 'Wrong password';
      if (/email.*not.*confirmed/i.test(m)) m = 'Confirm your email first — check inbox + spam';
      return { ok:false, error: m };
    }

    await refreshSession();
    return { ok:true, user: resp.data.user };
  }

  // ── Forgot password (Supabase native email) ─────────────────────────
  async function resetPassword(email){
    var em = String(email || '').trim().toLowerCase();
    if (!em || !isValidEmail(em)) return { ok:false, error:'Enter a valid email' };
    var sb = await getClient();
    if (!sb) return { ok:false, error:'Auth service unavailable.' };
    var resp = await sb.auth.resetPasswordForEmail(em, {
      redirectTo: location.origin + '/auth-callback.html?recovery=1'
    });
    if (resp.error) return { ok:false, error: resp.error.message };
    return { ok:true, emailed:true };
  }

  // ── Modal styles + UI ──────────────────────────────────────────────
  var STYLE = '' +
    '.twk-auth-backdrop{position:fixed;inset:0;z-index:2147483644;background:rgba(5,5,10,.82);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:flex;align-items:flex-start;justify-content:center;padding:24px 20px 40px;overflow-y:auto;animation:twkAuthFade .35s ease-out both;font-family:Inter,sans-serif;}' +
    '@media (min-height:780px){.twk-auth-backdrop{align-items:center;}}' +
    '@keyframes twkAuthFade{from{opacity:0}to{opacity:1}}' +
    '.twk-auth-sheet{position:relative;width:100%;max-width:440px;margin:auto 0;background:linear-gradient(165deg,#11111a,#07070b);border:1px solid rgba(255,45,135,.28);border-radius:22px;padding:38px 34px 30px;box-shadow:0 40px 100px rgba(0,0,0,.65);animation:twkAuthRise .55s cubic-bezier(.22,.9,.38,1) .05s both;}' +
    '@keyframes twkAuthRise{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '.twk-auth-crest{display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(145deg,#ff2d87,#9d4edd);color:#fff;font:900 17px/1 "Playfair Display",serif;box-shadow:0 12px 30px rgba(255,45,135,.32);}' +
    '.twk-auth-eye{display:block;text-align:center;font-size:10px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:#ff6fa8;margin-bottom:12px;}' +
    '.twk-auth-title{font:800 clamp(24px,3.5vw,32px)/1.18 "Playfair Display",Georgia,serif;color:#fff;text-align:center;margin:0 0 8px;}' +
    '.twk-auth-title em{font-style:italic;background:linear-gradient(135deg,#ff6fa8,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent;}' +
    '.twk-auth-lede{font-size:13px;line-height:1.55;color:rgba(244,243,247,.72);text-align:center;margin:0 auto 22px;max-width:36ch;}' +
    '.twk-auth-form{display:flex;flex-direction:column;gap:11px;}' +
    '.twk-auth-label{display:block;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8;margin-bottom:6px;}' +
    '.twk-auth-input{width:100%;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#f5f5fb;font:600 14px/1.3 Inter,sans-serif;box-sizing:border-box;}' +
    '.twk-auth-input:focus{outline:none;border-color:rgba(255,45,135,.6);box-shadow:0 0 0 3px rgba(255,45,135,.1);}' +
    '.twk-auth-row{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:2px;font-size:12px;}' +
    '.twk-auth-checkbox{display:inline-flex;align-items:center;gap:8px;color:rgba(244,243,247,.78);cursor:pointer;font:600 12px/1.2 Inter,sans-serif;}' +
    '.twk-auth-checkbox input{accent-color:#ff2d87;width:14px;height:14px;}' +
    '.twk-auth-link{background:none;border:0;color:#ff7eb0;text-decoration:underline;cursor:pointer;font:600 12px Inter,sans-serif;padding:0;}' +
    '.twk-auth-link:hover{color:#fff;}' +
    '.twk-auth-error{display:none;color:#ff6fa8;font-size:12px;font-weight:700;text-align:center;margin-top:4px;}' +
    '.twk-auth-error.is-visible{display:block;}' +
    '.twk-auth-success{display:none;color:#1ee08f;font-size:12.5px;text-align:center;margin-top:8px;line-height:1.5;background:rgba(30,224,143,.08);border:1px solid rgba(30,224,143,.35);padding:10px 12px;border-radius:10px;}' +
    '.twk-auth-success.is-visible{display:block;}' +
    '.twk-auth-submit{margin-top:10px;width:100%;padding:14px;border-radius:10px;background:linear-gradient(180deg,#ff2d87,#9d4edd);color:#fff;font:800 11px/1 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;border:0;cursor:pointer;box-shadow:0 14px 30px rgba(255,45,135,.36);}' +
    '.twk-auth-submit:hover{transform:translateY(-2px)}.twk-auth-submit:disabled{opacity:.5;cursor:wait}' +
    '.twk-auth-toggle{margin-top:6px;width:100%;padding:10px;border-radius:10px;background:transparent;color:#ff7eb0;font:700 11.5px/1 Inter,sans-serif;border:1px solid rgba(255,45,135,.25);cursor:pointer;}' +
    '.twk-auth-toggle:hover{background:rgba(255,45,135,.08);color:#fff;}' +
    '.twk-auth-skip{margin-top:6px;width:100%;padding:10px;border-radius:10px;background:transparent;color:rgba(244,243,247,.55);font:600 11px/1 Inter,sans-serif;border:1px solid rgba(255,255,255,.08);cursor:pointer;}' +
    '.twk-auth-skip:hover{color:#fff;}' +
    '.twk-auth-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(244,243,247,.7);font:400 22px/1 Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}' +
    '.twk-auth-close:hover{background:rgba(255,45,135,.22);color:#fff;transform:rotate(90deg);}' +
    '.twk-auth-tos{font-size:11px;line-height:1.5;color:rgba(244,243,247,.5);text-align:center;margin:14px 0 0;}' +
    '.twk-auth-tos a{color:#ff6fa8;}' +
    '.twk-auth-legal{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,243,247,.35);text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06);}' +
    '.twk-acc-card{position:relative;border:1px solid rgba(255,45,135,.28);border-radius:22px;padding:38px 34px;background:linear-gradient(165deg,#11111a,#07070b);box-shadow:0 30px 80px rgba(0,0,0,.55);max-width:560px;margin:0 auto;text-align:center;}' +
    '.twk-acc-eye{display:block;font-size:10.5px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:#ff6fa8;margin-bottom:12px;}' +
    '.twk-acc-name{font:800 clamp(28px,4vw,42px)/1.15 "Playfair Display",Georgia,serif;color:#fff;margin:0 0 8px;}' +
    '.twk-acc-name em{font-style:italic;background:linear-gradient(135deg,#ff6fa8,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent;}' +
    '.twk-acc-meta{color:rgba(244,243,247,.7);font-size:14px;line-height:1.55;margin:0 auto 24px;max-width:46ch;}' +
    '.twk-acc-actions{display:flex;flex-direction:column;gap:10px;align-items:stretch;max-width:320px;margin:0 auto;}' +
    '.twk-acc-btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 22px;border-radius:10px;font:800 12px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;border:0;cursor:pointer;text-decoration:none;}' +
    '.twk-acc-btn-primary{background:linear-gradient(180deg,#ff2d87,#9d4edd);color:#fff;box-shadow:0 14px 30px rgba(255,45,135,.34);}' +
    '.twk-acc-btn-primary:hover{transform:translateY(-2px);}' +
    '.twk-acc-btn-ghost{background:transparent;color:rgba(244,243,247,.85);border:1px solid rgba(255,255,255,.18);}' +
    '.twk-acc-btn-ghost:hover{background:rgba(255,255,255,.06);border-color:rgba(255,45,135,.45);color:#fff;}' +
    '';

  function injectStyle(){
    if (document.getElementById('twk-auth-style')) return;
    var s = document.createElement('style');
    s.id = 'twk-auth-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  // ── Modals ─────────────────────────────────────────────────────────
  function closeForm(){
    var ex = document.getElementById('twk-auth-modal');
    if (ex) ex.remove();
    try { document.documentElement.style.overflow = ''; } catch(_){}
  }

  function showForm(mode){
    if (mode !== 'signup' && mode !== 'signin' && mode !== 'recovery') mode = 'signup';
    injectStyle();
    var ex = document.getElementById('twk-auth-modal'); if (ex) ex.remove();
    var root = document.createElement('div');
    root.id = 'twk-auth-modal'; root.className = 'twk-auth-backdrop'; root.setAttribute('data-mode', mode);
    if (mode === 'recovery') root.innerHTML = renderRecovery();
    else if (mode === 'signin') root.innerHTML = renderSignIn();
    else root.innerHTML = renderSignUp();
    document.body.appendChild(root);
    bindCommon(root);
    if (mode === 'recovery') bindRecovery(root); else bindAuth(root, mode === 'signup');
    document.documentElement.style.overflow = 'hidden';
  }

  function renderSignUp(){
    return '<form class="twk-auth-sheet" novalidate>' +
      '<button type="button" class="twk-auth-close">×</button>' +
      '<div class="twk-auth-crest">A·T</div>' +
      '<span class="twk-auth-eye">New member</span>' +
      '<h2 class="twk-auth-title">Create your <em>handle</em>.</h2>' +
      '<p class="twk-auth-lede">Username + email + password. Email is required for account verification and recovery.</p>' +
      '<div class="twk-auth-form">' +
        '<div><label class="twk-auth-label" for="twk-auth-username">Username (public)</label>' +
        '<input class="twk-auth-input" id="twk-auth-username" type="text" required maxlength="32" minlength="2" placeholder="solo.collector" autocomplete="username" autocapitalize="none"></div>' +
        '<div><label class="twk-auth-label" for="twk-auth-email">Email</label>' +
        '<input class="twk-auth-input" id="twk-auth-email" type="email" required maxlength="120" placeholder="you@domain.com" autocomplete="email" autocapitalize="none"></div>' +
        '<div><label class="twk-auth-label" for="twk-auth-password">Password (min 6)</label>' +
        '<input class="twk-auth-input" id="twk-auth-password" type="password" required maxlength="64" minlength="6" placeholder="At least 6 chars" autocomplete="new-password"></div>' +
        '<div class="twk-auth-row"><label class="twk-auth-checkbox"><input type="checkbox" id="twk-auth-remember" checked> Remember me on this device</label></div>' +
        '<p class="twk-auth-error" id="twk-auth-error"></p>' +
        '<p class="twk-auth-success" id="twk-auth-success"></p>' +
        '<button type="submit" class="twk-auth-submit">Create account · +200 tokens</button>' +
        '<button type="button" class="twk-auth-toggle" data-toggle-mode="signin">Already a member? · Sign in</button>' +
        '<button type="button" class="twk-auth-skip">Maybe later</button>' +
        '<p class="twk-auth-tos">By entering, you confirm you are 18+ and accept our <a href="/tos.html">terms</a> and <a href="/privacy.html">privacy</a>. We will email you a confirmation link.</p>' +
      '</div><p class="twk-auth-legal">© Alexia Twerk Group · 18+</p></form>';
  }
  function renderSignIn(){
    return '<form class="twk-auth-sheet" novalidate>' +
      '<button type="button" class="twk-auth-close">×</button>' +
      '<div class="twk-auth-crest">A·T</div>' +
      '<span class="twk-auth-eye">Members only</span>' +
      '<h2 class="twk-auth-title">Welcome <em>back</em>.</h2>' +
      '<p class="twk-auth-lede">Enter your username or email and password.</p>' +
      '<div class="twk-auth-form">' +
        '<div><label class="twk-auth-label" for="twk-auth-username">Username or email</label>' +
        '<input class="twk-auth-input" id="twk-auth-username" type="text" required maxlength="120" placeholder="solo.collector or you@domain.com" autocomplete="username" autocapitalize="none"></div>' +
        '<div><label class="twk-auth-label" for="twk-auth-password">Password</label>' +
        '<input class="twk-auth-input" id="twk-auth-password" type="password" required maxlength="64" placeholder="Your password" autocomplete="current-password"></div>' +
        '<div class="twk-auth-row">' +
          '<label class="twk-auth-checkbox"><input type="checkbox" id="twk-auth-remember" checked> Remember me</label>' +
          '<button type="button" class="twk-auth-link" data-toggle-mode="recovery">Forgot password?</button>' +
        '</div>' +
        '<p class="twk-auth-error" id="twk-auth-error"></p>' +
        '<button type="submit" class="twk-auth-submit">Sign in</button>' +
        '<button type="button" class="twk-auth-toggle" data-toggle-mode="signup">Need an account? · Sign up</button>' +
        '<button type="button" class="twk-auth-skip">Maybe later</button>' +
      '</div><p class="twk-auth-legal">© Alexia Twerk Group · 18+</p></form>';
  }
  function renderRecovery(){
    return '<form class="twk-auth-sheet" novalidate>' +
      '<button type="button" class="twk-auth-close">×</button>' +
      '<div class="twk-auth-crest">A·T</div>' +
      '<span class="twk-auth-eye">Password recovery</span>' +
      '<h2 class="twk-auth-title">Reset your <em>password</em>.</h2>' +
      '<p class="twk-auth-lede">Enter your registered email. We will send you a link to choose a new password.</p>' +
      '<div class="twk-auth-form">' +
        '<div><label class="twk-auth-label" for="twk-rec-email">Registered email</label>' +
        '<input class="twk-auth-input" id="twk-rec-email" type="email" required maxlength="120" placeholder="you@domain.com" autocomplete="email" autocapitalize="none"></div>' +
        '<p class="twk-auth-error" id="twk-auth-error"></p>' +
        '<p class="twk-auth-success" id="twk-auth-success"></p>' +
        '<button type="submit" class="twk-auth-submit">Send reset link</button>' +
        '<button type="button" class="twk-auth-toggle" data-toggle-mode="signin">Back to sign in</button>' +
      '</div><p class="twk-auth-legal">© Alexia Twerk Group · 18+</p></form>';
  }

  function bindCommon(root){
    function dismiss(){ closeForm(); }
    root.querySelector('.twk-auth-close').addEventListener('click', dismiss);
    var sk = root.querySelector('.twk-auth-skip'); if (sk) sk.addEventListener('click', dismiss);
    root.addEventListener('click', function(ev){ if (ev.target === root) dismiss(); });
    document.addEventListener('keydown', function eh(ev){ if (ev.key === 'Escape') { dismiss(); document.removeEventListener('keydown', eh); } });
    root.querySelectorAll('[data-toggle-mode]').forEach(function(b){ b.addEventListener('click', function(){ var nm = b.getAttribute('data-toggle-mode'); closeForm(); showForm(nm); }); });
  }

  function bindRecovery(root){
    var errEl = root.querySelector('#twk-auth-error');
    var okEl = root.querySelector('#twk-auth-success');
    function showError(m){ errEl.textContent = m; errEl.classList.add('is-visible'); if (okEl) okEl.classList.remove('is-visible'); }
    function showOk(m){ if (!okEl) return; okEl.innerHTML = m; okEl.classList.add('is-visible'); errEl.classList.remove('is-visible'); }
    root.addEventListener('submit', async function(ev){
      ev.preventDefault();
      var btn = root.querySelector('.twk-auth-submit');
      var em = (root.querySelector('#twk-rec-email')||{}).value;
      btn.disabled = true; errEl.classList.remove('is-visible');
      try {
        var res = await resetPassword(em);
        btn.disabled = false;
        if (!res.ok) { showError(res.error || 'Could not send reset link'); return; }
        showOk('Reset link sent to <strong>' + escapeHtml(em) + '</strong>. Check your inbox (and spam).');
      } catch(err){ btn.disabled = false; showError('Error: ' + (err && err.message || 'Unknown error')); }
    });
  }

  function bindAuth(root, isSignUp){
    var errEl = root.querySelector('#twk-auth-error');
    var okEl = root.querySelector('#twk-auth-success');
    function showError(m){ errEl.textContent = m; errEl.classList.add('is-visible'); if (okEl) okEl.classList.remove('is-visible'); }
    function showOk(m){ if (!okEl) return; okEl.innerHTML = m; okEl.classList.add('is-visible'); errEl.classList.remove('is-visible'); }
    root.addEventListener('submit', async function(ev){
      ev.preventDefault();
      var btn = root.querySelector('.twk-auth-submit');
      var u = root.querySelector('#twk-auth-username').value;
      var pw = root.querySelector('#twk-auth-password').value;
      var em = isSignUp ? (root.querySelector('#twk-auth-email')||{}).value : '';
      var remember = (root.querySelector('#twk-auth-remember')||{}).checked;
      btn.disabled = true; errEl.classList.remove('is-visible');
      try {
        var res = isSignUp ? await register(u, pw, em, remember) : await signIn(u, pw, remember);
        btn.disabled = false;
        if (!res.ok) { showError(res.error); return; }
        if (isSignUp && res.requiresEmailConfirmation) {
          showOk('Account created! Check your email at <strong>' + escapeHtml(em) + '</strong> to confirm and unlock your +200 tokens.');
          // Don't reload — let them see the message.
          return;
        }
        closeForm();
      } catch(err){ btn.disabled = false; showError('Error: ' + (err && err.message || 'Unknown error')); }
    });
  }

  // ── Inline mount for /account.html (#twk-account-auth host) ──────────
  // Renders sign-up/sign-in INSIDE the host element, no modal. Toggles
  // swap content within the same host. If logged in, shows a small
  // "logged in as X" panel with logout button.
  async function mountAccountAuthUI(initialMode){
    var host = document.getElementById('twk-account-auth');
    if (!host) return;
    injectStyle();

    // Determine state: logged in?
    var snap = null;
    try { snap = await refreshSession(); } catch(_){}
    var loggedIn = snap && snap.user && snap.profile;

    if (loggedIn) {
      host.innerHTML =
        '<div class="twk-auth-sheet" style="position:static;transform:none;border-radius:22px;text-align:center;max-width:560px;margin:0 auto">' +
          '<div class="twk-auth-crest">A·T</div>' +
          '<span class="twk-auth-eye">Signed in</span>' +
          '<h2 class="twk-auth-title">Welcome back, <em>' + escapeHtml(snap.profile.username || 'member') + '</em>.</h2>' +
          '<p class="twk-auth-lede">Your dashboard, balance and streak are below. Token actions are tracked globally — sign in from any device.</p>' +
          '<div class="twk-auth-form" style="text-align:left">' +
            '<button type="button" id="twk-acc-logout" class="twk-auth-submit" style="background:transparent;color:rgba(244,243,247,.85);border:1px solid rgba(255,255,255,.18)">Sign out</button>' +
          '</div>' +
        '</div>';
      var lo = host.querySelector('#twk-acc-logout');
      if (lo) lo.addEventListener('click', function(){ logout(); });
      return;
    }

    // Not logged in → render auth form inline
    var mode = (initialMode === 'signin' || initialMode === 'recovery') ? initialMode : 'signup';
    if (location.hash === '#signin') mode = 'signin';
    else if (location.hash === '#recovery' || location.hash === '#forgot') mode = 'recovery';

    function render(){
      var html =
        mode === 'recovery' ? renderRecovery() :
        mode === 'signin'   ? renderSignIn()   :
                              renderSignUp();
      // Strip the modal close button (×) — it's pointless inline
      html = html.replace('<button type="button" class="twk-auth-close">×</button>', '');
      // Inline-friendly sheet styling: no fixed positioning, no oversized vh
      html = html.replace(
        '<form class="twk-auth-sheet"',
        '<form class="twk-auth-sheet" style="position:static;transform:none;border-radius:22px;max-width:560px;margin:0 auto;width:auto"'
      );
      host.innerHTML = html;

      var root = host.querySelector('form.twk-auth-sheet');
      if (!root) return;

      // Wire toggle buttons (signup ↔ signin ↔ recovery) to re-render inline
      root.querySelectorAll('[data-toggle-mode]').forEach(function(b){
        b.addEventListener('click', function(){
          mode = b.getAttribute('data-toggle-mode');
          render();
        });
      });

      // Wire submit / form behaviour
      if (mode === 'recovery') bindRecovery(root);
      else bindAuth(root, mode === 'signup');
    }

    render();
  }

  // ── Public API + auto-mount ──────────────────────────────────────────
  window.TwerkhubAuth = {
    showForm: showForm,
    closeForm: closeForm,
    mount: mountAccountAuthUI,
    logout: logout,
    getCurrent: getCurrent,
    syncFromServer: refreshSession,
    refreshSession: refreshSession,
    register: register,
    signIn: signIn,
    resetPassword: resetPassword,
    isLoggedIn: function(){ return !!getCachedUser(); }
  };

  function tryMount(){
    if (document.getElementById('twk-account-auth')) {
      mountAccountAuthUI();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount);
  } else {
    tryMount();
  }
})();
