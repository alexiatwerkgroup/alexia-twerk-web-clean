/* ═══ TWERKHUB · /profile.html data binding ═══
 * v20260426-p6
 *
 * 2026-04-26 fix p6: founder badge text was mixed Spanish/English
 * ("FOUNDER · VISIONARIO · CREADOR · CEO"). Aligned with sagrada rule #1
 * (English only) → "FOUNDER · VISIONARY · CREATOR · CEO". Title attr too.
 * Bio in DB needs a separate UPDATE (provided to user).
 *
 * 2026-04-26 fix p5: founder still showed "VIP TOP" + 330 TWK because:
 *   (a) DB tier was 'vip' (CHECK constraint blocked 'founder'), so isFounder
 *       returned false — no gold pill, badge label "VIP TOP".
 *   (b) authoritativeBalance() always preferred AlexiaTokens.getState() over
 *       DB tokens, so even after `tokens=999999` in DB, the 330 local stayed.
 * Fix: hardcoded FOUNDER_EMAILS map (alexiatwerkoficial@gmail.com → founder)
 *      so identity is determined by email, not tier. authoritativeBalance now
 *      returns max(local, DB, FOUNDER_MIN_TOKENS) for founders, max(local, DB)
 *      for everyone else. persistFounderRole() also writes alexia_role + bumps
 *      local token balance on first profile render so the topbar updates too.
 *
 * 2026-04-26 fix p4: the static `<span class="auto-user-badge">VISITOR</span>`
 * pill in profile.html was never being updated by JS, so even logged-in
 * founders saw "VISITOR". Added updateAutoBadge() that reads profile.tier
 * (and falls back to localStorage.alexia_role for founder detection) and
 * rewrites the badge label + applies founder styling inline. Called from
 * both the signed-in and guest branches of renderHero().
 * Tokens source: prefer window.AlexiaTokens.getState().balance (the
 * authoritative localStorage-backed value used by the global topbar) over
 * the raw profiles.tokens column, which can be 0 if the user accumulated
 * tokens before the Supabase migration. Avatar always comes from DB.
 *
 * Connects /profile.html to the real Supabase 'profiles' table via the same
 * client + storageKey ('alexia-auth-v3') used by /assets/supabase-config.js
 * and /assets/twerkhub-auth.js. NO localStorage stats, NO hardcoded numbers.
 *
 * What it populates:
 *   #hero-name        ← profile.username  (or "Guest" if not signed in)
 *   #hero-role        ← "Signed in" / "Not signed in"
 *   #tokens-balance   ← profile.tokens (formatted with thousand separator)
 *   #stat-favorites   ← localStorage twk_favorites length
 *   #stat-models      ← localStorage twk_models_followed length
 *   #stat-playlists   ← localStorage twk_playlists_subscribed length
 *   #nickname (form)  ← profile.username (editable)
 *   #bio (form)       ← profile.bio (editable)
 *   #avatar-preview   ← profile.avatar_url (or initials)
 *
 * Logout button (#logout-btn) calls window.TwerkhubAuth.logout() from
 * /assets/twerkhub-auth.js, which signs out of Supabase Auth + wipes all
 * twk-prefixed localStorage + reloads to /.
 *
 * Form save → upserts to public.profiles via Supabase using the same auth
 * session. RLS policy "Users update own non-token fields" allows it.
 */
(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function setText(id, val){ var el = $(id); if (el) el.textContent = val; }
  function fmt(n){ try { return Number(n||0).toLocaleString('en-US'); } catch(_){ return String(n||0); } }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function initials(name){
    var t = String(name||'').trim();
    if (!t) return 'P';
    var parts = t.split(/\s+/).filter(Boolean).slice(0,2);
    return parts.length ? parts.map(function(p){ return p.slice(0,1).toUpperCase(); }).join('').slice(0,2) : t.slice(0,1).toUpperCase();
  }

  function getClient(){
    if (window.twkGetSupabase) return window.twkGetSupabase();
    return Promise.resolve(window.__twkSupabase || null);
  }

  async function fetchProfile(){
    var sb = await getClient();
    if (!sb) return null;
    try {
      var sess = await sb.auth.getSession();
      var user = sess && sess.data && sess.data.session && sess.data.session.user;
      if (!user) return null;
      var p = await sb.from('profiles').select('id,username,email,bio,avatar_url,tokens,total_earned,streak,tier,registered_at').eq('id', user.id).maybeSingle();
      if (p && p.data) return Object.assign({}, p.data, { _userId: user.id, _userEmail: user.email });
      return { _userId: user.id, _userEmail: user.email, username: (user.email||'').split('@')[0], tokens: 0 };
    } catch(e){
      console.warn('[profile-page] fetchProfile failed', e);
      return null;
    }
  }

  // Cache the last successful profile so transient null fetches don't
  // downgrade the UI to "Guest" + initials. This is the source of the
  // "avatar appears then disappears" flicker reported in v13.
  var _lastProfile = null;
  var _lastAvatarUrl = null;

  // Read the authoritative balance from window.AlexiaTokens if available, else
  // fall back to the DB column. The localStorage-backed AlexiaTokens.getState()
  // is what the global topbar uses, so this keeps profile + topbar in sync.
  // ── Founder identity (hardcoded emails — no DB tier dependency) ──
  // The DB `tier` column may have a CHECK constraint that rejects 'founder',
  // and the alexia_role localStorage key only writes if tier comes back as
  // 'founder' from DB. So we ALSO match on canonical founder emails as the
  // ground truth. Add new founder emails here.
  var FOUNDER_EMAILS = {
    'alexiatwerkoficial@gmail.com': true
  };
  var FOUNDER_MIN_TOKENS = 999999;

  function isFounder(profile){
    try {
      var email = String((profile && profile.email) || '').toLowerCase().trim();
      if (email && FOUNDER_EMAILS[email]) return true;
    } catch(_){}
    try {
      var role = localStorage.getItem('alexia_role') || '';
      role = String(role).replace(/"/g, '').toLowerCase();
      if (role === 'founder') return true;
    } catch(_){}
    var tier = String((profile && profile.tier) || '').toLowerCase();
    return tier === 'founder';
  }

  // Persist founder role to localStorage the first time we detect it via email,
  // so other pages (topbar, etc.) treat the user as founder without needing
  // their own DB call.
  function persistFounderRole(profile){
    if (!isFounder(profile)) return;
    try {
      var cur = localStorage.getItem('alexia_role') || '';
      if (cur.indexOf('founder') === -1) {
        localStorage.setItem('alexia_role', JSON.stringify('founder'));
      }
    } catch(_){}
    // Also force the local token balance up to the founder minimum so the
    // displayed balance matches the badge — without waiting for DB→sync that
    // can be blocked if the DB row has tokens=0 due to legacy state.
    try {
      var KEY_BAL = 'alexia_tokens_v1.balance';
      var KEY_TOT = 'alexia_tokens_v1.total';
      var KEY_TIER= 'alexia_tokens_v1.tier';
      var localBal = Number(localStorage.getItem(KEY_BAL) || 0);
      if (localBal < FOUNDER_MIN_TOKENS) {
        localStorage.setItem(KEY_BAL, String(FOUNDER_MIN_TOKENS));
      }
      var localTot = Number(localStorage.getItem(KEY_TOT) || 0);
      if (localTot < FOUNDER_MIN_TOKENS) {
        localStorage.setItem(KEY_TOT, String(FOUNDER_MIN_TOKENS));
      }
      // 'vip' is the highest tier the topbar visual stack recognises
      var curTier = String(localStorage.getItem(KEY_TIER) || '').toLowerCase();
      if (curTier !== 'vip' && curTier !== 'founder') {
        localStorage.setItem(KEY_TIER, 'vip');
      }
      // Notify any listeners (topbar, AlexiaTokens) to refresh from storage
      window.dispatchEvent(new CustomEvent('alexia-tokens-changed', { detail:{ balance: FOUNDER_MIN_TOKENS, tier:'vip', founder:true } }));
    } catch(_){}
  }

  function authoritativeBalance(profile){
    // Founder always sees at least FOUNDER_MIN_TOKENS, regardless of DB/local.
    if (isFounder(profile)) {
      var dbF = Number((profile && profile.tokens) || 0);
      var locF = 0;
      try {
        if (window.AlexiaTokens && typeof window.AlexiaTokens.getState === 'function') {
          locF = Number(window.AlexiaTokens.getState().balance || 0);
        }
      } catch(_){}
      return Math.max(FOUNDER_MIN_TOKENS, dbF, locF);
    }
    // Non-founder: take the MAX of local and DB so DB grants always show.
    var local = NaN;
    try {
      if (window.AlexiaTokens && typeof window.AlexiaTokens.getState === 'function') {
        var st = window.AlexiaTokens.getState();
        local = Number(st && st.balance);
      }
    } catch(_){}
    var db = Number((profile && profile.tokens) || 0);
    if (!Number.isFinite(local) || local < 0) local = 0;
    return Math.max(local, db);
  }

  // Inject the founder badge once. Idempotent — safe to call on every render.
  function ensureFounderBadge(){
    if (document.getElementById('twk-founder-badge')) return;
    var heroName = document.getElementById('hero-name');
    if (!heroName) return;
    // Inject CSS once
    if (!document.getElementById('twk-founder-badge-css')){
      var st = document.createElement('style');
      st.id = 'twk-founder-badge-css';
      st.textContent =
        '#twk-founder-badge{display:inline-flex;align-items:center;gap:8px;margin:8px 0 0;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;color:#1a0010;background:linear-gradient(135deg,#ffd34d 0%,#ff7ab8 50%,#ff2d87 100%);box-shadow:0 4px 18px rgba(255,45,135,.45),inset 0 0 0 1px rgba(255,255,255,.4);text-shadow:0 1px 0 rgba(255,255,255,.35);animation:twkFounderShine 3.6s ease-in-out infinite;}'
      + '#twk-founder-badge::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff;}'
      + '#twk-founder-tag{display:block;margin-top:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ff7ab8;opacity:.92;}'
      + '@keyframes twkFounderShine{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}';
      document.head.appendChild(st);
    }
    var b = document.createElement('div');
    b.id = 'twk-founder-badge';
    b.title = 'Founder of Twerkhub · Visionary · Creator · CEO';
    b.innerHTML = '<span>FOUNDER · VISIONARY · CREATOR · CEO</span>';
    // Insert right after the hero-name node
    if (heroName.parentNode){
      heroName.parentNode.insertBefore(b, heroName.nextSibling);
    }
    // Replace generic "Signed in" with founder tagline
    var role = document.getElementById('hero-role');
    if (role){
      role.id = 'hero-role';
      role.innerHTML = 'Following from day one · <strong style="color:#ff7ab8">Founder of Twerkhub</strong>';
    }
  }

  function removeFounderBadge(){
    var b = document.getElementById('twk-founder-badge');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  // Map a profile tier to the auto-user-badge label. Founder beats everything.
  function tierLabel(profile){
    if (isFounder(profile)) return 'FOUNDER';
    var t = String((profile && profile.tier) || '').toLowerCase();
    if (t === 'vip' || t === 'vip_top' || t === 'viptop') return 'VIP TOP';
    if (t === 'premium') return 'PREMIUM';
    if (t === 'medium')  return 'MEDIUM';
    if (t === 'basic')   return 'MEMBER';
    return profile ? 'MEMBER' : 'VISITOR';
  }
  function updateAutoBadge(profile){
    var badges = document.querySelectorAll('.auto-user-badge,[data-auto-badge="1"]');
    var label = tierLabel(profile);
    for (var i = 0; i < badges.length; i++) {
      var el = badges[i];
      if (el.textContent.trim() === label) continue;
      el.textContent = label;
      // Recolor for the founder so it doesn't read like a generic chip
      if (label === 'FOUNDER') {
        el.style.background = 'linear-gradient(135deg,#ffd34d 0%,#ff7ab8 50%,#ff2d87 100%)';
        el.style.color = '#1a0010';
        el.style.fontWeight = '900';
        el.style.letterSpacing = '1.4px';
        el.style.boxShadow = '0 4px 18px rgba(255,45,135,.45),inset 0 0 0 1px rgba(255,255,255,.4)';
      } else {
        // Restore default styling (clear inline overrides)
        el.style.background = '';
        el.style.color = '';
        el.style.fontWeight = '';
        el.style.letterSpacing = '';
        el.style.boxShadow = '';
      }
    }
  }

  function renderHero(profile){
    if (profile) {
      _lastProfile = profile;
      // Persist founder role + force min token balance BEFORE setText so the
      // dispatched 'alexia-tokens-changed' event reaches a fresh DOM render.
      persistFounderRole(profile);
      setText('hero-name', profile.username || 'Member');
      setText('hero-role', 'Signed in');
      // Founder recognition — must run AFTER setText('hero-role') because that
      // overwrites the inline tagline.
      if (isFounder(profile)) {
        ensureFounderBadge();
      } else {
        removeFounderBadge();
      }
      // Update the static .auto-user-badge so it stops saying "VISITOR" when
      // the user is actually signed in. Reflects current tier.
      updateAutoBadge(profile);
      var tb = $('tokens-balance');
      if (tb) tb.innerHTML = fmt(authoritativeBalance(profile)) + ' <small>TWK</small>';
      var av = $('avatar-preview');
      if (av) {
        var newUrl = profile.avatar_url || '';
        // Re-render whenever URL differs from cached, OR the slot currently has
        // no <img> tag (covers the case where prior renders showed initials).
        var hasImg = !!av.querySelector('img');
        if (newUrl !== _lastAvatarUrl || (newUrl && !hasImg)) {
          if (newUrl) av.innerHTML = '<img src="' + esc(newUrl) + '" alt="Avatar">';
          else av.textContent = initials(profile.username);
          _lastAvatarUrl = newUrl;
        }
      }
      var nick = $('nickname'); if (nick && !nick.value) nick.value = profile.username || '';
      var bio = $('bio'); if (bio && !bio.value) bio.value = profile.bio || '';
    } else if (_lastProfile) {
      profile = _lastProfile;
    } else {
      setText('hero-name', 'Guest');
      setText('hero-role', 'Not signed in');
      var tb2 = $('tokens-balance'); if (tb2) tb2.innerHTML = fmt(authoritativeBalance(null)) + ' <small>TWK</small>';
      var av2 = $('avatar-preview'); if (av2 && _lastAvatarUrl !== '__guest__') {
        av2.textContent = 'P';
        _lastAvatarUrl = '__guest__';
      }
      removeFounderBadge();
      updateAutoBadge(null); // Reset to 'VISITOR' if signed out
    }
    var viewedCount = countLS('twk_viewed_videos');
    var totalSeconds = readNum('twk_watch_seconds_total');
    var activityScore = computeActivityScore(viewedCount, totalSeconds, authoritativeBalance(profile));

    setText('stat-videos-watched', viewedCount);
    setText('stat-total-time', formatTime(totalSeconds));
    setText('stat-activity-score', fmt(activityScore));
    setText('stat-favorites', countLS('twk_favorites'));
    setText('stat-models', countLS('twk_models_followed'));
    setText('stat-playlists', countLS('twk_playlists_subscribed'));

    // Member-since: from profile.registered_at if present, else fallback
    if (profile && profile.registered_at) {
      var d = new Date(profile.registered_at);
      var year = d.getFullYear();
      var dayOne = (Date.now() - d.getTime()) / 86400000 < 7 ? 'DAY 1 · OG' : ('DAY ' + Math.floor((Date.now() - d.getTime()) / 86400000));
      setText('stat-member-year', String(year));
      setText('stat-member-day', dayOne);
    }
  }

  function countLS(key){
    try {
      var v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v.length : (typeof v === 'object' && v ? Object.keys(v).length : 0);
    } catch(_){ return 0; }
  }

  function readNum(key){
    try {
      var v = parseInt(localStorage.getItem(key) || '0', 10);
      return isNaN(v) ? 0 : v;
    } catch(_){ return 0; }
  }

  function formatTime(sec){
    sec = Math.max(0, parseInt(sec, 10) || 0);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm';
    return '0m';
  }

  function computeActivityScore(views, seconds, tokens){
    // Score = 50 per unique video viewed + 1 per minute watched + 0.5 per token earned
    return (views * 50) + Math.floor(seconds / 60) + Math.floor((tokens || 0) * 0.5);
  }

  function wireLogout(){
    var btn = $('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', async function(ev){
      ev.preventDefault();
      btn.disabled = true;
      var orig = btn.innerHTML;
      btn.innerHTML = '<span>Signing out…</span>';
      try {
        if (window.TwerkhubAuth && typeof window.TwerkhubAuth.logout === 'function') {
          await window.TwerkhubAuth.logout();
        } else {
          var sb = await getClient();
          if (sb) await sb.auth.signOut();
          try {
            var keys = []; for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && (k.indexOf('twk') === 0 || k.indexOf('alexia') === 0 || k.indexOf('sb-') === 0)) keys.push(k);
            }
            keys.forEach(function(k){ try { localStorage.removeItem(k); } catch(_){} });
          } catch(_){}
          location.replace('/?logout=1');
        }
      } catch(e){
        console.warn('[profile-page] logout failed', e);
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  }

  function wireForm(){
    var saveBtn = $('save-profile');
    var nickname = $('nickname');
    var bio = $('bio');
    var fileInput = $('avatar-file');
    var removeBtn = $('remove-avatar');
    var status = $('status');
    var avatarData = '';

    function setStatus(msg, kind){
      if (!status) return;
      status.textContent = msg || '';
      status.className = 'status ' + (kind || '');
    }

    function resizeImage(file){
      return new Promise(function(resolve){
        var reader = new FileReader();
        reader.onload = function(){
          var img = new Image();
          img.onload = function(){
            var size = 240, canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            var ctx = canvas.getContext('2d');
            var sw = img.width, sh = img.height, src = Math.min(sw,sh);
            var sx = Math.max(0,(sw-src)/2), sy = Math.max(0,(sh-src)/2);
            ctx.drawImage(img, sx, sy, src, src, 0, 0, size, size);
            try { resolve(canvas.toDataURL('image/jpeg', 0.85)); } catch(_){ resolve(reader.result); }
          };
          img.onerror = function(){ resolve(reader.result); };
          img.src = reader.result;
        };
        reader.onerror = function(){ resolve(''); };
        reader.readAsDataURL(file);
      });
    }

    if (fileInput) fileInput.addEventListener('change', async function(ev){
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      setStatus('Preparing avatar…', '');
      avatarData = await resizeImage(file);
      var av = $('avatar-preview');
      if (av && avatarData) av.innerHTML = '<img src="' + esc(avatarData) + '" alt="Avatar">';
      setStatus('Avatar ready. Click Save to apply.', 'ok');
      ev.target.value = '';
    });

    if (removeBtn) removeBtn.addEventListener('click', function(){
      avatarData = '';
      var av = $('avatar-preview');
      if (av) av.textContent = initials(nickname && nickname.value || '');
      setStatus('Avatar will be removed on save.', '');
    });

    if (saveBtn) saveBtn.addEventListener('click', async function(){
      var nick = String(nickname && nickname.value || '').trim();
      var bioVal = String(bio && bio.value || '').trim().slice(0, 220);
      if (!nick) { setStatus('Please choose a nickname first.', 'err'); if (nickname) nickname.focus(); return; }
      saveBtn.disabled = true;
      setStatus('Saving…', '');
      try {
        var sb = await getClient();
        if (!sb) { setStatus('Supabase not loaded.', 'err'); saveBtn.disabled = false; return; }
        var sess = await sb.auth.getSession();
        var user = sess && sess.data && sess.data.session && sess.data.session.user;
        if (!user) { setStatus('You must sign in first.', 'err'); saveBtn.disabled = false; return; }
        var update = { username: nick, bio: bioVal };
        if (avatarData !== '') update.avatar_url = avatarData;
        var res = await sb.from('profiles').update(update).eq('id', user.id);
        if (res && res.error) {
          setStatus('Could not save: ' + res.error.message, 'err');
        } else {
          setStatus('Profile saved.', 'ok');
          // CRITICAL: force a full re-render with the saved data so the avatar
          // appears without needing a page reload. Reset _lastAvatarUrl first
          // so renderHero treats this as a real change.
          _lastAvatarUrl = null;
          avatarData = ''; // clear staged upload so future saves don't re-upload
          await refresh();
        }
      } catch(e){
        console.warn('[profile-page] save failed', e);
        setStatus('Error: ' + (e && e.message || 'unknown'), 'err');
      }
      saveBtn.disabled = false;
    });
  }

  async function refresh(){
    var profile = await fetchProfile();
    renderHero(profile);
    // If first attempt came back null (e.g. Supabase SDK still loading),
    // retry shortly so the user doesn't sit on a blank "Guest" hero.
    if (!profile && !_lastProfile) {
      setTimeout(async function(){
        var p2 = await fetchProfile();
        if (p2) renderHero(p2);
      }, 1500);
    }
  }

  async function init(){
    wireLogout();
    wireForm();
    await refresh();

    // Live updates: re-fetch tokens + stats when…
    //   1) Tab regains focus (user came back from watching elsewhere)
    //   2) Window storage event (other tab updated localStorage)
    //   3) Custom 'alexia-tokens-changed' event (broadcasted by token-system.js after grant)
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) refresh();
    });
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', function(ev){
      if (ev.key && (ev.key.indexOf('twk_') === 0 || ev.key.indexOf('alexia_') === 0)) refresh();
    });
    window.addEventListener('alexia-tokens-changed', refresh);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
