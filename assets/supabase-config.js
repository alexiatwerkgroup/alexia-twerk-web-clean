/* ═══ TWERKHUB · Supabase config — STUB MODE ═══
 * v20260505-p9
 *
 * 2026-05-05: Supabase free tier egress quota was hit (25.35 GB / 5.5 GB).
 * Project requests are dropped until 2026-05-10. To stop ALL outbound traffic
 * to Supabase IMMEDIATELY, this file is now a no-op stub:
 *   - The Supabase JS SDK is NOT loaded from CDN.
 *   - window.__twkSupabase is a fake client that resolves all queries locally
 *     (auth: no session, from(): empty result, rpc(): null) without any
 *     network request.
 *   - Existing callers that check for `window.__twkSupabase` won't blow up;
 *     they receive empty data and fall back to localStorage paths.
 *
 * Things that continue to work:
 *   - Token economy (already localStorage-backed: alexia_tokens_v1.balance)
 *   - All static content (YouTube embeds, playlists, blog, pages)
 *   - Discord / Telegram CTAs (plain links, not Supabase-bound)
 *
 * Things temporarily disabled:
 *   - Email/OAuth signup + login (users are funneled to Discord/Telegram)
 *   - Cross-device token sync (tokens stay per-browser)
 *   - Supabase-backed comments / heatmap / discussion bars (already stubbed
 *     in their own files)
 *
 * To re-enable later: revert this file from git history (commit before this
 * change), or migrate to Cloudflare D1 per _supabase/MIGRATION-MANIFEST.md.
 */
(function(){
  'use strict';
  if (window.__twkSupabase) return;

  // Public constants kept so callers don't blow up reading them.
  window.TWK_SUPABASE_URL = '';
  window.TWK_SUPABASE_ANON_KEY = '';

  /* A chainable no-op that mimics the PostgrestQueryBuilder enough to silence
     existing callers. Every method returns the chain itself; .then() resolves
     immediately with { data: null, error: null }. */
  function makeChain() {
    var chain = {};
    var noopMethods = [
      'select','insert','update','delete','upsert',
      'eq','neq','gt','gte','lt','lte','like','ilike','is','in','contains','containedBy',
      'rangeLt','rangeGt','rangeGte','rangeLte','rangeAdjacent','overlaps',
      'textSearch','match','not','or','filter',
      'order','limit','range','single','maybeSingle','csv','geojson','explain'
    ];
    noopMethods.forEach(function(m){ chain[m] = function(){ return chain; }; });
    chain.then = function(resolve){
      var result = { data: null, error: null, count: null, status: 200, statusText: 'OK' };
      try { resolve(result); } catch(_){}
      return Promise.resolve(result);
    };
    return chain;
  }

  var fakeChannel = {
    on: function(){ return fakeChannel; },
    subscribe: function(cb){ try { cb && cb('SUBSCRIBED'); } catch(_){} return fakeChannel; },
    unsubscribe: function(){ return Promise.resolve('ok'); },
    send: function(){ return Promise.resolve('ok'); }
  };

  var fakeError = { message: 'Backend offline · contact us on Discord/Telegram', code: 'OFFLINE' };

  window.__twkSupabase = {
    auth: {
      getSession: function(){ return Promise.resolve({ data: { session: null }, error: null }); },
      getUser:    function(){ return Promise.resolve({ data: { user: null },    error: null }); },
      onAuthStateChange: function(){
        return { data: { subscription: { unsubscribe: function(){} } } };
      },
      signInWithOtp:      function(){ return Promise.resolve({ data: null, error: fakeError }); },
      signInWithPassword: function(){ return Promise.resolve({ data: null, error: fakeError }); },
      signInWithOAuth:    function(){ return Promise.resolve({ data: null, error: fakeError }); },
      signUp:             function(){ return Promise.resolve({ data: null, error: fakeError }); },
      signOut:            function(){ return Promise.resolve({ error: null }); },
      refreshSession:     function(){ return Promise.resolve({ data: { session: null }, error: null }); },
      updateUser:         function(){ return Promise.resolve({ data: null, error: fakeError }); },
      verifyOtp:          function(){ return Promise.resolve({ data: null, error: fakeError }); },
      resetPasswordForEmail: function(){ return Promise.resolve({ data: null, error: fakeError }); }
    },
    from: function(){ return makeChain(); },
    rpc: function(){
      return Promise.resolve({ data: null, error: null });
    },
    storage: {
      from: function(){
        return {
          upload:   function(){ return Promise.resolve({ data: null, error: fakeError }); },
          download: function(){ return Promise.resolve({ data: null, error: fakeError }); },
          list:     function(){ return Promise.resolve({ data: [],   error: null }); },
          remove:   function(){ return Promise.resolve({ data: null, error: null }); },
          getPublicUrl: function(){ return { data: { publicUrl: '' } }; }
        };
      }
    },
    channel: function(){ return fakeChannel; },
    removeChannel: function(){ return Promise.resolve('ok'); },
    removeAllChannels: function(){ return Promise.resolve('ok'); },
    getChannels: function(){ return []; }
  };

  // Promise-based getter — resolves immediately with the fake client.
  window.twkGetSupabase = function(){
    return Promise.resolve(window.__twkSupabase);
  };

  // Fire ready event so listeners that wait for it don't hang.
  try { window.dispatchEvent(new CustomEvent('twk-supabase-ready')); } catch(_){}

  if (window.console && console.info) {
    console.info('[twk-supabase] STUB MODE — no network calls, all queries resolve locally.');
  }
})();
