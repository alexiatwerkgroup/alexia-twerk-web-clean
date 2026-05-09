/* ═══ TWERKHUB · Cloudflare D1 + Pages Functions auth client ═══
 * v20260508-d1-p1
 *
 * 2026-05-08 — MIGRATION OUT OF SUPABASE
 * Replaces the stub client (which was returning fake errors due to Supabase
 * egress quota exhaustion). This file now talks to /api/* Pages Functions
 * backed by Cloudflare D1.
 *
 * Endpoints expected:
 *   POST /api/auth/signup            { email, password, username? }
 *   POST /api/auth/signin            { email, password } | { username, password }
 *   POST /api/auth/signout
 *   GET  /api/auth/session
 *   GET  /api/auth/username-available?u=foo
 *
 * Compat surface preserved:
 *   - window.__twkSupabase (drop-in for existing call sites)
 *   - window.twkGetSupabase()  → Promise<client>
 *   - twk-supabase-ready custom event
 *
 * What's still STUBBED (returns empty/null) until Phase 2:
 *   - from() chainable queries → empty results
 *   - rpc() functions → null (token endpoints will land in Phase 2)
 *   - storage.* → fake errors
 *   - channel() / realtime → no-op
 *
 * To re-add token economy, comments, heatmap, etc., implement /api/tokens/*,
 * /api/comments/*, /api/heatmap/* and update from()/rpc() accordingly.
 */
(function () {
  'use strict';
  if (window.__twkSupabase) return;

  // Public constants kept for legacy callers that read them
  window.TWK_SUPABASE_URL = '';
  window.TWK_SUPABASE_ANON_KEY = '';

  var STORAGE_KEY = 'alexia-auth-v3';

  // ─── localStorage token mgmt ───────────────────────────────────────────
  function readToken() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      return (p && p.token) || null;
    } catch (_) {
      return null;
    }
  }
  function writeToken(token, user) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token, user: user, savedAt: Date.now() }));
    } catch (_) {}
  }
  function clearToken() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    // 2026-05-09: also wipe identity-leaking keys so the next user that
    // logs in on the same device is NOT treated as the previous user
    // (e.g. founder role + 1M token balance leaking from a prior session
    // into a fresh login as a different user).
    var IDENTITY_KEYS = [
      'alexia_role',                    // founder flag
      'alexia_tokens_v1.balance',       // canonical balance
      'alexia_tokens_v1.total',         // legacy total
      'alexia_tokens_v1.total_earned',  // canonical total earned
      'alexia_tokens_v1.tier',          // tier
      'alexia_tokens_v1.streak_days',   // streak
      'alexia_tokens_v1',               // legacy combined object
      'alexia_current_user',            // legacy mirrored profile
      'alexia_forum_profile_v1',        // legacy mirrored profile
      'alexia_tokens_today_v1',         // tokens-earned-today counter
      'alexia_streak_v1',               // page-visit streak
      'alexia_cuts_watched_v1',         // cuts watched counter
      'alexia_age_verified_v1',         // age gate cookie (let the new user re-confirm)
      'alexia_fav_videos',              // favorites list
      'alexia_playlists',               // saved playlists
    ];
    try {
      for (var i = 0; i < IDENTITY_KEYS.length; i++) {
        localStorage.removeItem(IDENTITY_KEYS[i]);
      }
      // Also remove any twk_/alexia_ scoped keys defensively (best effort).
      var doomed = [];
      for (var j = 0; j < localStorage.length; j++) {
        var k = localStorage.key(j);
        if (!k) continue;
        if (k.indexOf('alexia_tokens_v1.') === 0 || k.indexOf('alexia_token') === 0) doomed.push(k);
      }
      doomed.forEach(function(k){ try { localStorage.removeItem(k); } catch(_){} });
    } catch (_) {}
  }

  // ─── HTTP helper ──────────────────────────────────────────────────────
  function api(path, opts) {
    var url = (location.origin || '') + path;
    var token = readToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var fetchOpts = {
      method: (opts && opts.method) || 'GET',
      headers: headers,
      credentials: 'include',
    };
    if (opts && opts.body) fetchOpts.body = JSON.stringify(opts.body);
    return fetch(url, fetchOpts).then(function (res) {
      return res
        .json()
        .catch(function () { return { ok: false, error: 'bad_response' }; })
        .then(function (data) { return { status: res.status, body: data }; });
    });
  }

  // ─── auth state subscription bus ──────────────────────────────────────
  var listeners = [];
  var currentSession = null;

  // sessionReady = a Promise that resolves once the initial /api/auth/session
  // call completes (or fails). Call sites that need a definitive auth state
  // (profile-page, session-tracker, etc.) await this before checking
  // currentSession. Without it, they race past the restore and see null.
  var sessionReadyResolve;
  var sessionReady = new Promise(function (res) { sessionReadyResolve = res; });

  function notifyAuth(event) {
    listeners.forEach(function (cb) {
      try { cb(event, currentSession); } catch (_) {}
    });
  }

  // ─── the Supabase-compat auth API ─────────────────────────────────────
  var auth = {
    getSession: function () {
      // Wait for initial session restore before responding. Without this,
      // page-load callers see null even when a valid token exists in
      // localStorage (race against the async /api/auth/session restore).
      return sessionReady.then(function () {
        return { data: { session: currentSession }, error: null };
      });
    },
    getUser: function () {
      return sessionReady.then(function () {
        var u = currentSession && currentSession.user;
        return { data: { user: u || null }, error: null };
      });
    },
    onAuthStateChange: function (cb) {
      if (typeof cb === 'function') listeners.push(cb);
      return {
        data: {
          subscription: {
            unsubscribe: function () {
              listeners = listeners.filter(function (x) { return x !== cb; });
            },
          },
        },
      };
    },
    signInWithPassword: function (creds) {
      var body = { password: creds.password };
      if (creds.email) body.email = creds.email;
      if (creds.username) body.username = creds.username;
      return api('/api/auth/signin', { method: 'POST', body: body }).then(function (r) {
        if (r.body && r.body.ok && r.body.token) {
          writeToken(r.body.token, r.body.user);
          currentSession = { access_token: r.body.token, user: r.body.user };
          notifyAuth('SIGNED_IN');
          return { data: { user: r.body.user, session: currentSession }, error: null };
        }
        return { data: { user: null, session: null }, error: { message: (r.body && r.body.error) || 'signin_failed' } };
      });
    },
    signUp: function (creds) {
      var body = { email: creds.email, password: creds.password };
      if (creds && creds.options && creds.options.data && creds.options.data.username) {
        body.username = creds.options.data.username;
      }
      return api('/api/auth/signup', { method: 'POST', body: body }).then(function (r) {
        if (r.body && r.body.ok && r.body.token) {
          writeToken(r.body.token, r.body.user);
          currentSession = { access_token: r.body.token, user: r.body.user };
          notifyAuth('SIGNED_IN');
          return { data: { user: r.body.user, session: currentSession }, error: null };
        }
        return { data: { user: null, session: null }, error: { message: (r.body && r.body.error) || 'signup_failed' } };
      });
    },
    signOut: function () {
      return api('/api/auth/signout', { method: 'POST' }).then(function () {
        clearToken();
        currentSession = null;
        notifyAuth('SIGNED_OUT');
        return { error: null };
      });
    },
    refreshSession: function () { return Promise.resolve({ data: { session: currentSession }, error: null }); },
    updateUser: function () {
      return Promise.resolve({ data: null, error: { message: 'not_implemented_yet', code: 'PHASE2' } });
    },
    signInWithOtp: function () {
      return Promise.resolve({ data: null, error: { message: 'otp_not_supported_on_d1', code: 'PHASE2' } });
    },
    signInWithOAuth: function () {
      return Promise.resolve({ data: null, error: { message: 'oauth_not_implemented', code: 'PHASE2' } });
    },
    verifyOtp: function () {
      return Promise.resolve({ data: null, error: { message: 'otp_not_supported_on_d1', code: 'PHASE2' } });
    },
    resetPasswordForEmail: function (email) {
      return api('/api/auth/forgot-password', { method: 'POST', body: { email: email } }).then(function (r) {
        if (r.body && r.body.ok) return { data: { email: email }, error: null };
        return { data: null, error: { message: (r.body && r.body.error) || 'reset_failed' } };
      });
    },
  };

  // ─── from() / rpc() / storage / channel — STUBBED until Phase 2 ───────
  function makeChain() {
    var chain = {};
    var methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
      'contains', 'containedBy', 'rangeLt', 'rangeGt', 'rangeGte', 'rangeLte',
      'rangeAdjacent', 'overlaps', 'textSearch', 'match', 'not', 'or', 'filter',
      'order', 'limit', 'range', 'single', 'maybeSingle', 'csv', 'geojson', 'explain',
    ];
    methods.forEach(function (m) { chain[m] = function () { return chain; }; });
    chain.then = function (resolve) {
      var result = { data: null, error: null, count: null, status: 200, statusText: 'OK' };
      try { resolve(result); } catch (_) {}
      return Promise.resolve(result);
    };
    return chain;
  }
  var fakeChannel = {
    on: function () { return fakeChannel; },
    subscribe: function (cb) { try { cb && cb('SUBSCRIBED'); } catch (_) {} return fakeChannel; },
    unsubscribe: function () { return Promise.resolve('ok'); },
    send: function () { return Promise.resolve('ok'); },
  };

  // ─── rpc() router → maps Supabase RPC calls to /api/* endpoints ──────
  // Existing client code calls window.__twkSupabase.rpc('claim_daily', {})
  // and similar. We route those to the new Pages Functions.
  function rpc(fn, args) {
    args = args || {};
    switch (fn) {
      case 'claim_daily':
        return api('/api/tokens/claim-daily', { method: 'POST', body: {} }).then(toRpcResult);
      case 'claim_welcome':
        return api('/api/tokens/claim-welcome', { method: 'POST', body: {} }).then(toRpcResult);
      case 'grant_tokens':
        return api('/api/tokens/grant', {
          method: 'POST',
          body: { amount: args.amount, reason: args.reason },
        }).then(toRpcResult);
      case 'bump_session':
        return api('/api/session/bump', {
          method: 'POST',
          body: { seconds_delta: args.seconds_delta, cuts_delta: args.cuts_delta },
        }).then(toRpcResult);
      case 'username_available':
        var u = encodeURIComponent(args.text || args.username || '');
        return api('/api/auth/username-available?u=' + u, { method: 'GET' }).then(function (r) {
          return { data: r.body && r.body.available, error: null };
        });
      case 'record_watch':
        return api('/api/heatmap/record', {
          method: 'POST',
          body: { vid: args.vid || args.video_id, watched: args.watched || [] },
        }).then(toRpcResult);
      case 'admin_get_full_stats':
        return api('/api/admin/full-stats', { method: 'GET' }).then(function (r) {
          if (r.body && r.body.ok) return { data: r.body.users || [], error: null };
          return { data: null, error: { message: (r.body && r.body.error) || 'admin_failed' } };
        });
      case 'email_for_username':
        // Implicit via /api/auth/signin which accepts {username, password}.
        // No standalone endpoint — clients should send username directly to signin.
        return Promise.resolve({ data: null, error: { message: 'use_signin_with_username', code: 'COMPAT' } });
      default:
        return Promise.resolve({ data: null, error: null });
    }
  }

  // ─── window.TwkAPI · clean namespace for new code ─────────────────────
  // Use these directly in new files; bypasses the from()/rpc() Supabase
  // compat layer. Cleaner, easier to debug.
  window.TwkAPI = {
    auth: {
      signin: function (creds) { return api('/api/auth/signin', { method: 'POST', body: creds }).then(function(r){return r.body;}); },
      signup: function (creds) { return api('/api/auth/signup', { method: 'POST', body: creds }).then(function(r){return r.body;}); },
      signout: function () { return api('/api/auth/signout', { method: 'POST' }).then(function(r){return r.body;}); },
      session: function () { return api('/api/auth/session', { method: 'GET' }).then(function(r){return r.body;}); },
      usernameAvailable: function (u) { return api('/api/auth/username-available?u=' + encodeURIComponent(u)).then(function(r){return r.body;}); },
      forgotPassword: function (email) { return api('/api/auth/forgot-password', { method: 'POST', body: { email: email } }).then(function(r){return r.body;}); },
      resetPassword: function (tokenParam, newPassword) { return api('/api/auth/reset-password', { method: 'POST', body: { token: tokenParam, new_password: newPassword } }).then(function(r){return r.body;}); },
      sendVerification: function () { return api('/api/auth/send-verification', { method: 'POST', body: {} }).then(function(r){return r.body;}); },
    },
    profile: {
      me: function () { return api('/api/profile/me', { method: 'GET' }).then(function(r){return r.body;}); },
      updateMe: function (patch) { return api('/api/profile/me', { method: 'POST', body: patch }).then(function(r){return r.body;}); },
      get: function (idOrUsername) { return api('/api/profile/' + encodeURIComponent(idOrUsername), { method: 'GET' }).then(function(r){return r.body;}); },
    },
    tokens: {
      claimDaily: function () { return api('/api/tokens/claim-daily', { method: 'POST', body: {} }).then(function(r){return r.body;}); },
      claimWelcome: function () { return api('/api/tokens/claim-welcome', { method: 'POST', body: {} }).then(function(r){return r.body;}); },
      grant: function (amount, reason) { return api('/api/tokens/grant', { method: 'POST', body: { amount: amount, reason: reason } }).then(function(r){return r.body;}); },
      bumpSession: function (secs, cuts) { return api('/api/session/bump', { method: 'POST', body: { seconds_delta: secs || 0, cuts_delta: cuts || 0 } }).then(function(r){return r.body;}); },
    },
    comments: {
      list: function (pageSlug, opts) {
        opts = opts || {};
        var qs = '?page=' + encodeURIComponent(pageSlug);
        if (opts.limit) qs += '&limit=' + opts.limit;
        if (opts.offset) qs += '&offset=' + opts.offset;
        return api('/api/comments' + qs, { method: 'GET' }).then(function(r){return r.body;});
      },
      post: function (pageSlug, bodyText) { return api('/api/comments', { method: 'POST', body: { page_slug: pageSlug, body: bodyText } }).then(function(r){return r.body;}); },
      del: function (id) { return api('/api/comments/' + encodeURIComponent(id), { method: 'DELETE' }).then(function(r){return r.body;}); },
      report: function (id, reason) { return api('/api/comments/report', { method: 'POST', body: { comment_id: id, reason: reason } }).then(function(r){return r.body;}); },
    },
    heatmap: {
      get: function (videoId) { return api('/api/heatmap/' + encodeURIComponent(videoId), { method: 'GET' }).then(function(r){return r.body;}); },
      record: function (videoId, watchedBuckets) { return api('/api/heatmap/record', { method: 'POST', body: { vid: videoId, watched: watchedBuckets || [] } }).then(function(r){return r.body;}); },
    },
    admin: {
      fullStats: function () { return api('/api/admin/full-stats', { method: 'GET' }).then(function(r){return r.body;}); },
    },
  };
  function toRpcResult(r) {
    if (r.body && r.body.ok) return { data: r.body, error: null };
    return { data: null, error: { message: (r.body && r.body.error) || 'rpc_failed', code: r.status } };
  }

  window.__twkSupabase = {
    auth: auth,
    from: function () { return makeChain(); },
    rpc: rpc,
    storage: {
      from: function () {
        var stubErr = { message: 'storage_not_implemented_on_d1', code: 'PHASE2' };
        return {
          upload: function () { return Promise.resolve({ data: null, error: stubErr }); },
          download: function () { return Promise.resolve({ data: null, error: stubErr }); },
          list: function () { return Promise.resolve({ data: [], error: null }); },
          remove: function () { return Promise.resolve({ data: null, error: null }); },
          getPublicUrl: function () { return { data: { publicUrl: '' } }; },
        };
      },
    },
    channel: function () { return fakeChannel; },
    removeChannel: function () { return Promise.resolve('ok'); },
    removeAllChannels: function () { return Promise.resolve('ok'); },
    getChannels: function () { return []; },
  };

  window.twkGetSupabase = function () { return Promise.resolve(window.__twkSupabase); };

  // ─── boot: validate any stored token by calling /api/auth/session ─────
  // Hard timeout: if /api/auth/session hangs >5s, we resolve sessionReady
  // anyway with null so callers don't deadlock the UI.
  var bootTimeout = setTimeout(function () {
    if (sessionReadyResolve) { sessionReadyResolve(); sessionReadyResolve = null; }
  }, 5000);

  // 2026-05-09: don't clearToken on transient session-validation failure.
  // Hard refresh, network blip, or SW intercepting /api/auth/session can
  // make this return non-ok temporarily — the OLD code wiped auth-v3 + 15
  // other identity keys, randomly logging the user out. Now we ONLY clear
  // on EXPLICIT 401/403 (server says "your token is invalid"), not on
  // missing/empty body or 5xx.
  api('/api/auth/session', { method: 'GET' })
    .then(function (r) {
      if (r.body && r.body.ok && r.body.user) {
        currentSession = { access_token: readToken(), user: r.body.user };
        notifyAuth('SIGNED_IN');
      } else if (r.status === 401 || r.status === 403) {
        // Server explicitly rejected. Clear local auth.
        clearToken();
      } else {
        // Transient/empty response — DO NOT log the user out. Just leave
        // the existing local token in place; later auth-required requests
        // will revalidate when the network is back.
        var stored = readToken();
        if (stored) {
          // Build a placeholder session from localStorage so the UI still
          // treats user as signed-in until next successful validation.
          try {
            var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (raw && raw.user) {
              currentSession = { access_token: stored, user: raw.user };
              notifyAuth('SIGNED_IN');
            }
          } catch (_) {}
        }
      }
    })
    .catch(function () {
      // Network error — same as transient: keep local auth.
      var stored = readToken();
      if (stored) {
        try {
          var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (raw && raw.user) {
            currentSession = { access_token: stored, user: raw.user };
            notifyAuth('SIGNED_IN');
          }
        } catch (_) {}
      }
    })
    .then(function () {
      clearTimeout(bootTimeout);
      if (sessionReadyResolve) { sessionReadyResolve(); sessionReadyResolve = null; }
      try { window.dispatchEvent(new CustomEvent('twk-supabase-ready')); } catch (_) {}
    });

  if (window.console && console.info) {
    console.info('[twk-supabase] Cloudflare D1 mode v1 — auth proxied to /api/auth/*');
  }
})();
