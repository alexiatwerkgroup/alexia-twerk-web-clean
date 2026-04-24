(() => {
  const PAGE_ID = (location.pathname || '').replace(/^\/+/, '');
  if (!PAGE_ID || !PAGE_ID.startsWith('playlist/')) return;

  const SUPABASE_URL = window.SUPABASE_URL || "https://vieqniahusdrfkpcuqsn.supabase.co";
  const SUPABASE_KEY = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ";

  function createClient() {
    if (window._alexiaSupabase && typeof window._alexiaSupabase.from === "function") return window._alexiaSupabase;
    if (!window.supabase || !window.supabase.createClient) return null;
    try { window._alexiaSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); return window._alexiaSupabase; }
    catch (e) { return null; }
  }

  const client = createClient();

  
  function stableAnonHash(input) {
    let h1 = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h1 ^= input.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
  }

  function ensureSessionKey() {
    try {
      const key = 'alexia_pageview_session';
      let v = sessionStorage.getItem(key);
      if (!v) {
        v = 'vs_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(key, v);
      }
      return v;
    } catch (e) {
      return 'vs_fallback';
    }
  }

  function pageBucketKey() {
    const d = new Date();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0');
  }

  
  function alexiaCanonicalPageSlug() {
    try {
      const raw = String(window.location.pathname || '').trim();
      return raw.replace(/^\/+/, '').replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  }

  function alexiaSessionKey() {
    try {
      const key = 'alexia_pageview_session';
      let value = sessionStorage.getItem(key);
      if (!value) {
        value = 'vs_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(key, value);
      }
      return value;
    } catch (e) {
      return 'vs_fallback';
    }
  }

  function alexiaBucketKey() {
    const now = new Date();
    return now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2,'0') + '-' + String(now.getUTCDate()).padStart(2,'0') + '-' + String(now.getUTCHours()).padStart(2,'0');
  }

  function alexiaPageSeenKey(pageSlug) {
    return 'alexia_page_viewed::' + pageSlug + '::' + alexiaBucketKey();
  }

  
  function alexiaResolveSupabaseClient() {
    try {
      if (window.client && typeof window.client.from === 'function') return window.client;
      if (window.supabaseClient && typeof window.supabaseClient.from === 'function') return window.supabaseClient;
      if (window.__supabase && typeof window.__supabase.from === 'function') return window.__supabase;
      if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
      if (typeof supabase !== 'undefined' && supabase) {
        if (typeof supabase.from === 'function') return supabase;
        if (typeof supabase.createClient === 'function') {
          const url = window.SUPABASE_URL || window.__SUPABASE_URL || 'https://vieqniahusdrfkpcuqsn.supabase.co';
          const key = window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY || window.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
          try {
            window.__supabase = supabase.createClient(url, key);
            return window.__supabase;
          } catch (e) {}
        }
      }
    } catch (e) {}
    return null;
  }

  function ensureBrowserId() {
    let id = localStorage.getItem('alexia_browser_id');
    if (!id) {
      id = 'browser_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
      localStorage.setItem('alexia_browser_id', id);
    }
    return id;
  }

  function pageSeenKey(pageId) {
    const slug = alexiaCanonicalPageSlug() || String(pageId || '').replace(/^\/+/, '');
    return alexiaPageSeenKey(slug);
  }

  function voteLocalCountKey(slug) {
    return 'vote_count_' + slug;
  }

  function voteLocalStateKey(slug) {
    return 'voted_' + slug;
  }

  function alexiaLocalViewsKey(pageSlug) {
    return "alexia_local_views::" + pageSlug;
  }

  async function insertPageViewOnce(pageId) {
    const client = alexiaResolveSupabaseClient();
    if (!client) {
      console.warn('page_views skipped: missing Supabase client');
      return;
    }
    const pageSlug = alexiaCanonicalPageSlug() || String(pageId || '').replace(/^\/+/, '');
    if (!pageSlug) return;

    const seenKey = pageSeenKey(pageSlug);
    if (sessionStorage.getItem(seenKey) === '1') return;

    const browserId = ensureBrowserId();
    const sessionKey = alexiaSessionKey();
    const bucketKey = alexiaBucketKey();
    const viewKey = pageSlug + '|' + sessionKey + '|' + bucketKey;
    const ipHash = browserId;

    let inserted = false;
    try {
      const res = await client.from('page_views').insert({
        page_slug: pageSlug,
        view_key: viewKey,
        ip_hash: ipHash,
        session_key: sessionKey,
        bucket_key: bucketKey
      });
      if (!res.error) {
        inserted = true;
        console.log('page_views insert ok', pageSlug, viewKey);
      } else {
        console.warn('page_views insert error', res.error);
      }
    } catch (e) {
      console.warn('page_views insert failed', e);
    }

    try {
      await client.from('page_visits').insert({ page: pageSlug, visitor_id: browserId });
    } catch (e) {
      try { await client.from('page_visits').insert({ page: pageSlug }); } catch (_) {}
    }

    try {
      const localKey = alexiaLocalViewsKey(pageSlug);
      const current = Number(localStorage.getItem(localKey) || '0') || 0;
      localStorage.setItem(localKey, String(current + 1));
    } catch (e) {}

    if (inserted) {
      sessionStorage.setItem(seenKey, '1');
    }
  }

  async function fetchPageViews(pageId) {
    const client = alexiaResolveSupabaseClient();
    if (!client) return 0;
    const pageSlug = alexiaCanonicalPageSlug() || String(pageId || '').replace(/^\/+/, '');
    if (!pageSlug) return 0;

    let remoteCount = null;
    try {
      const { count, error } = await client
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('page_slug', pageSlug);
      if (!error && typeof count === 'number') {
        remoteCount = count;
      } else if (error) {
        console.warn('page_views count error', error);
      }
    } catch (e) {
      console.warn('page_views count failed', e);
    }

    if (remoteCount === null) {
      try {
        const { count, error } = await client
          .from('page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('page', pageSlug);
        if (!error && typeof count === 'number') remoteCount = count;
      } catch (e) {}
    }

    let localCount = 0;
    try {
      localCount = Number(localStorage.getItem(alexiaLocalViewsKey(pageSlug)) || '0') || 0;
    } catch (e) {}

    if (remoteCount === null) return localCount;
    return Math.max(remoteCount, localCount);
  }

  async function fetchVoteCount(slug) {
    const local = Number(localStorage.getItem(voteLocalCountKey(slug)) || '0');
    if (!client) return local;
    try {
      const { count, error } = await client
        .from('video_votes')
        .select('*', { count: 'exact', head: true })
        .eq('video_slug', slug);
      return error ? local : Number(count || 0);
    } catch (e) {
      return local;
    }
  }

  async function fetchHasVoted(slug) {
    const local = localStorage.getItem(voteLocalStateKey(slug)) === '1';
    if (!client) return local;
    try {
      const { data, error } = await client
        .from('video_votes')
        .select('id')
        .eq('video_slug', slug)
        .eq('voter_ip', ensureBrowserId())
        .limit(1);
      return error ? local : !!(data && data.length);
    } catch (e) {
      return local;
    }
  }

  async function setVote(slug, nextState) {
    let localCount = Number(localStorage.getItem(voteLocalCountKey(slug)) || '0');
    localCount = nextState ? localCount + 1 : Math.max(0, localCount - 1);
    localStorage.setItem(voteLocalStateKey(slug), nextState ? '1' : '0');
    localStorage.setItem(voteLocalCountKey(slug), String(localCount));

    if (client) {
      try {
        if (nextState) {
          await client.from('video_votes').insert({ video_slug: slug, voter_ip: ensureBrowserId() });
        } else {
          await client.from('video_votes').delete().eq('video_slug', slug).eq('voter_ip', ensureBrowserId());
        }
      } catch (e) {}
    }

    return fetchVoteCount(slug);
  }

  function rebuildVoteBoxes() {
    const boxes = [...document.querySelectorAll('.vote-box')];
    for (const box of boxes) {
      const slug =
        box.getAttribute('data-video-slug') ||
        box.querySelector('[data-inline-votes]')?.getAttribute('data-inline-votes') ||
        box.querySelector('[data-vote-score]')?.getAttribute('data-vote-score') ||
        box.querySelector('.vote-btn')?.getAttribute('data-video-id');

      if (!slug) continue;

      box.innerHTML = `
        <div class="vote-box-title">Vote this clip as one of the hottest</div>
        <div class="video-meta-line"><span data-page-views>0</span> views · <span data-inline-votes="${slug}">0</span> votes</div>
        <div class="card-actions"><button class="btn vote-btn alexia-fixed-vote-btn" type="button" data-video-id="${slug}">🔥 Vote Hot</button></div>
        <div class="vote-score" style="display:none" data-vote-score="${slug}">Loading votes...</div>
      `;
      box.setAttribute('data-video-slug', slug);
      box.classList.add('alexia-clean-vote-box');
    }
  }

  async function refreshVoteBox(box) {
    const slug = box.getAttribute('data-video-slug');
    if (!slug) return;

    const [views, votes, voted] = await Promise.all([
      fetchPageViews(PAGE_ID),
      fetchVoteCount(slug),
      fetchHasVoted(slug)
    ]);

    const viewsEl = box.querySelector('[data-page-views]');
    const votesEl = box.querySelector('[data-inline-votes]');
    const scoreEl = box.querySelector('[data-vote-score]');
    const btn = box.querySelector('.vote-btn');

    if (viewsEl) viewsEl.textContent = String(views);
    if (votesEl) votesEl.textContent = String(votes);
    if (scoreEl) scoreEl.textContent = votes + ' total vote' + (votes === 1 ? '' : 's');
    if (btn) {
      btn.classList.toggle('active', !!voted);
      btn.textContent = voted ? ('🔥 Voted (' + votes + ')') : ('🔥 Vote Hot (' + votes + ')');
    }
  }

  function bindVoteButtons() {
    const boxes = [...document.querySelectorAll('.vote-box.alexia-clean-vote-box')];
    for (const box of boxes) {
      const btn = box.querySelector('.vote-btn');
      const slug = box.getAttribute('data-video-slug');
      if (!btn || !slug || btn.dataset.bound === '1') continue;
      btn.dataset.bound = '1';

      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const currently = btn.classList.contains('active');
        const updatedCount = await setVote(slug, !currently);
        btn.classList.toggle('active', !currently);
        btn.textContent = !currently ? ('🔥 Voted (' + updatedCount + ')') : ('🔥 Vote Hot (' + updatedCount + ')');
        const votesEl = box.querySelector('[data-inline-votes]');
        if (votesEl) votesEl.textContent = String(updatedCount);
        const scoreEl = box.querySelector('[data-vote-score]');
        if (scoreEl) scoreEl.textContent = updatedCount + ' total vote' + (updatedCount === 1 ? '' : 's');
      });
    }
  }

  async function init() {
    rebuildVoteBoxes();
    bindVoteButtons();
    (async () => { await insertPageViewOnce(PAGE_ID); })();
    const boxes = [...document.querySelectorAll('.vote-box.alexia-clean-vote-box')];
    for (const box of boxes) await refreshVoteBox(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

