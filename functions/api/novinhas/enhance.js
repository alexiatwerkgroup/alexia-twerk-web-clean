// Videos "mejorados" (procesados con IA en la PC del dueño y subidos a R2 como <canal>/hq/video-NN.mp4).
//  GET  ?c=slug            -> {ready:[ids], queued:[ids], left, max, vip, owner, auth}
//  POST {c,id}             -> (dueño) agrega a la cola de procesado; espeja la cola a R2 _config/enh-queue.json (la lee el procesador)
//  POST ?use=1 {c,id}      -> gasta 1 moneda del dia (10 gratis, 30 VIP; dueño gratis) y habilita el video mejorado hoy
//  GET  ?s=1&c=&v=         -> stream (Range) del video mejorado, solo si hoy fue habilitado (o dueño). Sin descarga.
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { isVip } from '../../_lib/vip.js';
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
  const r = await env.DB.prepare('SELECT slug, vid, title FROM nv_enh ORDER BY added').all();
  await env.NOVINHAS_VIDEOS.put('_config/enh-queue.json', JSON.stringify({ updated: Date.now(), items: (r.results || []).map((x) => ({ c: x.slug, id: x.vid, title: x.title })) }), { httpMetadata: { contentType: 'application/json' } });
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url), db = env.DB; await ensure(db);
  const slug = url.searchParams.get('c') || '';
  if (request.method === 'GET' && url.searchParams.get('s')) {
    const vid = parseInt(url.searchParams.get('v'), 10); if (!SLUG.test(slug) || !(vid > 0)) return new Response('Not found', { status: 404 });
    const w = await who(request, env);
    if (!w.owner) {
      if (!w.uid) return new Response('Login required', { status: 401 });
      const ok = await db.prepare('SELECT 1 FROM nv_coin WHERE uid=? AND day=? AND slug=? AND vid=?').bind(w.uid, day(), slug, vid).first();
      if (!ok) return new Response('Locked', { status: 403 });
    }
    const key = `${slug}/hq/video-${pad(vid)}.mp4`;
    const range = request.headers.get('Range'); const o = await env.NOVINHAS_VIDEOS.get(key, range ? { range } : undefined);
    if (!o) return new Response('Not found', { status: 404 });
    const h = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'X-Robots-Tag': 'noindex' });
    const size = o.size; let st = 200;
    if (range && o.range) { const a = o.range.offset, b = a + o.range.length - 1; h.set('Content-Range', `bytes ${a}-${b}/${size}`); h.set('Content-Length', String(o.range.length)); st = 206; } else h.set('Content-Length', String(size));
    return new Response(o.body, { status: st, headers: h });
  }
  if (request.method === 'GET') {
    if (!SLUG.test(slug)) return J({ error: 'bad' }, 400);
    const w = await who(request, env), vip = await isVip(request, env), max = FREE * (vip ? VIPX : 1);
    const q = await db.prepare('SELECT vid FROM nv_enh WHERE slug=?').bind(slug).all();
    const ready = await readyIds(env, slug);
    let left = max;
    if (w.uid) { const u = await db.prepare('SELECT COUNT(*) n FROM nv_coin WHERE uid=? AND day=?').bind(w.uid, day()).first(); left = Math.max(0, max - ((u && u.n) || 0)); }
    return J({ ready, queued: (q.results || []).map((x) => x.vid).filter((x) => ready.indexOf(x) < 0), left: w.owner ? 999 : left, max, vip: !!vip, owner: w.owner, auth: !!w.uid });
  }
  if (request.method !== 'POST') return J({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const c = String(b.c || slug), id = parseInt(b.id, 10); if (!SLUG.test(c) || !(id > 0)) return J({ error: 'bad' }, 400);
  const w = await who(request, env);
  if (url.searchParams.get('use')) {
    if (!w.uid) return J({ error: 'login' }, 401);
    if (!(await env.NOVINHAS_VIDEOS.head(`${c}/hq/video-${pad(id)}.mp4`))) return J({ error: 'notready' }, 404);
    const vip = await isVip(request, env), max = FREE * (vip ? VIPX : 1);
    if (!w.owner) {
      const had = await db.prepare('SELECT 1 FROM nv_coin WHERE uid=? AND day=? AND slug=? AND vid=?').bind(w.uid, day(), c, id).first();
      if (!had) {
        const u = await db.prepare('SELECT COUNT(*) n FROM nv_coin WHERE uid=? AND day=?').bind(w.uid, day()).first();
        if (((u && u.n) || 0) >= max) return J({ error: 'nocoins', left: 0, max }, 402);
        await db.prepare('INSERT OR IGNORE INTO nv_coin (uid, day, slug, vid) VALUES (?,?,?,?)').bind(w.uid, day(), c, id).run();
      }
    }
    const u2 = await db.prepare('SELECT COUNT(*) n FROM nv_coin WHERE uid=? AND day=?').bind(w.uid, day()).first();
    return J({ ok: true, left: w.owner ? 999 : Math.max(0, max - ((u2 && u2.n) || 0)), max, src: `/api/novinhas/enhance?s=1&c=${c}&v=${id}` });
  }
  if (!w.owner) return J({ error: 'forbidden' }, 403);
  await db.prepare('INSERT OR IGNORE INTO nv_enh (slug, vid, title, added) VALUES (?,?,?,?)').bind(c, id, String(b.title || '').slice(0, 200), Date.now()).run();
  await mirror(env);
  return J({ ok: true });
}
