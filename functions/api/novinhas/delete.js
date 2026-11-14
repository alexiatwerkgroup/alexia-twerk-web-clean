// POST /api/novinhas/delete {c,id} -> (solo dueño) borra un video del canal para siempre:
// archivos en R2 (full, 480h, hq, poster, clips) + entrada en _videos.json + filas en D1 (nv_feat, nv_enh, nv_votes).
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const SLUG = /^[a-z0-9-]{2,60}$/;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
export async function onRequestPost({ request, env }) {
  if (!env.NOVINHAS_VIDEOS || !env.DB) return J({ error: 'not_configured' }, 500);
  let p = null; try { p = await authenticate(request, env); } catch (e) {}
  if (!p || !p.sub) return J({ error: 'auth' }, 401);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || String(u.email).toLowerCase() !== OWNER) return J({ error: 'owner_only' }, 403);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const slug = b.c || '', id = parseInt(b.id, 10);
  if (!SLUG.test(slug) || !(id > 0)) return J({ error: 'bad_request' }, 400);
  const n = String(id).padStart(2, '0');
  const o = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'); if (!o) return J({ error: 'not_found' }, 404);
  const d = await o.json(), before = (d.videos || []).length;
  d.videos = (d.videos || []).filter((x) => x.id !== id);
  if (d.videos.length === before) return J({ error: 'no_such_video' }, 404);
  if ('count' in d) d.count = d.videos.length;
  await env.NOVINHAS_VIDEOS.put(slug + '/_videos.json', JSON.stringify(d), { httpMetadata: { contentType: 'application/json' } });
  const keys = [`${slug}/full/video-${n}.mp4`, `${slug}/480h/video-${n}.mp4`, `${slug}/hq/video-${n}.mp4`, `${slug}/previews/poster-${n}.webp`];
  try { const l = await env.NOVINHAS_VIDEOS.list({ prefix: `${slug}/clips/c-${id}-`, limit: 50 }); (l.objects || []).forEach((x) => keys.push(x.key)); } catch (e) {}
  let gone = 0;
  for (const k of keys) { try { await env.NOVINHAS_VIDEOS.delete(k); gone++; } catch (e) {} }
  for (const q of ['DELETE FROM nv_feat WHERE slug = ? AND vid = ?', 'DELETE FROM nv_enh WHERE slug = ? AND vid = ?', 'DELETE FROM nv_votes WHERE slug = ? AND vid = ?']) {
    try { await env.DB.prepare(q).bind(slug, id).run(); } catch (e) {}
  }
  return J({ ok: true, left: d.videos.length, removedKeys: gone });
}
