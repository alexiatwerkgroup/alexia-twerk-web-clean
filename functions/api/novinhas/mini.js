// Miniclips: clips de 30 s con el boton REC del reproductor. Cuentas normales: 10/dia y 100 en total, sin camara lenta (solo VIP) y sin borrar; el dueño sin limites.
//  POST /api/novinhas/mini {c,id,t,slow}                -> (cuenta) marca un miniclip; la cola se refleja en R2 _config/mini-queue.json
//  POST /api/novinhas/mini {action:'remove',c,id,start,slow} -> (dueño) borra un miniclip (fila + archivos)
//  GET  /api/novinhas/mini?me=1                         -> {owner,user,vip,left}
//  GET  /api/novinhas/mini?c=<slug>&n=6                 -> miniclips listos del canal y, si faltan, de otros canales
//  GET  /api/novinhas/mini?s=1&k=<clave>                -> mp4 (con Range)   ·   &p=1 -> poster webp
// Archivos en R2: <slug>/mini/m-<video>-<inicio>-<n|s>.mp4 (+ .webp). Los corta y sube mini.py desde la PC del dueño (la cola esta en _config/mini-queue.json).
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { isVip } from '../../_lib/vip.js';
const DAY_MAX = 10, TOTAL_MAX = 100; // cuentas normales: 10 miniclips por dia y 100 en total (el dueño no tiene tope)
const SLUG = /^[a-z0-9-]{2,60}$/, KEY = /^([a-z0-9-]{2,60})\/mini\/m-(\d+)-(\d+)-([ns])\.(mp4|webp)$/, SECS = 30;
const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
// Usuario con cuenta: {id, owner}. Sin sesion -> null.
async function who(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return null;
    const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); if (!u) return null;
    return { id: String(p.sub), owner: String(u.email).toLowerCase() === OWNER };
  } catch (e) { return null; }
}
async function quota(db, uid, now) {
  const d = await db.prepare('SELECT COUNT(*) n FROM nv_mini WHERE uid = ? AND added >= ?').bind(uid, now - 86400).first();
  const t = await db.prepare('SELECT COUNT(*) n FROM nv_mini WHERE uid = ?').bind(uid).first();
  return { today: Math.max(0, DAY_MAX - ((d && d.n) || 0)), total: Math.max(0, TOTAL_MAX - ((t && t.n) || 0)) };
}
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_mini (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, vid INTEGER, start INTEGER, slow INTEGER DEFAULT 0, title TEXT, name TEXT, added INTEGER, UNIQUE(slug, vid, start, slow))').run();
  try { await db.prepare('ALTER TABLE nv_mini ADD COLUMN uid TEXT').run(); } catch (e) {}
}
const base = (slug, vid, st, slow) => `${slug}/mini/m-${vid}-${st}-${slow ? 's' : 'n'}`;
async function mirror(env, db) {
  const r = (await db.prepare('SELECT slug, vid, start, slow FROM nv_mini ORDER BY id').all()).results || [];
  await env.NOVINHAS_VIDEOS.put('_config/mini-queue.json', JSON.stringify({ updated: Date.now(), secs: SECS, items: r.map((x) => ({ c: x.slug, id: x.vid, start: x.start || 0, slow: x.slow ? 1 : 0 })) }), { httpMetadata: { contentType: 'application/json' } });
  return r.length;
}
// Miniclips LISTOS de un canal (el mp4 existe en R2): [{c,id,start,slow,mp4,poster}]
async function readyOf(env, slug) {
  const l = await env.NOVINHAS_VIDEOS.list({ prefix: slug + '/mini/m-', limit: 200 }), have = {};
  (l.objects || []).forEach((o) => { have[o.key] = +new Date(o.uploaded || 0); });
  const out = [];
  for (const k of Object.keys(have)) {
    const m = KEY.exec(k); if (!m || m[5] !== 'mp4') continue;
    const pk = k.replace(/\.mp4$/, '.webp');
    out.push({ c: m[1], id: +m[2], start: +m[3], slow: m[4] === 's' ? 1 : 0, up: have[k], key: k, poster: have[pk] ? pk : '' });
  }
  return out;
}
export async function onRequest({ request, env }) {
  if (!env.NOVINHAS_VIDEOS || !env.DB) return J({ error: 'not_configured' }, 500);
  const url = new URL(request.url), q = url.searchParams, db = env.DB, now = Math.floor(Date.now() / 1000);
  if (request.method === 'POST') {
    const me = await who(request, env); if (!me) return J({ ok: false, error: 'login' }, 401);
    let b = {}; try { b = await request.json(); } catch (e) {}
    if (b.action === 'remove' && !me.owner) return J({ ok: false, error: 'owner_only' }, 403);
    const id = parseInt(b.id, 10);
    if (!SLUG.test(b.c || '') || !(id > 0)) return J({ error: 'bad_request' }, 400);
    await ensure(db);
    if (b.action === 'remove') {
      const st = Math.max(0, parseInt(b.start, 10) || 0), sl = b.slow ? 1 : 0, bk = base(b.c, id, st, sl);
      await db.prepare('DELETE FROM nv_mini WHERE slug = ? AND vid = ? AND start = ? AND slow = ?').bind(b.c, id, st, sl).run();
      try { await env.NOVINHAS_VIDEOS.delete([bk + '.mp4', bk + '.webp']); } catch (e) {}
      try { await mirror(env, db); } catch (e) {}
      return J({ ok: true });
    }
    const vj = await env.NOVINHAS_VIDEOS.get(b.c + '/_videos.json'); if (!vj) return J({ error: 'not_found' }, 404);
    const d = await vj.json(), v = (d.videos || []).filter((x) => x.id === id)[0]; if (!v) return J({ error: 'no_such_video' }, 404);
    const slow = b.slow ? 1 : 0;
    if (slow && !me.owner && !(await isVip(request, env))) return J({ ok: false, error: 'vip_only_slow' }, 403);
    if (!me.owner) { const ql = await quota(db, me.id, now); if (ql.today <= 0) return J({ ok: false, error: 'daily_limit', max: DAY_MAX }, 429); if (ql.total <= 0) return J({ ok: false, error: 'total_limit', max: TOTAL_MAX }, 429); }
    const src = slow ? SECS / 2 : SECS; // en camara lenta (0.5x) 15 s de video original ocupan 30 s
    const t = Math.max(0, Math.min(Math.floor(Number(b.t) || 0), Math.max(0, Math.floor((Number(v.duration) || 0) - src))));
    await db.prepare('INSERT OR IGNORE INTO nv_mini (slug, vid, start, slow, title, name, added, uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(b.c, id, t, slow, v.title || '', d.name || b.c, now, me.id).run();
    const n = await mirror(env, db);
    return J({ ok: true, start: t, slow, secs: SECS, total: n });
  }
  if (q.get('me')) {
    const me = await who(request, env); if (!me) return J({ owner: false, user: false });
    if (me.owner) return J({ owner: true, user: true, vip: true });
    await ensure(db); const ql = await quota(db, me.id, now);
    return J({ owner: false, user: true, vip: await isVip(request, env), left: Math.min(ql.today, ql.total), day: DAY_MAX, total: TOTAL_MAX });
  }
  if (q.get('s')) {
    const key = q.get('k') || '', m = KEY.exec(key);
    if (!m) return new Response('bad_request', { status: 400 });
    const isP = m[5] === 'webp';
    const ch = await env.NOVINHAS_VIDEOS.head(key); if (!ch) return new Response('not_found', { status: 404 });
    if (isP) { const o = await env.NOVINHAS_VIDEOS.get(key); return new Response(o.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' } }); }
    const mm = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || ''), tot = ch.size; let a0 = 0, b0 = tot - 1, sc = 200;
    const hh = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' });
    if (mm) { if (mm[1] === '') a0 = Math.max(0, tot - parseInt(mm[2], 10)); else { a0 = parseInt(mm[1], 10); if (mm[2]) b0 = Math.min(parseInt(mm[2], 10), tot - 1); } if (!(a0 <= b0) || a0 >= tot) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + tot } }); sc = 206; hh.set('Content-Range', `bytes ${a0}-${b0}/${tot}`); }
    hh.set('Content-Length', String(b0 - a0 + 1));
    const co = await env.NOVINHAS_VIDEOS.get(key, { range: { offset: a0, length: b0 - a0 + 1 } });
    return new Response(co.body, { status: sc, headers: hh });
  }
  // Lista para el panel del reproductor: primero los del canal (mas nuevos primero), despues de otros canales al azar.
  const slug = q.get('c') || '', N = Math.min(12, Math.max(1, parseInt(q.get('n'), 10) || 6));
  if (slug && !SLUG.test(slug)) return J({ error: 'bad_request' }, 400);
  await ensure(db);
  const names = {}; try { ((await db.prepare('SELECT slug, name FROM nv_mini').all()).results || []).forEach((r) => { names[r.slug] = r.name; }); } catch (e) {}
  const items = [], seen = {};
  const push = (r) => { const k = r.key; if (seen[k] || items.length >= N) return; seen[k] = 1; items.push(r); };
  if (slug) (await readyOf(env, slug)).sort((a, b) => b.up - a.up).forEach(push);
  if (items.length < N) {
    let chans = []; try { const r = await env.ASSETS.fetch(new URL('/novinhas/channels-live.json', request.url)); chans = (await r.json()).filter((c) => SLUG.test(c.slug) && c.slug !== slug); } catch (e) {}
    chans.sort(() => Math.random() - 0.5);
    for (const c of chans.slice(0, 10)) { if (items.length >= N) break; try { const rs = await readyOf(env, c.slug); rs.forEach((r) => { names[c.slug] = names[c.slug] || c.name; }); rs.sort(() => Math.random() - 0.5).slice(0, 2).forEach(push); } catch (e) {} }
  }
  return J({ items: items.map((r) => ({ c: r.c, id: r.id, start: r.start, slow: r.slow, name: String(names[r.c] || r.c).replace(/^@/, ''), src: `/api/novinhas/mini?s=1&k=${encodeURIComponent(r.key)}`, poster: r.poster ? `/api/novinhas/mini?s=1&k=${encodeURIComponent(r.poster)}` : '', url: `/novinhas/canal/ver/?c=${r.c}&v=${String(r.id).padStart(2, '0')}` })) }, 200, 'public, max-age=60');
}
