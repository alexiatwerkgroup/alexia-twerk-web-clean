// Estadisticas reales de Novinhas para la home. GET /api/novinhas/stats -> {channels:{done,total}, videos:{done,total}, enhanced:{done,total}, watching, likes, free}
const TOTAL_CHANNELS = 1061, TOTAL_VIDEOS = 12565, FREE = 10, SLUG = /^[a-z0-9-]{2,60}$/;
const J = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Robots-Tag': 'noindex' } });
export async function onRequest({ request, env }) {
  let chans = [];
  try { const r = await env.ASSETS.fetch(new URL('/novinhas/channels-live.json', request.url)); chans = (await r.json()).filter((c) => SLUG.test(c.slug)); } catch (e) {}
  let cached = null;
  try { const o = await env.NOVINHAS_VIDEOS.get('_config/stats-cache.json'); if (o) cached = await o.json(); } catch (e) {}
  let low = 0, videos = 0, enhanced = 0;
  if (cached && Date.now() - cached.t < 600000 && cached.n === chans.length) { low = cached.low; videos = cached.videos; enhanced = cached.enhanced; }
  else {
    for (const c of chans) {
      try {
        const o = await env.NOVINHAS_VIDEOS.get(c.slug + '/_videos.json'); if (!o) continue;
        const vs = (await o.json()).videos || []; videos += vs.length;
        for (const v of vs) if (Math.min(Number(v.width) || 0, Number(v.height) || 0) <= 576) low++;
      } catch (e) {}
      try { let cur; do { const l = await env.NOVINHAS_VIDEOS.list({ prefix: c.slug + '/hq/', cursor: cur }); enhanced += (l.objects || []).filter((x) => /video-\d+\.mp4$/.test(x.key)).length; cur = l.truncated ? l.cursor : null; } while (cur); } catch (e) {}
    }
    try { await env.NOVINHAS_VIDEOS.put('_config/stats-cache.json', JSON.stringify({ t: Date.now(), n: chans.length, low, videos, enhanced }), { httpMetadata: { contentType: 'application/json' } }); } catch (e) {}
  }
  let watching = 0, likes = 0; const now = Math.floor(Date.now() / 1000);
  try { const w = await env.DB.prepare('SELECT COUNT(DISTINCT dev) c FROM nv_presence WHERE ts > ?').bind(now - 600).first(); watching = w ? w.c : 0; } catch (e) {}
  try { const l = await env.DB.prepare('SELECT COUNT(*) c FROM nv_votes').first(); likes = l ? l.c : 0; } catch (e) {}
  let chosen = 0; try { const c = await env.DB.prepare('SELECT COUNT(*) c FROM nv_enh').first(); chosen = c ? c.c : 0; } catch (e) {}
  return J({ channels: { done: chans.length, total: TOTAL_CHANNELS }, videos: { done: videos, total: TOTAL_VIDEOS }, enhanced: { done: enhanced, total: Math.max(chosen, enhanced) }, watching, likes, free: FREE });
}
