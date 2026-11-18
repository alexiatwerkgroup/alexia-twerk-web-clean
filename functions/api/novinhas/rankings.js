// Public all-time Novinhas rankings, based on visits collected since launch.
export async function onRequestGet({ request, env }) {
  // ?order=1 -> orden completo de TODOS los canales por visitas (para ordenar las tarjetas de /novinhas/ igual que el ranking).
  if (new URL(request.url).searchParams.get('order')) {
    const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex' };
    if (!env.DB) return new Response(JSON.stringify({ order: [] }), { status: 503, headers: h });
    try {
      let rows = (await env.DB.prepare("SELECT detail slug,COUNT(*) views FROM tw_events WHERE name='nov_channel_view' AND detail GLOB '[a-z0-9-]*' GROUP BY detail ORDER BY views DESC,detail").all()).results || [];
      if (!rows.length) rows = (await env.DB.prepare("SELECT substr(path,instr(path,'?c=')+3) slug,COUNT(*) views FROM tw_hits WHERE path LIKE '/novinhas/canal%?c=%' AND instr(path,'?c=')>0 GROUP BY slug ORDER BY views DESC,slug").all()).results || [];
      return new Response(JSON.stringify({ order: rows.filter((r) => /^[a-z0-9-]{2,60}$/.test(String(r.slug || ''))).map((r) => ({ slug: r.slug, views: Number(r.views) || 0 })) }), { headers: h });
    } catch (e) { return new Response(JSON.stringify({ order: [] }), { status: 500, headers: h }); }
  }
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex' };
  if (!env.DB || !env.NOVINHAS_VIDEOS) return new Response(JSON.stringify({ channels: [], videos: [] }), { status: 503, headers });
  try {
    let [channelRows, videoRows] = await Promise.all([
      env.DB.prepare("SELECT detail slug,COUNT(*) views FROM tw_events WHERE name='nov_channel_view' AND detail GLOB '[a-z0-9-]*' GROUP BY detail ORDER BY views DESC,detail LIMIT 30").all(),
      env.DB.prepare("SELECT detail,COUNT(*) views FROM tw_events WHERE name='nov_video_view' AND detail LIKE '%:%' GROUP BY detail ORDER BY views DESC,detail LIMIT 30").all()
    ]);
    // If channel-view events predate query retention or could not be written,
    // recover the same all-time counts from first-party page hits.
    if (!(channelRows.results || []).length) {
      channelRows = await env.DB.prepare("SELECT substr(path,instr(path,'?c=')+3) slug,COUNT(*) views FROM tw_hits WHERE path LIKE '/novinhas/canal%?c=%' AND instr(path,'?c=')>0 GROUP BY slug ORDER BY views DESC,slug LIMIT 30").all();
    }
    const cache = new Map();
    async function manifest(slug) {
      if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
      if (!cache.has(slug)) cache.set(slug, (async () => { try { const o = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'); return o ? await o.json() : null; } catch { return null; } })());
      return cache.get(slug);
    }
    const channels = [];
    for (const row of channelRows.results || []) {
      const m = await manifest(String(row.slug || ''));
      if (!m || !Array.isArray(m.videos) || !m.videos.length) continue;
      const first = String(m.videos[0].id).padStart(2, '0');
      channels.push({ slug: row.slug, name: String(m.name || row.slug).slice(0, 100), views: Number(row.views) || 0, poster: `/api/novinhas/file?k=${encodeURIComponent(`${row.slug}/previews/poster-${first}.webp`)}`, url: `/novinhas/canal/?c=${encodeURIComponent(row.slug)}` });
      if (channels.length === 5) break;
    }
    const videos = [];
    for (const row of videoRows.results || []) {
      const key = String(row.detail || ''), at = key.lastIndexOf(':'), slug = key.slice(0, at), id = Number(key.slice(at + 1));
      if (at < 1 || !Number.isInteger(id) || id < 0 || id > 9999) continue;
      const m = await manifest(slug), v = m && Array.isArray(m.videos) ? m.videos.find(x => Number(x.id) === id) : null;
      if (!v) continue;
      const pad = String(id).padStart(2, '0');
      videos.push({ slug, id, name: String(v.title || m.name || slug).slice(0, 100), views: Number(row.views) || 0, poster: `/api/novinhas/file?k=${encodeURIComponent(`${slug}/previews/poster-${pad}.webp`)}`, url: `/novinhas/canal/ver/?c=${encodeURIComponent(slug)}&v=${encodeURIComponent(pad)}` });
      if (videos.length === 5) break;
    }
    return new Response(JSON.stringify({ channels, videos }), { headers });
  } catch {
    return new Response(JSON.stringify({ channels: [], videos: [] }), { status: 500, headers });
  }
}
