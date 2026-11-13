// Preview destacado de la home (reemplaza el boton "Enter the Vault"): cola + rotacion al azar. Todo en D1.
//  GET  /api/novinhas/featured                -> destacado actual {slug,name,id,title,src,poster,url,viewers,left}
//  GET  /api/novinhas/featured?s=1&c=&v=      -> primeros ~20 s del video (solo si esta en la tabla; el resto sigue protegido)
//  GET  /api/novinhas/featured?me=1           -> {owner}
//  GET  /api/novinhas/featured?list=1         -> (dueño) actual, cola y biblioteca
//  POST /api/novinhas/featured {c,id}         -> (dueño) agrega a la cola
//  POST /api/novinhas/featured {action:'next'|'remove'|'now'|'requeue', item}  -> (dueño)
//  POST /api/novinhas/featured?hb=<slug> {d}  -> latido de presencia (cuantos estan viendo el canal)
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const HOLD = 3600, SECS = 20, SLUG = /^[a-z0-9-]{2,60}$/;
const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
async function isOwner(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return false;
    const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
    return !!u && String(u.email).toLowerCase() === OWNER;
  } catch (e) { return false; }
}
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_feat (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, vid INTEGER, title TEXT, name TEXT, queued INTEGER DEFAULT 1, added INTEGER, shown INTEGER DEFAULT 0, last INTEGER DEFAULT 0, UNIQUE(slug, vid))').run();
  try { await db.prepare('ALTER TABLE nv_feat ADD COLUMN start INTEGER DEFAULT 0').run(); } catch (e) {}
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_feat_state (k TEXT PRIMARY KEY, v INTEGER)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_presence (slug TEXT, dev TEXT, ts INTEGER, PRIMARY KEY (slug, dev))').run();
}
const getS = async (db, k) => { const r = await db.prepare('SELECT v FROM nv_feat_state WHERE k = ?').bind(k).first(); return r ? r.v : 0; };
const setS = (db, k, v) => db.prepare('INSERT OR REPLACE INTO nv_feat_state (k, v) VALUES (?, ?)').bind(k, v).run();
// Devuelve el destacado vigente; si ya cumplio su hora, pasa al siguiente de la cola o, sin cola, a uno al azar de los guardados.
async function current(db, now) {
  let cur = await getS(db, 'cur'), since = await getS(db, 'since');
  let row = cur ? await db.prepare('SELECT * FROM nv_feat WHERE id = ?').bind(cur).first() : null;
  if (row && now - since < HOLD) return { row, since };
  let next = await db.prepare('SELECT * FROM nv_feat WHERE queued = 1 ORDER BY added, id LIMIT 1').first();
  if (!next) next = await db.prepare('SELECT * FROM nv_feat WHERE id != ? ORDER BY RANDOM() LIMIT 1').bind(cur || 0).first();
  if (!next) return row ? { row, since: now } : null;
  const claim = await db.prepare("UPDATE nv_feat_state SET v = ? WHERE k = 'since' AND v = ?").bind(now, since).run();
  if (!claim.meta || claim.meta.changes !== 1) { cur = await getS(db, 'cur'); since = await getS(db, 'since'); row = cur ? await db.prepare('SELECT * FROM nv_feat WHERE id = ?').bind(cur).first() : null; return row ? { row, since } : null; }
  await setS(db, 'cur', next.id);
  await db.prepare('UPDATE nv_feat SET queued = 0, shown = shown + 1, last = ? WHERE id = ?').bind(now, next.id).run();
  return { row: next, since: now };
}
const pad = (n) => String(n).padStart(2, '0');
export async function onRequest({ request, env }) {
  if (!env.NOVINHAS_VIDEOS || !env.DB) return J({ error: 'not_configured' }, 500);
  const url = new URL(request.url), q = url.searchParams, now = Math.floor(Date.now() / 1000), db = env.DB;
  await ensure(db);
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    if (q.get('hb')) {
      const slug = q.get('hb'), dev = String(b.d || '').slice(0, 40);
      if (!SLUG.test(slug) || !dev) return J({ error: 'bad_request' }, 400);
      await db.prepare('INSERT OR REPLACE INTO nv_presence (slug, dev, ts) VALUES (?, ?, ?)').bind(slug, dev, now).run();
      if (Math.random() < 0.05) await db.prepare('DELETE FROM nv_presence WHERE ts < ?').bind(now - 3600).run();
      return J({ ok: true });
    }
    if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
    if (b.action === 'next') { await setS(db, 'since', 0); return J({ ok: true }); }
    if (b.action === 'remove') { await db.prepare('DELETE FROM nv_feat WHERE id = ?').bind(+b.item || 0).run(); return J({ ok: true }); }
    if (b.action === 'requeue') { await db.prepare('UPDATE nv_feat SET queued = 1, added = ? WHERE id = ?').bind(now, +b.item || 0).run(); return J({ ok: true }); }
    if (b.action === 'now') { const it = +b.item || 0; await setS(db, 'cur', it); await setS(db, 'since', now); await db.prepare('UPDATE nv_feat SET queued = 0, shown = shown + 1, last = ? WHERE id = ?').bind(now, it).run(); return J({ ok: true }); }
    const id = parseInt(b.id, 10);
    if (!SLUG.test(b.c || '') || !(id > 0)) return J({ error: 'bad_request' }, 400);
    const vj = await env.NOVINHAS_VIDEOS.get(b.c + '/_videos.json'); if (!vj) return J({ error: 'not_found' }, 404);
    const d = await vj.json(), v = (d.videos || []).filter((x) => x.id === id)[0]; if (!v) return J({ error: 'no_such_video' }, 404);
    const t = Math.max(0, Math.min(Math.floor(Number(b.t) || 0), Math.max(0, Math.floor((Number(v.duration) || 0) - SECS))));
    await db.prepare('INSERT OR IGNORE INTO nv_feat (slug, vid, title, name, queued, added, start) VALUES (?, ?, ?, ?, 1, ?, ?)').bind(b.c, id, v.title || '', d.name || b.c, now, t).run();
    await db.prepare('UPDATE nv_feat SET start = ? WHERE slug = ? AND vid = ?').bind(t, b.c, id).run();
    await db.prepare('UPDATE nv_feat SET queued = 1, added = ? WHERE slug = ? AND vid = ? AND id != ? AND queued = 0').bind(now, b.c, id, (await getS(db, 'cur')) || 0).run();
    const n = await db.prepare('SELECT COUNT(*) c FROM nv_feat WHERE queued = 1').first();
    return J({ ok: true, queued: n ? n.c : 0 });
  }
  if (q.get('me')) return J({ owner: await isOwner(request, env) });
  if (q.get('list')) {
    if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
    const cur = await current(db, now), all = (await db.prepare('SELECT * FROM nv_feat ORDER BY queued DESC, added, id').all()).results || [];
    return J({ ok: true, now, hold: HOLD, current: cur ? { id: cur.row.id, since: cur.since } : null, items: all });
  }
  if (q.get('s')) {
    const slug = q.get('c') || '', vid = parseInt(q.get('v'), 10);
    if (!SLUG.test(slug) || !(vid > 0)) return new Response('bad_request', { status: 400 });
    if (!(await db.prepare('SELECT id FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, vid).first())) return new Response('not_found', { status: 404 });
    let key = `${slug}/480h/video-${pad(vid)}.mp4`, head = await env.NOVINHAS_VIDEOS.head(key);
    if (!head) { key = `${slug}/full/video-${pad(vid)}.mp4`; head = await env.NOVINHAS_VIDEOS.head(key); }
    if (!head) return new Response('not_found', { status: 404 });
    const vj = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'); const d = vj ? await vj.json() : { videos: [] };
    const dur = Number(((d.videos || []).filter((x) => x.id === vid)[0] || {}).duration) || 0;
    const st = (await db.prepare('SELECT start FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, vid).first() || {}).start || 0, upto = st + SECS + 2;
    const total = dur > upto ? Math.min(head.size, Math.ceil(head.size * (upto / dur) * 1.15)) : head.size;
    const h = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' });
    const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
    let start = 0, end = total - 1, status = 200;
    if (m) {
      if (m[1] === '') start = Math.max(0, total - parseInt(m[2], 10)); else { start = parseInt(m[1], 10); if (m[2]) end = Math.min(parseInt(m[2], 10), total - 1); }
      if (!(start <= end) || start >= total) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
      status = 206; h.set('Content-Range', `bytes ${start}-${end}/${total}`);
    }
    h.set('Content-Length', String(end - start + 1));
    const obj = await env.NOVINHAS_VIDEOS.get(key, { range: { offset: start, length: end - start + 1 } });
    return new Response(obj.body, { status, headers: h });
  }
  const cur = await current(db, now); if (!cur) return J({ none: true }, 200, 'public, max-age=30');
  const r = cur.row, n = (await db.prepare('SELECT COUNT(DISTINCT dev) c FROM nv_presence WHERE slug = ? AND ts > ?').bind(r.slug, now - 600).first());
  return J({ slug: r.slug, name: r.name, id: r.vid, title: r.title, viewers: n ? n.c : 0, left: Math.max(0, HOLD - (now - cur.since)), start: r.start || 0, secs: SECS,
    src: `/api/novinhas/featured?s=1&c=${r.slug}&v=${r.vid}`, poster: `/api/novinhas/file?k=${r.slug}/previews/poster-${pad(r.vid)}.webp`,
    url: `/novinhas/canal/ver/?c=${r.slug}&v=${pad(r.vid)}` }, 200, 'public, max-age=20');
}
