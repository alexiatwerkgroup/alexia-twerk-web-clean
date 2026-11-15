// GET /api/novinhas/channel?c=<slug> -> datos del canal y sus videos, con el estado de bloqueo para este visitante.
import { vipCfg, isVip, isLocked } from '../../_lib/vip.js';
// Canales retirados del sitio: no se sirven aunque sus archivos sigan en el bucket.
export const REMOVED = new Set(['carol-videos']);
export async function onRequestGet({ request, env }) {
  const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  const slug = new URL(request.url).searchParams.get('c') || '';
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ error: 'bad_request' }, 400);
  if (REMOVED.has(slug)) return json({ error: 'not_found' }, 404);
  if (!env.NOVINHAS_VIDEOS) return json({ error: 'not_configured' }, 500);
  const o = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'); if (!o) return json({ error: 'not_found' }, 404);
  const data = await o.json();
  // ?prune=1: quita del canal las entradas cuyo poster Y video ya no existen en el bucket (videos borrados). Solo limpia entradas muertas; es idempotente.
  if (new URL(request.url).searchParams.get('prune') === '1' && Array.isArray(data.videos) && data.videos.length <= 150) {
    const dead = [];
    await Promise.all(data.videos.map(async (v) => { const n = String(v.id).padStart(2, '0'); try { const [a, b] = await Promise.all([env.NOVINHAS_VIDEOS.head(`${slug}/previews/poster-${n}.webp`), env.NOVINHAS_VIDEOS.head(`${slug}/full/video-${n}.mp4`)]); if (!a && !b) dead.push(v.id); } catch (e) {} }));
    if (dead.length) { data.videos = data.videos.filter((v) => dead.indexOf(v.id) < 0); if ('count' in data) data.count = data.videos.length; await env.NOVINHAS_VIDEOS.put(slug + '/_videos.json', JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } }); }
    return json({ pruned: dead, left: data.videos.length });
  }
  const cfg = await vipCfg(env); const c = cfg && cfg.channels && cfg.channels[slug];
  const vipChannel = !!(c && c.vip), unlocked = !vipChannel || (await isVip(request, env));
  const K = (k) => '/api/novinhas/file?k=' + k;
  const videos = (data.videos || []).map((v) => { const n = String(v.id).padStart(2, '0'); return {
    id: v.id, title: v.title, width: v.width, height: v.height, duration: v.duration,
    locked: !unlocked && isLocked(cfg, slug, v.id), poster: K(`${slug}/previews/poster-${n}.webp`),
    video: K(`${slug}/full/video-${n}.mp4`), lowVideo: K(`${slug}/480h/video-${n}.mp4`) }; });
  return json({ slug, name: data.name || slug, vip: vipChannel, unlocked, free: vipChannel ? (c.free || []).length : videos.length, total: videos.length, videos });
}
