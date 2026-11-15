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
// Previews de tarjeta de canal fijados por el dueño (slug -> id de video). Siempre mudos (los clips se reproducen con muted).
const FIXED_THUMBS = { 'canal-da-maryh': 45 }; // unico fijo (orden del dueño 15 nov 2026); el resto rota al azar entre los elegidos
const ROW_BAD = {}; // videos fuera de la fila "Never forgotten": 'slug:id' (orden del dueño 15 nov 2026)
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
  try { await db.prepare('ALTER TABLE nv_feat ADD COLUMN auto INTEGER DEFAULT 0').run(); } catch (e) {}
  try { await db.prepare('ALTER TABLE nv_feat ADD COLUMN start INTEGER DEFAULT 0').run(); } catch (e) {}
  try { await db.prepare('ALTER TABLE nv_feat ADD COLUMN slow INTEGER DEFAULT 0').run(); } catch (e) {}
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_feat_state (k TEXT PRIMARY KEY, v INTEGER)').run();
  await db.prepare("INSERT OR IGNORE INTO nv_feat_state (k, v) VALUES ('cur', 0), ('since', 0)").run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_presence (slug TEXT, dev TEXT, ts INTEGER, PRIMARY KEY (slug, dev))').run();
}
const getS = async (db, k) => { const r = await db.prepare('SELECT v FROM nv_feat_state WHERE k = ?').bind(k).first(); return r ? r.v : 0; };
const setS = (db, k, v) => db.prepare('INSERT OR REPLACE INTO nv_feat_state (k, v) VALUES (?, ?)').bind(k, v).run();
// Devuelve el destacado vigente; si ya cumplio su hora, pasa al siguiente de la cola o, sin cola, a uno al azar de los guardados.
// Sin cola: cualquier video de cualquier canal en vivo, desde un segundo al azar (se guarda como 'auto' y reemplaza al auto anterior).
async function randomAny(env, request, db, now, cur) {
  let chans = [];
  try { const r = await env.ASSETS.fetch(new URL('/novinhas/channels-live.json', request.url)); chans = (await r.json()).map((c) => c.slug).filter((x) => SLUG.test(x)); } catch (e) {}
  for (let i = 0; i < 8 && chans.length; i++) {
    const slug = chans[Math.floor(Math.random() * chans.length)];
    try {
      const l = await env.NOVINHAS_VIDEOS.list({ prefix: slug + '/clips/c-', limit: 200 }), ks = (l.objects || []).map((o) => /c-(\d+)-(\d+)\.mp4$/.exec(o.key)).filter(Boolean);
      if (ks.length) {
        const m = ks[Math.floor(Math.random() * ks.length)], pv = parseInt(m[1], 10), ps = parseInt(m[2], 10);
        if (!(cur && cur.slug === slug && cur.vid === pv)) {
          const po = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'), pd = po ? await po.json() : { videos: [] }, pvv = (pd.videos || []).filter((x) => x.id === pv)[0];
          if (pvv) {
            await db.prepare('DELETE FROM nv_feat WHERE auto = 1 AND id != ?').bind(cur ? cur.id : 0).run();
            await db.prepare('INSERT OR REPLACE INTO nv_feat (slug, vid, title, name, queued, added, start, auto) VALUES (?, ?, ?, ?, 0, ?, ?, 1)').bind(slug, pv, pvv.title || '', pd.name || slug, now, ps).run();
            return await db.prepare('SELECT * FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, pv).first();
          }
        }
      }
    } catch (e) {}
    const o = await env.NOVINHAS_VIDEOS.get(slug + '/_videos.json'); if (!o) continue;
    const d = await o.json(), vs = d.videos || []; if (!vs.length) continue;
    const v = vs[Math.floor(Math.random() * vs.length)], dur = Number(v.duration) || 0;
    if (cur && cur.slug === slug && cur.vid === v.id) continue;
    const st = dur > SECS + 4 ? Math.floor(Math.random() * (dur - SECS - 3)) : 0;
    await db.prepare('DELETE FROM nv_feat WHERE auto = 1 AND id != ?').bind(cur ? cur.id : 0).run();
    await db.prepare('INSERT OR REPLACE INTO nv_feat (slug, vid, title, name, queued, added, start, auto) VALUES (?, ?, ?, ?, 0, ?, ?, 1)').bind(slug, v.id, v.title || '', d.name || slug, now, st).run();
    return await db.prepare('SELECT * FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, v.id).first();
  }
  return null;
}
async function current(env, request, db, now) {
  let cur = await getS(db, 'cur'), since = await getS(db, 'since');
  let row = cur ? await db.prepare('SELECT * FROM nv_feat WHERE id = ?').bind(cur).first() : null;
  if (row && now - since < HOLD) return { row, since };
  let next = await db.prepare('SELECT * FROM nv_feat WHERE queued = 1 ORDER BY added, id LIMIT 1').first();
  if (!next) next = await randomAny(env, request, db, now, row);
  if (!next) return row ? { row, since: now } : null;
  const claim = await db.prepare("UPDATE nv_feat_state SET v = ? WHERE k = 'since' AND v = ?").bind(now, since).run();
  if (!claim.meta || claim.meta.changes !== 1) { cur = await getS(db, 'cur'); since = await getS(db, 'since'); row = cur ? await db.prepare('SELECT * FROM nv_feat WHERE id = ?').bind(cur).first() : null; return row ? { row, since } : null; }
  await setS(db, 'cur', next.id);
  await db.prepare('UPDATE nv_feat SET queued = 0, shown = shown + 1, last = ? WHERE id = ?').bind(now, next.id).run();
  return { row: next, since: now };
}
const pad = (n) => String(n).padStart(2, '0');
const clipKey = (slug, vid, st) => `${slug}/clips/c-${vid}-${st}.mp4`;
async function mirrorClips(env, db) {
  const r = await db.prepare('SELECT slug, vid, start, slow FROM nv_feat').all();
  await env.NOVINHAS_VIDEOS.put('_config/feat-clips.json', JSON.stringify({ updated: Date.now(), items: (r.results || []).map((x) => ({ c: x.slug, id: x.vid, start: x.start || 0, slow: x.slow ? 1 : 0 })) }), { httpMetadata: { contentType: 'application/json' } });
}
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
    if (b.action === 'thumbpin') { if (!SLUG.test(b.c || '')) return J({ error: 'bad_request' }, 400); await setS(db, 'thumbpin:' + b.c, +b.item || 0); return J({ ok: true }); }
    if (b.action === 'requeue') { await db.prepare('UPDATE nv_feat SET queued = 1, added = ? WHERE id = ?').bind(now, +b.item || 0).run(); return J({ ok: true }); }
    if (b.action === 'now') { const it = +b.item || 0; await setS(db, 'cur', it); await setS(db, 'since', now); await db.prepare('UPDATE nv_feat SET queued = 0, shown = shown + 1, last = ? WHERE id = ?').bind(now, it).run(); return J({ ok: true }); }
    const id = parseInt(b.id, 10);
    if (!SLUG.test(b.c || '') || !(id > 0)) return J({ error: 'bad_request' }, 400);
    const vj = await env.NOVINHAS_VIDEOS.get(b.c + '/_videos.json'); if (!vj) return J({ error: 'not_found' }, 404);
    const d = await vj.json(), v = (d.videos || []).filter((x) => x.id === id)[0]; if (!v) return J({ error: 'no_such_video' }, 404);
    const t = Math.max(0, Math.min(Math.floor(Number(b.t) || 0), Math.max(0, Math.floor((Number(v.duration) || 0) - SECS))));
    await db.prepare('INSERT OR IGNORE INTO nv_feat (slug, vid, title, name, queued, added, start) VALUES (?, ?, ?, ?, 1, ?, ?)').bind(b.c, id, v.title || '', d.name || b.c, now, t).run();
    try { await mirrorClips(env, db); } catch (e) {}
    await db.prepare('UPDATE nv_feat SET start = ?, slow = ? WHERE slug = ? AND vid = ?').bind(t, b.slow ? 1 : 0, b.c, id).run();
    try { await mirrorClips(env, db); } catch (e) {}
    await db.prepare('UPDATE nv_feat SET queued = 1, added = ? WHERE slug = ? AND vid = ? AND id != ? AND queued = 0').bind(now, b.c, id, (await getS(db, 'cur')) || 0).run();
    const n = await db.prepare('SELECT COUNT(*) c FROM nv_feat WHERE queued = 1').first();
    return J({ ok: true, queued: n ? n.c : 0 });
  }
  if (q.get('me')) return J({ owner: await isOwner(request, env) });
  if (q.get('cs')) {
    const slug = q.get('c') || '', vid = parseInt(q.get('v'), 10), st = parseInt(q.get('t'), 10);
    if (!SLUG.test(slug) || !(vid > 0) || !(st >= 0)) return new Response('bad_request', { status: 400 });
    const key = clipKey(slug, vid, st), ch = await env.NOVINHAS_VIDEOS.head(key); if (!ch) return new Response('not_found', { status: 404 });
    const mm = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || ''), tot = ch.size; let a0 = 0, b0 = tot - 1, sc = 200;
    const hh = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' });
    if (mm) { if (mm[1] === '') a0 = Math.max(0, tot - parseInt(mm[2], 10)); else { a0 = parseInt(mm[1], 10); if (mm[2]) b0 = Math.min(parseInt(mm[2], 10), tot - 1); } if (!(a0 <= b0) || a0 >= tot) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + tot } }); sc = 206; hh.set('Content-Range', `bytes ${a0}-${b0}/${tot}`); }
    hh.set('Content-Length', String(b0 - a0 + 1));
    const co = await env.NOVINHAS_VIDEOS.get(key, { range: { offset: a0, length: b0 - a0 + 1 } });
    return new Response(co.body, { status: sc, headers: hh });
  }
  if (q.get('thumbs')) {
    const rows = (await db.prepare('SELECT id, slug, vid, start FROM nv_feat ORDER BY added, id').all()).results || [], by = {};
    rows.forEach((r) => { (by[r.slug] = by[r.slug] || []).push(r); });
    const day = Math.floor(now / 3600), out = {}; // rota entre los elegidos del canal: 1 hora minimo cada uno
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };
    for (const slug of Object.keys(by)) {
      if (!SLUG.test(slug)) continue;
      const l = await env.NOVINHAS_VIDEOS.list({ prefix: slug + '/clips/c-', limit: 500 }), have = {};
      (l.objects || []).forEach((o) => { const m = /c-(\d+)-(\d+)\.mp4$/.exec(o.key); if (m) have[m[1]] = m[2]; });
      // Preview fijo (orden del dueño 14 nov 2026): no rota ni lo pisa 'thumbpin'. Solo se cambia si el dueño lo pide.
      const fx = FIXED_THUMBS[slug]; if (fx && have[fx] != null) { out[slug] = { id: fx, src: `/api/novinhas/featured?cs=1&c=${slug}&v=${fx}&t=${have[fx]}` }; continue; }
      const ok = by[slug].filter((r) => have[r.vid] != null);
      if (!ok.length) continue;
      // Pin por canal: 'thumbpin:<slug>' (id de nv_feat) fija ese preview hasta que el dueño lo cambie
      let r = null; const pin = await getS(db, 'thumbpin:' + slug);
      if (pin) r = ok.filter((x) => x.id === pin)[0] || null;
      if (!r) r = ok[hash(slug + ':' + day) % ok.length];
      out[slug] = { id: r.vid, src: `/api/novinhas/featured?cs=1&c=${slug}&v=${r.vid}&t=${have[r.vid]}` };
    }
    return J({ day, thumbs: out }, 200, 'public, max-age=300');
  }
  if (q.get('row')) {
    const N = Math.min(20, Math.max(1, parseInt(q.get('row'), 10) || 8)); let chans = [];
    try { const r = await env.ASSETS.fetch(new URL('/novinhas/channels-live.json', request.url)); chans = (await r.json()).filter((c) => SLUG.test(c.slug)); } catch (e) {}
    const tot = {}; chans.forEach((c) => { tot[c.slug] = c.total || 0; });
    const all = (await db.prepare('SELECT id, slug, vid, name, start FROM nv_feat ORDER BY added, id').all()).results || [];
    const items = [], used = {};
    // Fijo unico: Maryh (45) primero. El resto: azar entre TODOS los canales (un clip por canal, semilla nueva en cada carga: sale distinto cada vez)
    let sd = (Math.floor(Math.random() * 4294967296) ^ now) >>> 0; const rn = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
    const clipsOf = async (slug) => { const l = await env.NOVINHAS_VIDEOS.list({ prefix: slug + '/clips/c-', limit: 500 }), h = {}; (l.objects || []).forEach((o) => { const m = /c-(\d+)-(\d+)\.mp4$/.exec(o.key); if (m && !ROW_BAD[slug + ':' + m[1]]) h[m[1]] = parseInt(m[2], 10); }); return h; };
    const fixSlug = 'canal-da-maryh', fixId = FIXED_THUMBS[fixSlug];
    { const h = await clipsOf(fixSlug); if (fixId && h[fixId] != null && fixSlug in tot) { const r = all.filter((x) => x.slug === fixSlug && x.vid === fixId)[0]; items.push({ slug: fixSlug, name: (r && r.name) || fixSlug, total: tot[fixSlug], id: fixId, start: h[fixId] }); used[fixSlug] = 1; } }
    const marked = {}; all.forEach((x) => { marked[x.slug] = 1; });
    const rest = chans.filter((c) => !used[c.slug]).map((c) => ({ c, k: rn() })).sort((x, y) => x.k - y.k).map((x) => x.c);
    for (const c of rest) {
      if (items.length >= N) break;
      const h = await clipsOf(c.slug), ks = Object.keys(h); if (!ks.length) continue;
      const mine = all.filter((x) => x.slug === c.slug && h[x.vid] != null), pool = mine.length ? mine.map((x) => String(x.vid)) : ks, v = pool[Math.floor(rn() * pool.length)];
      const nm = (all.filter((x) => x.slug === c.slug)[0] || {}).name;
      items.push({ slug: c.slug, name: nm || c.name || c.slug, total: tot[c.slug] || c.total || 0, id: parseInt(v, 10), start: h[v] }); used[c.slug] = 1;
    }
    // relleno temporal: completa hasta N con clips al azar de otros canales (se achica solo a medida que elegis mas)
    if (items.length < N) {
      const taken = {}; items.forEach((x) => { taken[x.slug] = 1; });
      const rnd = chans.filter((c) => !taken[c.slug]).sort(() => Math.random() - 0.5);
      for (const c of rnd) {
        if (items.length >= N) break;
        const l = await env.NOVINHAS_VIDEOS.list({ prefix: c.slug + '/clips/c-', limit: 200 });
        const ks = (l.objects || []).map((o) => /c-(\d+)-(\d+)\.mp4$/.exec(o.key)).filter((m) => m && !ROW_BAD[c.slug + ':' + m[1]]);
        if (!ks.length) continue; const m = ks[Math.floor(Math.random() * ks.length)];
        items.push({ slug: c.slug, name: c.name || c.slug, total: c.total || 0, id: parseInt(m[1], 10), start: parseInt(m[2], 10) });
      }
    }
    const slugs = Array.from(new Set(items.map((x) => x.slug)));
    let viewers = 0;
    if (slugs.length) { const ph = slugs.map(() => '?').join(','); const v = await db.prepare(`SELECT COUNT(DISTINCT dev) c FROM nv_presence WHERE ts > ? AND slug IN (${ph})`).bind(now - 600, ...slugs).first(); viewers = v ? v.c : 0; }
    const cleanName = (n) => String(n || '').replace(/[\s_.-]*\d{4}[_-]\d{1,2}[_-]\d{1,2}([_-]\d{1,2}){2,3}.*$/, '');
    return J({ viewers, items: items.map((x, i) => ({ first: i === 0, slug: x.slug, name: cleanName(x.name), total: x.total, id: x.id, src: `/api/novinhas/featured?cs=1&c=${x.slug}&v=${x.id}&t=${x.start}`, poster: `/api/novinhas/file?k=${x.slug}/previews/poster-${pad(x.id)}.webp`, url: `/novinhas/canal/?c=${x.slug}` })) }, 200, 'no-store');
  }
  if (q.get('list')) {
    if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
    const cur = await current(env, request, db, now), all = (await db.prepare('SELECT * FROM nv_feat ORDER BY queued DESC, added, id').all()).results || [];
    return J({ ok: true, now, hold: HOLD, current: cur ? { id: cur.row.id, since: cur.since } : null, items: all });
  }
  if (q.get('s')) {
    const slug = q.get('c') || '', vid = parseInt(q.get('v'), 10);
    if (!SLUG.test(slug) || !(vid > 0)) return new Response('bad_request', { status: 400 });
    if (!(await db.prepare('SELECT id FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, vid).first())) return new Response('not_found', { status: 404 });
    const st0 = (await db.prepare('SELECT start FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, vid).first() || {}).start || 0, ck = clipKey(slug, vid, st0);
    const ch = await env.NOVINHAS_VIDEOS.head(ck);
    if (ch) {
      const mm = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || ''), tot = ch.size; let a0 = 0, b0 = tot - 1, sc = 200;
      const hh = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' });
      if (mm) { if (mm[1] === '') a0 = Math.max(0, tot - parseInt(mm[2], 10)); else { a0 = parseInt(mm[1], 10); if (mm[2]) b0 = Math.min(parseInt(mm[2], 10), tot - 1); } if (!(a0 <= b0) || a0 >= tot) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + tot } }); sc = 206; hh.set('Content-Range', `bytes ${a0}-${b0}/${tot}`); }
      hh.set('Content-Length', String(b0 - a0 + 1));
      const co = await env.NOVINHAS_VIDEOS.get(ck, { range: { offset: a0, length: b0 - a0 + 1 } });
      return new Response(co.body, { status: sc, headers: hh });
    }
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
  const cur = await current(env, request, db, now); if (!cur) return J({ none: true }, 200, 'public, max-age=30');
  const r = cur.row, n = (await db.prepare('SELECT COUNT(DISTINCT dev) c FROM nv_presence WHERE slug = ? AND ts > ?').bind(r.slug, now - 600).first());
  const hasClip = !!(await env.NOVINHAS_VIDEOS.head(clipKey(r.slug, r.vid, r.start || 0)));
  return J({ slug: r.slug, name: r.name, id: r.vid, title: r.title, viewers: n ? n.c : 0, left: Math.max(0, HOLD - (now - cur.since)), start: hasClip ? 0 : (r.start || 0), clip: hasClip, secs: SECS,
    src: `/api/novinhas/featured?s=1&c=${r.slug}&v=${r.vid}`, poster: `/api/novinhas/file?k=${r.slug}/previews/poster-${pad(r.vid)}.webp`,
    url: `/novinhas/canal/ver/?c=${r.slug}&v=${pad(r.vid)}` }, 200, 'public, max-age=20');
}
