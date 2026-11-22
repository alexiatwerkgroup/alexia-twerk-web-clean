// Owner-only RET: retira un video del sitio sin borrarlo de R2.
// GET ?c=&id= -> {ok,retired}; POST {c,id,on:true|false} -> marca/desmarca. Retirados: no se listan ni se sirven (video, poster, teaser, clips) salvo al dueño.
import { isOwner, retiredCfg, saveRetiredCfg } from '../../_lib/vip.js';
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
  const obj = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'); if (!obj) return J({ ok: false, error: 'not_found' }, 404);
  const data = await obj.json(); if (!(data.videos || []).some((v) => Number(v.id) === id)) return J({ ok: false, error: 'video_not_found' }, 404);
  // Lectura fresca (sin la cache de 60 s) para no pisar marcas recientes.
  const raw = await env.NOVINHAS_VIDEOS.get('_config/retired.json'); const cfg = raw ? (await raw.json().catch(() => ({}))) || {} : {};
  const set = new Set((cfg[slug] || []).map(Number));
  if (request.method === 'POST') {
    if (typeof body.on !== 'boolean') return J({ ok: false, error: 'bad_on' }, 400);
    if (body.on) set.add(id); else set.delete(id);
    if (set.size) cfg[slug] = [...set].sort((a, b) => a - b); else delete cfg[slug];
    await saveRetiredCfg(env, cfg);
  }
  return J({ ok: true, slug, id, retired: set.has(id) });
}
