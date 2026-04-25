/* ═══ TWERKHUB · Supabase config (single source of truth) ═══
 * v20260425-p1
 * Imports the official Supabase JS client from CDN and exposes:
 *   - window.__twkSupabase   (shared client instance for the whole site)
 *   - window.TWK_SUPABASE_URL
 *   - window.TWK_SUPABASE_ANON_KEY
 *
 * SECURITY NOTE: the anon key is safe to expose client-side. It only allows
 * what RLS policies permit. The service_role key MUST NEVER be in client code.
 *
 * Storage key: 'alexia-auth-v3' — separate from comments-v2 to avoid clobbering
 * the comments session. Both can coexist on the same browser.
 */
(function(){
  'use strict';
  if (window.__twkSupabase) return;

  window.TWK_SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  window.TWK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';

  function init(){
    if (!window.supabase || !window.supabase.createClient) return false;
    if (window.__twkSupabase) return true;
    window.__twkSupabase = window.supabase.createClient(
      window.TWK_SUPABASE_URL,
      window.TWK_SUPABASE_ANON_KEY,
      {
        auth: {
          storageKey: 'alexia-auth-v3',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      }
    );
    try { window.dispatchEvent(new CustomEvent('twk-supabase-ready')); } catch(_){}
    return true;
  }

  // Lazy-load the Supabase JS SDK from CDN if not already loaded.
  function ensureSdk(cb){
    if (window.supabase && window.supabase.createClient) { cb(); return; }
    var existing = document.getElementById('twk-supabase-sdk');
    if (existing) { existing.addEventListener('load', cb); return; }
    var s = document.createElement('script');
    s.id = 'twk-supabase-sdk';
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
    s.onload = cb;
    s.onerror = function(){ console.error('[twk-supabase] failed to load SDK'); };
    document.head.appendChild(s);
  }

  ensureSdk(init);

  // Helper for callers who want a Promise that resolves with the client.
  window.twkGetSupabase = function(){
    return new Promise(function(resolve){
      if (window.__twkSupabase) { resolve(window.__twkSupabase); return; }
      function check(){
        if (window.__twkSupabase) { resolve(window.__twkSupabase); return; }
        ensureSdk(function(){ if (init()) resolve(window.__twkSupabase); });
      }
      window.addEventListener('twk-supabase-ready', function(){ resolve(window.__twkSupabase); }, { once: true });
      setTimeout(check, 50);
    });
  };
})();
