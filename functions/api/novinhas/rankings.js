// Public all-time Novinhas rankings, based on visits collected since launch.
import { clipCanView } from '../../_lib/novinhas-clip-access.js';
import { isVip, isLocked, vipCfg, REMOVED_CHANNELS } from '../../_lib/vip.js';

export async function onRequestGet({ request, env }) {
  // ?order=1 -> orden completo de TODOS los canales por visitas (para ordenar las tarjetas de /novinhas/ igual que el ranking).
  if (new URL(request.url).searchParams.get('order')) {
    const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex' };
    if (!env.DB) return new Response(JSON.stringify({ order: [] }), { status: 503, headers: h });
    try {
      let rows = (await env.DB.prepare("SELECT detail slug,COUNT(*) views FROM tw_events WHERE name='nov_channel_view' AND detail GLOB '[a-z0-9-]*' GROUP BY detail ORDER BY views DESC,detail").all()).results || [];
      if (!rows.length) rows = (await env.DB.prepare("SELECT substr(path,instr(path,'?c=')+3) slug,COUNT(*) views FROM tw_hits WHERE path LIKE '/novinhas/canal%?c=%' AND instr(path,'?c=')>0 GROUP BY slug ORDER BY views DESC,slug").all()).results || [];
      return new Response(JSON.stringify({ order: rows.filter((r) => /^[a-z0-9-]{2,60}$/.test(String(r.slug || '')) && !REMOVED_CHANNELS.has(String(r.slug || ''))).map((r) => ({ slug: r.slug, views: Number(r.views) || 0 })) }), { headers: h });
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
    // Pull the owner's pinned mini-clip choice into each Hall of Fame channel card.
    // If a channel has two pins, rotate deterministically once per day.
    const pinsBySlug = {};
    try {
      const pins = (await env.DB.prepare('SELECT slug,vid,pinned_at FROM nv_thumb_pins ORDER BY pinned_at,vid').all()).results || [];
      for (const p of pins) (pinsBySlug[p.slug] = pinsBySlug[p.slug] || []).push(Number(p.vid));
    } catch (e) {}
    const day = Math.floor(Date.now() / 86400000);
    async function pinnedPreview(slug) {
      const pins = pinsBySlug[slug] || [];
      if (!pins.length) return null;
      const chosen = pins[day % pins.length];
      const row = await env.DB.prepare('SELECT start FROM nv_feat WHERE slug=? AND vid=? AND auto=0').bind(slug, chosen).first();
      if (!row) return null;
      const start = Number(row.start) || 0;
      if (!(await clipCanView(request, env, 'preview', slug, chosen, start, 0))) return null;
      const key = `${slug}/clips/c-${chosen}-${start}.mp4`;
      if (!(await env.NOVINHAS_VIDEOS.head(key))) return null;
      return { id: chosen, previewSrc: `/api/novinhas/featured?cs=1&c=${encodeURIComponent(slug)}&v=${chosen}&t=${start}` };
    }
    const channelCandidates = (channelRows.results || []).filter((row) => !REMOVED_CHANNELS.has(String(row.slug || '')));
    for (let i = 0; i < channelCandidates.length && channels.length < 5; i += 12) {
      const batch = await Promise.all(channelCandidates.slice(i, i + 12).map(async (row) => {
        const slug = String(row.slug || ''), m = await manifest(slug);
        if (!m || !Array.isArray(m.videos) || !m.videos.length) return null;
        const pinned = await pinnedPreview(slug);
        const previewId = String(pinned ? pinned.id : m.videos[0].id).padStart(2, '0');
        return { slug, name: String(m.name || slug).slice(0, 100), views: Number(row.views) || 0, poster: `/api/novinhas/file?k=${encodeURIComponent(`${slug}/previews/poster-${previewId}.webp`)}`, ...(pinned ? { previewSrc: pinned.previewSrc } : {}), url: `/novinhas/canal/?c=${encodeURIComponent(slug)}` };
      }));
      channels.push(...batch.filter(Boolean));
    }
    const videos = [];
    const vipConfig = await vipCfg(env), vipViewer = await isVip(request, env);
    const videoCandidates = (videoRows.results || []).filter((row) => !REMOVED_CHANNELS.has(String(String(row.detail || '').split(':')[0])));
    for (let i = 0; i < videoCandidates.length && videos.length < 5; i += 10) {
      const batch = await Promise.all(videoCandidates.slice(i, i + 10).map(async (row) => {
        const key = String(row.detail || ''), at = key.lastIndexOf(':'), slug = key.slice(0, at), id = Number(key.slice(at + 1));
        if (at < 1 || !Number.isInteger(id) || id < 0 || id > 9999) return null;
        const m = await manifest(slug), v = m && Array.isArray(m.videos) ? m.videos.find(x => Number(x.id) === id) : null;
        if (!v) return null;
        const pad = String(id).padStart(2, '0');
        let previewSrc = '';
        const locked = isLocked(vipConfig, slug, id);
        if (locked && !vipViewer) {
          // Locked videos may only use the separate public teaser asset.
          const teaser = `${slug}/teasers/video-${pad}.mp4`;
          if (await env.NOVINHAS_VIDEOS.head(teaser)) previewSrc = `/api/novinhas/file?k=${encodeURIComponent(teaser)}`;
        } else {
          let media = `${slug}/480h/video-${pad}.mp4`;
          if (!(await env.NOVINHAS_VIDEOS.head(media))) media = `${slug}/full/video-${pad}.mp4`;
          if (await env.NOVINHAS_VIDEOS.head(media)) previewSrc = `/api/novinhas/file?k=${encodeURIComponent(media)}`;
        }
        return { slug, id, name: String(v.title || m.name || slug).slice(0, 100), views: Number(row.views) || 0, poster: `/api/novinhas/file?k=${encodeURIComponent(`${slug}/previews/poster-${pad}.webp`)}`, ...(previewSrc ? { previewSrc } : {}), url: `/novinhas/canal/ver/?c=${encodeURIComponent(slug)}&v=${encodeURIComponent(pad)}` };
      }));
      videos.push(...batch.filter(Boolean));
    }
    return new Response(JSON.stringify({ channels: channels.slice(0, 5), videos: videos.slice(0, 5) }), { headers });
  } catch {
    return new Response(JSON.stringify({ channels: [], videos: [] }), { status: 500, headers });
  }
}
