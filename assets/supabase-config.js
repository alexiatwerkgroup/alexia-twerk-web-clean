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
  function notifyAuth(event) {
    listeners.forEach(function (cb) {
      try { cb(event, currentSession); } catch (_) {}
    });
  }

  // ─── the Supabase-compat auth API ─────────────────────────────────────
  var auth = {
    getSession: function () {
      return Promise.resolve({ data: { session: currentSession }, error: null });
    },
    getUser: function () {
      var u = currentSession && currentSession.user;
      return Promise.resolve({ data: { user: u || null }, error: null });
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
    resetPasswordForEmail: function () {
      return Promise.resolve({ data: null, error: { message: 'password_reset_not_implemented', code: 'PHASE2' } });
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
      case 'email_for_username':
      case 'admin_get_full_stats':
      case 'record_watch':
        // Phase 3 — not yet implemented
        return Promise.resolve({ data: null, error: { message: 'rpc_not_implemented_yet', code: 'PHASE3' } });
      default:
        return Promise.resolve({ data: null, error: null });
    }
  }
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
  api('/api/auth/session', { method: 'GET' })
    .then(function (r) {
      if (r.body && r.body.ok && r.body.user) {
        currentSession = { access_token: readToken(), user: r.body.user };
        notifyAuth('SIGNED_IN');
      } else {
        clearToken();
      }
    })
    .catch(function () {})
    .then(function () {
      try { window.dispatchEvent(new CustomEvent('twk-supabase-ready')); } catch (_) {}
    });

  if (window.console && console.info) {
    console.info('[twk-supabase] Cloudflare D1 mode v1 — auth proxied to /api/auth/*');
  }
})();
