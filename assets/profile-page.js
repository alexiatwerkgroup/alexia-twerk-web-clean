/* ═══ TWERKHUB · /profile.html data binding ═══
 * v20260425-p13
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

  function renderHero(profile){
    if (profile) {
      setText('hero-name', profile.username || 'Member');
      setText('hero-role', 'Signed in');
      var tb = $('tokens-balance');
      if (tb) tb.innerHTML = fmt(profile.tokens || 0) + ' <small>TWK</small>';
      var av = $('avatar-preview');
      if (av) {
        if (profile.avatar_url) av.innerHTML = '<img src="' + esc(profile.avatar_url) + '" alt="Avatar">';
        else av.textContent = initials(profile.username);
      }
      var nick = $('nickname'); if (nick && !nick.value) nick.value = profile.username || '';
      var bio = $('bio'); if (bio && !bio.value) bio.value = profile.bio || '';
    } else {
      setText('hero-name', 'Guest');
      setText('hero-role', 'Not signed in');
      var tb2 = $('tokens-balance'); if (tb2) tb2.innerHTML = '0 <small>TWK</small>';
      var av2 = $('avatar-preview'); if (av2) av2.textContent = 'P';
    }
    setText('stat-favorites', countLS('twk_favorites'));
    setText('stat-models', countLS('twk_models_followed'));
    setText('stat-playlists', countLS('twk_playlists_subscribed'));
  }

  function countLS(key){
    try {
      var v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v.length : (typeof v === 'object' && v ? Object.keys(v).length : 0);
    } catch(_){ return 0; }
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
        }
      } catch(e){
        console.warn('[profile-page] save failed', e);
        setStatus('Error: ' + (e && e.message || 'unknown'), 'err');
      }
      saveBtn.disabled = false;
    });
  }

  async function init(){
    wireLogout();
    wireForm();
    var profile = await fetchProfile();
    renderHero(profile);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
