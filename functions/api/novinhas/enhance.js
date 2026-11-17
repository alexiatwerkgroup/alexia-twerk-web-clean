// Enhanced: videos procesados con IA y subidos a R2 como <canal>/hq/video-NN.mp4.
//  GET  ?c=slug            -> {ready:[ids], queued:[ids], left, max, vip, owner, auth}
//  POST {c,id}             -> (dueño) agrega a la cola de procesado; espeja la cola a R2 _config/enh-queue.json (la lee el procesador)
//  POST ?use=1 {c,id}      -> devuelve el reproductor; VIP ve todo y el resto recibe una muestra de 5 segundos
//  GET  ?s=1&c=&v=         -> stream limitado a 5 s si no tiene VIP; completa para VIP.
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { isVip } from '../../_lib/vip.js';
import { clipAccessMap, clipCanView } from '../../_lib/novinhas-clip-access.js';
const SLUG = /^[a-z0-9-]{2,60}$/, FREE = 10, VIPX = 3;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const pad = (n) => String(n).padStart(2, '0');
const day = () => new Date().toISOString().slice(0, 10);
async function who(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return { uid: null, owner: false };
    const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
    return { uid: String(p.sub), owner: !!u && String(u.email).toLowerCase() === OWNER };
  } catch (e) { return { uid: null, owner: false }; }
}
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_enh (slug TEXT, vid INTEGER, title TEXT, added INTEGER, PRIMARY KEY (slug, vid))').run();
  try { await db.prepare('ALTER TABLE nv_enh ADD COLUMN start INTEGER DEFAULT 0').run(); } catch (e) {}
  try { await db.prepare('ALTER TABLE nv_enh ADD COLUMN slow INTEGER DEFAULT 0').run(); } catch (e) {}
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_coin (uid TEXT, day TEXT, slug TEXT, vid INTEGER, PRIMARY KEY (uid, day, slug, vid))').run();
}
async function readyIds(env, slug) {
  const out = []; let cursor;
  do {
    const l = await env.NOVINHAS_VIDEOS.list({ prefix: slug + '/hq/', cursor });
    for (const o of l.objects) { const m = /video-(\d{2,3})\.mp4$/.exec(o.key); if (m) out.push(parseInt(m[1], 10)); }
    cursor = l.truncated ? l.cursor : null;
  } while (cursor);
  return out;
}
async function mirror(env) {
  const r = await env.DB.prepare('SELECT slug, vid, title, start, slow FROM nv_enh ORDER BY added').all();
  await env.NOVINHAS_VIDEOS.put('_config/enh-queue.json', JSON.stringify({ updated: Date.now(), items: (r.results || []).map((x) => (x.slow ? { c: x.slug, id: x.vid, title: x.title, clip: { start: x.start || 0, secs: 30 } } : { c: x.slug, id: x.vid, title: x.title })) }), { httpMetadata: { contentType: 'application/json' } });
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url), db = env.DB; await ensure(db);
  const slug = url.searchParams.get('c') || '';
  if (request.method === 'GET' && url.searchParams.get('s')) {
    const vid = parseInt(url.searchParams.get('v'), 10); if (!SLUG.test(slug) || !(vid > 0)) return new Response('Not found', { status: 404 });
    if (!(await clipCanView(request, env, 'enhanced', slug, vid, 0, 0))) return new Response('VIP access required', { status: 403 });
    const w = await who(request, env);
    const vipView = await isVip(request, env);
    if (!vipView && w.uid) { /* Non-VIP accounts get the same five-second teaser as visitors. */ }
    const key = `${slug}/hq/video-${pad(vid)}.mp4`;
    const range = request.headers.get('Range'), head = await env.NOVINHAS_VIDEOS.head(key);
    if (!head) return new Response('Not found', { status: 404 });
    let size = head.size, offset = 0, length = size, status = 200;
    if (!vipView) {
      const metaObj = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'), meta = metaObj ? await metaObj.json() : {}, v = (meta.videos || []).find((x) => Number(x.id) === vid), duration = Math.max(5, Number(v && v.duration) || 30), cap = Math.max(65536, Math.min(size, Math.floor(size * 5 / duration)));
      const m = /^bytes=(\d*)-(\d*)$/.exec(range || '');
      if (m) { offset = m[1] ? parseInt(m[1], 10) : Math.max(0, cap - parseInt(m[2] || '0', 10)); length = m[2] && m[1] ? parseInt(m[2], 10) - offset + 1 : (m[2] && !m[1] ? cap - offset : cap - offset); }
      if (offset >= cap) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${cap}` } });
      length = Math.min(length, cap - offset); status = 206;
      const limited = await env.NOVINHAS_VIDEOS.get(key, { range: { offset, length } }); if (!limited) return new Response('Not found', { status: 404 });
      const h = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'X-Robots-Tag': 'noindex', 'Content-Length': String(length), 'Content-Range': `bytes ${offset}-${offset + length - 1}/${cap}` });
      return new Response(limited.body, { status, headers: h });
    }
    const o = await env.NOVINHAS_VIDEOS.get(key, range ? { range } : undefined); if (!o) return new Response('Not found', { status: 404 });
    offset = o.range ? o.range.offset : 0; length = o.range ? o.range.length : size; status = o.range ? 206 : 200;
    const h = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'X-Robots-Tag': 'noindex' });
    if (o.range) { const a = o.range.offset, b = a + o.range.length - 1; h.set('Content-Range', `bytes ${a}-${b}/${size}`); h.set('Content-Length', String(o.range.length)); status = 206; } else h.set('Content-Length', String(size));
    return new Response(o.body, { status, headers: h });
  }
  if (request.method === 'GET') {
    if (!SLUG.test(slug)) return J({ error: 'bad' }, 400);
    const w = await who(request, env), vip = await isVip(request, env), max = FREE * (vip ? VIPX : 1);
    const q = await db.prepare('SELECT vid FROM nv_enh WHERE slug=?').bind(slug).all();
    const ready = await readyIds(env, slug);
    let left = max;
    if (w.uid) { const u = await db.prepare('SELECT COUNT(*) n FROM nv_coin WHERE uid=? AND day=?').bind(w.uid, day()).first(); left = Math.max(0, max - ((u && u.n) || 0)); }
    const access = await clipAccessMap(db, 'enhanced', slug), readyItems = [], visibleReady = [];
    for (const vid of ready) if (await clipCanView(request, env, 'enhanced', slug, vid, 0, 0)) { visibleReady.push(vid); readyItems.push({ id: vid, start: 0, slow: 0, access: access[`${vid}/0/0`] || 'public', src: `/api/novinhas/enhance?s=1&c=${slug}&v=${vid}`, poster: `/api/novinhas/file?k=${slug}/previews/poster-${pad(vid)}.webp`, name: slug, url: `/novinhas/canal/ver/?c=${slug}&v=${pad(vid)}` }); }
    return J({ ready: visibleReady, readyItems, queued: (q.results || []).map((x) => x.vid).filter((x) => ready.indexOf(x) < 0), left: w.owner ? 999 : left, max, vip: !!vip, owner: w.owner, auth: !!w.uid });
  }
  if (request.method !== 'POST') return J({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const c = String(b.c || slug), id = parseInt(b.id, 10); if (!SLUG.test(c) || !(id > 0)) return J({ error: 'bad' }, 400);
  const w = await who(request, env);
  if (url.searchParams.get('use')) {
    if (!(await clipCanView(request, env, 'enhanced', c, id, 0, 0))) return J({ error: 'vip_required' }, 403);
    if (!(await env.NOVINHAS_VIDEOS.head(`${c}/hq/video-${pad(id)}.mp4`))) return J({ error: 'notready' }, 404);
    const vip = await isVip(request, env);
    return J({ ok: true, left: vip ? 999 : 0, max: 0, vip, src: `/api/novinhas/enhance?s=1&c=${c}&v=${id}` });
  }
  if (!w.owner) return J({ error: 'forbidden' }, 403);
  if (await env.NOVINHAS_VIDEOS.head(`${c}/hq/video-${pad(id)}.mp4`)) return J({ ok: true, dup: 'ready' });
  const st0 = Math.max(0, Math.floor(Number(b.t) || 0)), sl0 = b.slow ? 1 : 0;
  if (await db.prepare('SELECT 1 FROM nv_enh WHERE slug=? AND vid=?').bind(c, id).first()) {
    if (sl0) { await db.prepare('UPDATE nv_enh SET start=?, slow=1 WHERE slug=? AND vid=?').bind(st0, c, id).run(); await mirror(env); return J({ ok: true, dup: 'queued', clip: true }); }
    return J({ ok: true, dup: 'queued' });
  }
  await db.prepare('INSERT OR IGNORE INTO nv_enh (slug, vid, title, added, start, slow) VALUES (?,?,?,?,?,?)').bind(c, id, String(b.title || '').slice(0, 200), Date.now(), sl0 ? st0 : 0, sl0).run();
  await mirror(env);
  return J({ ok: true });
}
