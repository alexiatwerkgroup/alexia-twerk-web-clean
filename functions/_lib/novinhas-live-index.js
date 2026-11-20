const CACHE_KEY = '_config/novinhas-live-index.json';
const CACHE_MS = 5 * 60 * 1000;
const SLUG = /^[a-z0-9-]{2,60}$/;
let memory = null;
let pending = null;

async function staticOrder(request, env) {
  try {
    const r = await env.ASSETS.fetch(new URL('/novinhas/channels-live.json', request.url));
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

async function discover(env, preferred) {
  const listed = new Set();
  let cursor;
  do {
    const page = await env.NOVINHAS_VIDEOS.list({ delimiter: '/', limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const prefix of page.delimitedPrefixes || []) {
      const slug = String(prefix).replace(/\/$/, '');
      if (SLUG.test(slug)) listed.add(slug);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const preferredBySlug = new Map((preferred || []).map((x) => [String(x.slug || ''), x]));
  const rows = [];
  const slugs = Array.from(listed);
  for (let i = 0; i < slugs.length; i += 24) {
    const part = await Promise.all(slugs.slice(i, i + 24).map(async (slug) => {
      try {
        const object = await env.NOVINHAS_VIDEOS.get(`${slug}/_videos.json`);
        if (!object) return null;
        const manifest = await object.json();
        const videos = Array.isArray(manifest.videos) ? manifest.videos : [];
        if (!videos.length) return null;
        const old = preferredBySlug.get(slug) || {};
        const first = String(videos[0].id).padStart(2, '0');
        return {
          slug,
          name: String(old.name || manifest.name || slug).slice(0, 120),
          total: videos.length,
          poster: old.poster || Number(first),
          ...(old.img ? { img: old.img } : {})
        };
      } catch { return null; }
    }));
    rows.push(...part.filter(Boolean));
  }

  const bySlug = new Map(rows.map((x) => [x.slug, x]));
  const ordered = [];
  for (const old of preferred || []) {
    const row = bySlug.get(String(old.slug || ''));
    if (row) { ordered.push(row); bySlug.delete(row.slug); }
  }
  const added = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
  const channels = ordered.concat(added);
  return {
    channels,
    channelsDone: channels.length,
    videosDone: channels.reduce((n, c) => n + c.total, 0),
    updatedAt: new Date().toISOString()
  };
}

export async function getNovinhasLiveIndex(request, env) {
  const now = Date.now();
  if (memory && now - memory.cachedAt < CACHE_MS) return memory.value;
  if (pending) return pending;
  pending = (async () => {
    try {
      const cache = await env.NOVINHAS_VIDEOS.get(CACHE_KEY);
      if (cache) {
        const data = await cache.json();
        const t = Date.parse(data.updatedAt || '');
        if (Number.isFinite(t) && now - t < CACHE_MS) {
          memory = { cachedAt: now, value: data };
          return data;
        }
      }
    } catch {}
    const preferred = await staticOrder(request, env);
    const value = await discover(env, preferred);
    try {
      await env.NOVINHAS_VIDEOS.put(CACHE_KEY, JSON.stringify(value), { httpMetadata: { contentType: 'application/json' } });
    } catch {}
    memory = { cachedAt: now, value };
    return value;
  })();
  try { return await pending; }
  finally { pending = null; }
}
