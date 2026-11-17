// Owner-only per-video Public/VIP editor; public IDs are the channel's explicit free allowlist.
import { isOwner, vipCfg, saveVipCfg } from '../../_lib/vip.js';
import { clipAccessMap, changeClipAccess } from '../../_lib/novinhas-clip-access.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const SLUG = /^[a-z0-9-]{2,60}$/;
export async function onRequest({ request, env }) {
  if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
  if (!env.NOVINHAS_VIDEOS) return J({ ok: false, error: 'not_configured' }, 500);
  let body = {};
  if (request.method === 'POST') { try { body = await request.json(); } catch (_) { return J({ ok: false, error: 'bad_json' }, 400); } }
  else if (request.method !== 'GET') return J({ ok: false, error: 'method_not_allowed' }, 405);
  const q = new URL(request.url).searchParams, slug = String(body.c || q.get('c') || ''), id = Number(body.id || q.get('id'));
  if (!SLUG.test(slug) || !Number.isInteger(id) || id < 1) return J({ ok: false, error: 'bad_request' }, 400);
  const kind = String(body.kind || q.get('kind') || '');
  if (['mini', 'preview', 'enhanced'].includes(kind)) {
    const start = Math.max(0, Number(body.start ?? q.get('start')) || 0), slow = Number(body.slow ?? q.get('slow')) ? 1 : 0;
    let key = kind === 'mini' ? `${slug}/mini/m-${id}-${start}-${slow ? 's' : 'n'}.mp4` : kind === 'preview' ? `${slug}/clips/c-${id}-${start}.mp4` : `${slug}/hq/video-${String(id).padStart(2, '0')}.mp4`;
    if (!(await env.NOVINHAS_VIDEOS.head(key))) return J({ ok: false, error: 'clip_not_found' }, 404);
    if (request.method === 'POST') {
      if (body.access !== 'public' && body.access !== 'vip') return J({ ok: false, error: 'bad_access' }, 400);
      await changeClipAccess(request, env, kind, slug, id, start, slow, body.access);
    }
    const access = await clipAccessMap(env.DB, kind, slug);
    return J({ ok: true, slug, id, kind, start, slow, access: access[`${id}/${start}/${slow}`] || 'public' });
  }
  const obj = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json');
  if (!obj) return J({ ok: false, error: 'not_found' }, 404);
  const data = await obj.json(), video = (data.videos || []).find(v => Number(v.id) === id);
  if (!video) return J({ ok: false, error: 'video_not_found' }, 404);
  const cfg = await vipCfg(env) || {}, channels = cfg.channels || {}, c = channels[slug] || { vip: false, free: [] };
  const wasVip = !!c.vip, free = new Set((c.free || []).map(Number));
  if (request.method === 'POST') {
    if (body.access !== 'public' && body.access !== 'vip') return J({ ok: false, error: 'bad_access' }, 400);
    if (!wasVip) (data.videos || []).forEach(v => free.add(Number(v.id)));
    if (body.access === 'public') free.add(id); else free.delete(id);
    // Switching a formerly non-VIP channel to per-video access must not lock its other videos.
    c.vip = true;
    c.free = (data.videos || []).map(v => Number(v.id)).filter(n => free.has(n));
    channels[slug] = c; cfg.channels = channels;
    await saveVipCfg(env, cfg);
  }
  const isPublic = !c.vip || free.has(id);
  return J({ ok: true, slug, id, access: isPublic ? 'public' : 'vip', total: (data.videos || []).length });
}
