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
import { clipAccessMap, clipCanView } from '../../_lib/novinhas-clip-access.js';
import { isVip } from '../../_lib/vip.js';
// Previews de tarjeta de canal fijados por el dueño (slug -> id de video). Siempre mudos (los clips se reproducen con muted).
const FIXED_THUMBS = { 'canal-da-maryh': 45 }; // unico fijo (orden del dueño 15 nov 2026); el resto rota al azar entre los elegidos
const ROW_BAD = {}; // videos fuera de la fila "Never forgotten": 'slug:id' (orden del dueño 15 nov 2026)
const HOLD = 3600, SECS = 20, SLUG = /^[a-z0-9-]{2,60}$/;
const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
async function ensureThumbPins(db, now) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_thumb_pins (slug TEXT NOT NULL, vid INTEGER NOT NULL, pinned_at INTEGER NOT NULL, PRIMARY KEY (slug, vid))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_thumb_hidden (slug TEXT NOT NULL, vid INTEGER NOT NULL, hidden_at INTEGER NOT NULL, PRIMARY KEY (slug, vid))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_thumb_mini_pins (slug TEXT NOT NULL, vid INTEGER NOT NULL, start INTEGER NOT NULL, slow INTEGER NOT NULL DEFAULT 0, pinned_at INTEGER NOT NULL, PRIMARY KEY (slug, vid, start, slow))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_thumb_mini_hidden (slug TEXT NOT NULL, vid INTEGER NOT NULL, start INTEGER NOT NULL, slow INTEGER NOT NULL DEFAULT 0, hidden_at INTEGER NOT NULL, PRIMARY KEY (slug, vid, start, slow))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_thumb_pin_migration (done INTEGER PRIMARY KEY)').run();
  const migrated = await db.prepare('SELECT done FROM nv_thumb_pin_migration WHERE done = 1').first();
  if (!migrated) {
    try { await db.prepare('INSERT OR IGNORE INTO nv_thumb_pins (slug, vid, pinned_at) SELECT f.slug, f.vid, ? FROM nv_feat_state s JOIN nv_feat f ON f.id = s.v WHERE s.k LIKE \'thumbpin:%\' AND s.v > 0').bind(now).run(); } catch (e) {}
    await db.prepare("INSERT OR IGNORE INTO nv_thumb_pins (slug, vid, pinned_at) SELECT 'canal-da-maryh', 45, 0 WHERE EXISTS (SELECT 1 FROM nv_feat WHERE slug = 'canal-da-maryh' AND vid = 45)").run();
    await db.prepare('INSERT OR IGNORE INTO nv_thumb_pin_migration (done) VALUES (1)').run();
  }
}
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
      const ks = await clipList(env, db, slug, 200);
      if (ks.length) {
        const m = ks[Math.floor(Math.random() * ks.length)], pv = m.v, ps = m.st;
        if (!(await clipCanView(request, env, 'preview', slug, pv, ps, 0))) continue;
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
    if (!(await clipCanView(request, env, 'preview', slug, v.id, st, 0))) continue;
    await db.prepare('DELETE FROM nv_feat WHERE auto = 1 AND id != ?').bind(cur ? cur.id : 0).run();
    await db.prepare('INSERT OR REPLACE INTO nv_feat (slug, vid, title, name, queued, added, start, auto) VALUES (?, ?, ?, ?, 0, ?, ?, 1)').bind(slug, v.id, v.title || '', d.name || slug, now, st).run();
    return await db.prepare('SELECT * FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, v.id).first();
  }
  return null;
}
async function current(env, request, db, now) {
  let cur = await getS(db, 'cur'), since = await getS(db, 'since');
  let row = cur ? await db.prepare('SELECT * FROM nv_feat WHERE id = ?').bind(cur).first() : null;
  if (row && now - since < HOLD && await clipCanView(request, env, 'preview', row.slug, row.vid, row.start || 0, 0)) return { row, since };
  const pending = (await db.prepare('SELECT * FROM nv_feat WHERE queued = 1 ORDER BY added, id').all()).results || [];
  let next = null; for (const candidate of pending) if (await clipCanView(request, env, 'preview', candidate.slug, candidate.vid, candidate.start || 0, 0)) { next = candidate; break; }
  if (!next) next = await randomAny(env, request, db, now, row);
  if (!next) return row && await clipCanView(request, env, 'preview', row.slug, row.vid, row.start || 0, 0) ? { row, since: now } : null;
  const claim = await db.prepare("UPDATE nv_feat_state SET v = ? WHERE k = 'since' AND v = ?").bind(now, since).run();
  if (!claim.meta || claim.meta.changes !== 1) { cur = await getS(db, 'cur'); since = await getS(db, 'since'); row = cur ? await db.prepare('SELECT * FROM nv_feat WHERE id = ?').bind(cur).first() : null; return row ? { row, since } : null; }
  await setS(db, 'cur', next.id);
  await db.prepare('UPDATE nv_feat SET queued = 0, shown = shown + 1, last = ? WHERE id = ?').bind(now, next.id).run();
  return { row: next, since: now };
}
const pad = (n) => String(n).padStart(2, '0');
const clipKey = (slug, vid, st) => `${slug}/clips/c-${vid}-${st}.mp4`;
// Lista los clips de un canal con UN solo clip por video: el que el dueño marcó (nv_feat); si no hay marca, el subido más recientemente.
// (Antes se quedaba con el último en orden alfabético de la clave, y 'c-80-5' le ganaba a 'c-80-10'.)
// Cache por aislado (2 min): la lista de clips de un canal casi no cambia; evita ~57 listados R2 + 57 consultas D1 seguidos en cada carga de la fila.
const CL_CACHE = new Map();
function clipList(env, db, slug, limit) {
  const k = slug + ':' + (limit || 500), now = Date.now(), h = CL_CACHE.get(k);
  if (h && now - h.t < 120000) return h.p;
  const p = clipListRaw(env, db, slug, limit).catch((e) => { CL_CACHE.delete(k); throw e; });
  CL_CACHE.set(k, { t: now, p }); return p;
}
async function clipListRaw(env, db, slug, limit) {
  const l = await env.NOVINHAS_VIDEOS.list({ prefix: slug + '/clips/c-', limit: limit || 500 }), mk = {};
  try { ((await db.prepare('SELECT vid, start FROM nv_feat WHERE slug = ? AND auto = 0 ORDER BY added').bind(slug).all()).results || []).forEach((r) => { mk[r.vid] = r.start || 0; }); } catch (e) {}
  const best = {};
  for (const o of (l.objects || [])) {
    const m = /c-(\d+)-(\d+)\.mp4$/.exec(o.key); if (!m) continue;
    const v = parseInt(m[1], 10), st = parseInt(m[2], 10), up = +new Date(o.uploaded || 0), isMk = mk[v] === st, cu = best[v];
    if (!cu || (isMk && !cu.mk) || (isMk === cu.mk && up > cu.up)) best[v] = { v, st, up, mk: isMk };
  }
  return Object.keys(best).map((k) => best[k]);
}
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
    if (b.action === 'rowset') { // 3 estados de un clip de la fila: pin (fijado) / free (en la rotacion al azar) / hide (fuera)
      if (!SLUG.test(b.slug || '') || !(+b.id > 0) || ['pin', 'free', 'hide'].indexOf(b.state) < 0) return J({ error: 'bad_request' }, 400);
      await db.prepare('CREATE TABLE IF NOT EXISTS nv_row_bad (slug TEXT, vid INTEGER, ts INTEGER, PRIMARY KEY (slug, vid))').run();
      await db.prepare('CREATE TABLE IF NOT EXISTS nv_row_pin (slug TEXT PRIMARY KEY, vid INTEGER, ts INTEGER)').run();
      await db.prepare('DELETE FROM nv_row_bad WHERE slug = ? AND vid = ?').bind(b.slug, +b.id).run();
      await db.prepare('DELETE FROM nv_row_pin WHERE slug = ? AND vid = ?').bind(b.slug, +b.id).run();
      if (b.state === 'pin') await db.prepare('INSERT OR REPLACE INTO nv_row_pin (slug, vid, ts) VALUES (?, ?, ?)').bind(b.slug, +b.id, now).run();
      if (b.state === 'hide') await db.prepare('INSERT OR REPLACE INTO nv_row_bad (slug, vid, ts) VALUES (?, ?, ?)').bind(b.slug, +b.id, now).run();
      return J({ ok: true });
    }
    if (b.action === 'rowhide') { if (!SLUG.test(b.slug || '') || !(+b.id > 0)) return J({ error: 'bad_request' }, 400); await db.prepare('CREATE TABLE IF NOT EXISTS nv_row_bad (slug TEXT, vid INTEGER, ts INTEGER, PRIMARY KEY (slug, vid))').run(); await db.prepare('INSERT OR REPLACE INTO nv_row_bad (slug, vid, ts) VALUES (?, ?, ?)').bind(b.slug, +b.id, now).run(); return J({ ok: true }); }
    if (b.action === 'rowpin') { if (!SLUG.test(b.slug || '') || !(+b.id > 0)) return J({ error: 'bad_request' }, 400); await db.prepare('CREATE TABLE IF NOT EXISTS nv_row_pin (slug TEXT PRIMARY KEY, vid INTEGER, ts INTEGER)').run(); await db.prepare('INSERT OR REPLACE INTO nv_row_pin (slug, vid, ts) VALUES (?, ?, ?)').bind(b.slug, +b.id, now).run(); return J({ ok: true }); }
    if (b.action === 'next') { await setS(db, 'since', 0); return J({ ok: true }); }
    if (b.action === 'remove') { await db.prepare('DELETE FROM nv_feat WHERE id = ?').bind(+b.item || 0).run(); return J({ ok: true }); }
    if (b.action === 'thumbset' || b.action === 'thumbpin') {
      const slug = b.c || '', state = b.action === 'thumbpin' ? 'pin' : b.state, rawItem = Number(b.item || b.vid), kind = b.kind === 'mini' ? 'mini' : 'preview', start = Math.max(0, parseInt(b.start, 10) || 0), slow = b.slow ? 1 : 0;
      if (!SLUG.test(slug) || !Number.isSafeInteger(rawItem) || rawItem < 1 || ['pin', 'free', 'hide'].indexOf(state) < 0) return J({ error: 'bad_request' }, 400);
      const legacy = b.action === 'thumbpin' ? await db.prepare('SELECT vid FROM nv_feat WHERE id = ? AND slug = ?').bind(rawItem, slug).first() : null;
      const item = legacy ? Number(legacy.vid) : rawItem;
      await ensureThumbPins(db, now);
      let row, already = false;
      if (kind === 'mini') {
        row = await db.prepare('SELECT 1 x FROM nv_mini WHERE slug = ? AND vid = ? AND start = ? AND slow = ? AND COALESCE(gone, 0) = 0').bind(slug, item, start, slow).first();
        if (!row) return J({ error: 'no_such_miniclip' }, 404);
        const key = `${slug}/mini/m-${item}-${start}-${slow ? 's' : 'n'}.mp4`;
        if (!(await env.NOVINHAS_VIDEOS.head(key))) return J({ error: 'miniclip_not_ready' }, 409);
        if (!(await clipCanView(request, env, 'mini', slug, item, start, slow))) return J({ error: 'miniclip_unavailable' }, 403);
        already = !!(await db.prepare('SELECT 1 x FROM nv_thumb_mini_pins WHERE slug = ? AND vid = ? AND start = ? AND slow = ?').bind(slug, item, start, slow).first());
      } else {
        row = await db.prepare('SELECT 1 x FROM nv_feat WHERE slug = ? AND vid = ? AND auto = 0').bind(slug, item).first();
        if (!row) return J({ error: 'no_such_preview' }, 404);
        const ready = await clipList(env, db, slug, 500); if (!ready.some((x) => x.v === item)) return J({ error: 'preview_not_ready' }, 409);
        already = !!(await db.prepare('SELECT 1 x FROM nv_thumb_pins WHERE slug = ? AND vid = ?').bind(slug, item).first());
      }
      const oldCount = await db.prepare('SELECT COUNT(*) n FROM nv_thumb_pins WHERE slug = ?').bind(slug).first(), miniCount = await db.prepare('SELECT COUNT(*) n FROM nv_thumb_mini_pins WHERE slug = ?').bind(slug).first(), pinCount = Number(oldCount && oldCount.n || 0) + Number(miniCount && miniCount.n || 0);
      if (state === 'pin') {
        if (!already && pinCount >= 2) return J({ ok: false, error: 'pin_limit', max: 2 }, 409);
        if (!already) {
          if (kind === 'mini') {
            await db.prepare('DELETE FROM nv_thumb_mini_hidden WHERE slug = ? AND vid = ? AND start = ? AND slow = ?').bind(slug, item, start, slow).run();
            await db.prepare('INSERT OR IGNORE INTO nv_thumb_mini_pins (slug, vid, start, slow, pinned_at) SELECT ?, ?, ?, ?, ? WHERE ((SELECT COUNT(*) FROM nv_thumb_pins WHERE slug = ?) + (SELECT COUNT(*) FROM nv_thumb_mini_pins WHERE slug = ?)) < 2').bind(slug, item, start, slow, Date.now(), slug, slug).run();
          } else {
            await db.prepare('DELETE FROM nv_thumb_hidden WHERE slug = ? AND vid = ?').bind(slug, item).run();
            await db.prepare('INSERT OR IGNORE INTO nv_thumb_pins (slug, vid, pinned_at) SELECT ?, ?, ? WHERE ((SELECT COUNT(*) FROM nv_thumb_pins WHERE slug = ?) + (SELECT COUNT(*) FROM nv_thumb_mini_pins WHERE slug = ?)) < 2').bind(slug, item, Date.now(), slug, slug).run();
          }
        }
      } else if (state === 'free') {
        if (kind === 'mini') await db.prepare('DELETE FROM nv_thumb_mini_pins WHERE slug = ? AND vid = ? AND start = ? AND slow = ?').bind(slug, item, start, slow).run();
        else await db.prepare('DELETE FROM nv_thumb_pins WHERE slug = ? AND vid = ?').bind(slug, item).run();
      } else {
        if (kind === 'mini') {
          await db.prepare('DELETE FROM nv_thumb_mini_pins WHERE slug = ? AND vid = ? AND start = ? AND slow = ?').bind(slug, item, start, slow).run();
          await db.prepare('INSERT OR REPLACE INTO nv_thumb_mini_hidden (slug, vid, start, slow, hidden_at) VALUES (?, ?, ?, ?, ?)').bind(slug, item, start, slow, now).run();
        } else {
          await db.prepare('DELETE FROM nv_thumb_pins WHERE slug = ? AND vid = ?').bind(slug, item).run();
          await db.prepare('INSERT OR REPLACE INTO nv_thumb_hidden (slug, vid, hidden_at) VALUES (?, ?, ?)').bind(slug, item, now).run();
        }
      }
      const saved = (await db.prepare('SELECT vid FROM nv_thumb_pins WHERE slug = ? ORDER BY pinned_at, vid').bind(slug).all()).results || [], savedMini = (await db.prepare('SELECT vid,start,slow FROM nv_thumb_mini_pins WHERE slug = ? ORDER BY pinned_at, vid, start').bind(slug).all()).results || [];
      const hidden = (await db.prepare('SELECT vid FROM nv_thumb_hidden WHERE slug = ?').bind(slug).all()).results || [], hiddenMini = (await db.prepare('SELECT vid,start,slow FROM nv_thumb_mini_hidden WHERE slug = ?').bind(slug).all()).results || [];
      return J({ ok: true, pinned: saved.map((x) => ({ kind: 'preview', id: Number(x.vid) })).concat(savedMini.map((x) => ({ kind: 'mini', id: Number(x.vid), start: Number(x.start), slow: Number(x.slow) }))), hidden: hidden.map((x) => Number(x.vid)).concat(hiddenMini.map((x) => `mini:${x.vid}:${x.start}:${x.slow}`)), max: 2 });
    }
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
  if (q.get('me')) {
    const ow = await isOwner(request, env), out = { owner: ow };
    if (ow && env.DB) {
      try {
        await env.DB.prepare('CREATE TABLE IF NOT EXISTS nv_row_bad (slug TEXT, vid INTEGER, ts INTEGER, PRIMARY KEY (slug, vid))').run();
        await env.DB.prepare('CREATE TABLE IF NOT EXISTS nv_row_pin (slug TEXT PRIMARY KEY, vid INTEGER, ts INTEGER)').run();
        out.hidden = ((await env.DB.prepare('SELECT slug, vid FROM nv_row_bad').all()).results || []).map((r) => r.slug + ':' + r.vid).concat(Object.keys(ROW_BAD));
        out.pinned = ((await env.DB.prepare('SELECT slug, vid FROM nv_row_pin').all()).results || []).map((r) => r.slug + ':' + r.vid);
      } catch (e) {}
    }
    return J(out);
  }
  if (q.get('cs')) {
    const slug = q.get('c') || '', vid = parseInt(q.get('v'), 10), st = parseInt(q.get('t'), 10);
    if (!SLUG.test(slug) || !(vid > 0) || !(st >= 0)) return new Response('bad_request', { status: 400 });
    if (!(await clipCanView(request, env, 'preview', slug, vid, st, 0))) return new Response('VIP access required', { status: 403 });
    const key = clipKey(slug, vid, st), ch = await env.NOVINHAS_VIDEOS.head(key); if (!ch) return new Response('not_found', { status: 404 });
    const mm = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || ''), tot = ch.size, vipView = await isVip(request, env), cap = vipView ? tot : Math.max(65536, Math.min(tot, Math.floor(tot / 4))); let a0 = 0, b0 = cap - 1, sc = vipView ? 200 : 206;
    const hh = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': vipView ? 'private, no-store' : 'public, max-age=300', 'X-Robots-Tag': 'noindex' });
    if (mm) { if (mm[1] === '') a0 = Math.max(0, cap - parseInt(mm[2], 10)); else a0 = parseInt(mm[1], 10); if (mm[2]) b0 = Math.min(parseInt(mm[2], 10), cap - 1); if (!(a0 <= b0) || a0 >= cap) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + cap } }); sc = 206; }
    if (!vipView || mm) hh.set('Content-Range', `bytes ${a0}-${b0}/${cap}`);
    hh.set('Content-Length', String(b0 - a0 + 1));
    const co = await env.NOVINHAS_VIDEOS.get(key, { range: { offset: a0, length: b0 - a0 + 1 } });
    return new Response(co.body, { status: sc, headers: hh });
  }
  if (q.get('library')) {
    const slug = q.get('c') || ''; if (!SLUG.test(slug)) return J({ error: 'bad_request' }, 400);
    const rows = (await db.prepare('SELECT vid,title,name,start,queued FROM nv_feat WHERE slug=? AND auto=0 ORDER BY added DESC').bind(slug).all()).results || [], ready = await clipList(env, db, slug, 500), readyByVideo = {};
    ready.forEach((r) => { readyByVideo[r.v] = r.st; });
    const access = await clipAccessMap(db, 'preview', slug), owner = await isOwner(request, env), items = [];
    for (const r of rows) {
      const start = readyByVideo[r.vid] == null ? (r.start || 0) : readyByVideo[r.vid], hasFile = readyByVideo[r.vid] != null;
      if (!hasFile && !owner) continue;
      if (hasFile && !(await clipCanView(request, env, 'preview', slug, r.vid, start, 0))) continue;
      items.push({ c: slug, id: r.vid, start, slow: 0, kind: 'preview', access: access[`${r.vid}/${start}/0`] || 'public', pending: !hasFile, queuedAt: !hasFile ? Number(r.added) || 0 : 0, name: r.name || slug, title: r.title || '', src: hasFile ? `/api/novinhas/featured?cs=1&c=${slug}&v=${r.vid}&t=${start}` : '', poster: `/api/novinhas/file?k=${slug}/previews/poster-${pad(r.vid)}.webp`, url: `/novinhas/canal/ver/?c=${slug}&v=${pad(r.vid)}` });
    }
    return J({ items, owner });
  }
  if (q.get('thumbs') && q.get('clips') === '1') {
    const rows = (await db.prepare('SELECT slug,vid FROM nv_feat WHERE auto=0 ORDER BY added,id').all()).results || [], featureBy = {};
    rows.forEach((r) => { (featureBy[r.slug] = featureBy[r.slug] || new Set()).add(Number(r.vid)); });
    const miniRows = (await db.prepare('SELECT slug,vid,start,slow FROM nv_mini WHERE COALESCE(gone,0)=0').all()).results || [], miniBy = {};
    miniRows.forEach((r) => { (miniBy[r.slug] = miniBy[r.slug] || []).push(r); });
    const owner = await isOwner(request, env), vipViewer = await isVip(request, env);
    await ensureThumbPins(db, now);
    const oldPins = (await db.prepare('SELECT slug,vid FROM nv_thumb_pins ORDER BY pinned_at,vid').all()).results || [], oldBy = {};
    oldPins.forEach((r) => { (oldBy[r.slug] = oldBy[r.slug] || []).push(Number(r.vid)); });
    const miniPins = (await db.prepare('SELECT slug,vid,start,slow FROM nv_thumb_mini_pins ORDER BY pinned_at,vid,start').all()).results || [], miniPinBy = {};
    miniPins.forEach((r) => { (miniPinBy[r.slug] = miniPinBy[r.slug] || []).push({ kind:'mini', id:Number(r.vid), start:Number(r.start), slow:Number(r.slow) }); });
    const oldHidden = (await db.prepare('SELECT slug,vid FROM nv_thumb_hidden').all()).results || [], hiddenBy = {};
    oldHidden.forEach((r) => { (hiddenBy[r.slug] = hiddenBy[r.slug] || []).push(Number(r.vid)); });
    const miniHidden = (await db.prepare('SELECT slug,vid,start,slow FROM nv_thumb_mini_hidden').all()).results || [], miniHiddenBy = {};
    miniHidden.forEach((r) => { (miniHiddenBy[r.slug] = miniHiddenBy[r.slug] || []).push(`${r.vid}:${r.start}:${r.slow?1:0}`); });
    const slugs = Array.from(new Set(Object.keys(featureBy).concat(owner ? Object.keys(miniBy) : [], Object.keys(oldBy), Object.keys(miniPinBy)))).filter((s) => SLUG.test(s));
    const miniReady = {};
    await Promise.all(slugs.filter((s) => (owner || miniPinBy[s]) && miniBy[s] && miniBy[s].length).map(async (slug) => {
      try {
        const l = await env.NOVINHAS_VIDEOS.list({prefix:slug+'/mini/m-',limit:1000}), keys = new Set((l.objects||[]).map((o)=>o.key));
        const access = await clipAccessMap(db,'mini',slug), ready = [];
        for (const m of miniBy[slug]) {
          const id=Number(m.vid), start=Number(m.start)||0, slow=m.slow?1:0, key=`${slug}/mini/m-${id}-${start}-${slow?'s':'n'}.mp4`;
          if (!keys.has(key) || (!vipViewer && access[`${id}/${start}/${slow}`]==='vip')) continue;
          if (!vipViewer && !(await clipCanView(request,env,'mini',slug,id,start,slow))) continue;
          ready.push({kind:'mini',id,start,slow,src:`/api/novinhas/mini?s=1&k=${encodeURIComponent(key)}`});
        }
        miniReady[slug]=ready;
      } catch(e) { miniReady[slug]=[]; }
    }));
    const day=Math.floor(now/3600), out={};
    const hash=(s)=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h;};
    const keyOf=(x)=>`${x.kind||'preview'}:${x.id}:${Number(x.start)||0}:${x.slow?1:0}`;
    for (const slug of slugs) {
      const feature=[], have={};
      if (featureBy[slug]) (await clipList(env,db,slug,500)).forEach((x)=>{have[x.v]=Number(x.st)||0;});
      for (const vid of featureBy[slug]||[]) {
        if (have[vid]==null || (hiddenBy[slug]||[]).includes(vid)) continue;
        const start=have[vid];
        if (!vipViewer && !(await clipCanView(request,env,'preview',slug,vid,start,0))) continue;
        feature.push({kind:'preview',id:vid,start,slow:0,src:`/api/novinhas/featured?cs=1&c=${slug}&v=${vid}&t=${start}`});
      }
      const hideMini=miniHiddenBy[slug]||[], minis=(miniReady[slug]||[]).filter((x)=>!hideMini.includes(`${x.id}:${x.start}:${x.slow}`));
      const choices=feature.concat(minis), pinned=[];
      (oldBy[slug]||[]).forEach((vid)=>{const x=feature.find((z)=>z.id===vid);if(x)pinned.push(x);});
      (miniPinBy[slug]||[]).forEach((p)=>{const x=minis.find((z)=>keyOf(z)===keyOf(p));if(x)pinned.push(x);});
      if (!choices.length) continue;
      const pool=pinned.length?pinned:choices, chosen=pool[hash(slug+':'+day)%pool.length];
      out[slug]={id:chosen.id,start:chosen.start,slow:chosen.slow,kind:chosen.kind,src:chosen.src,...(owner?{pinned:pinned.map((x)=>({kind:x.kind,id:x.id,start:x.start,slow:x.slow})),hidden:hiddenBy[slug]||[],choices:choices.map((x)=>({kind:x.kind,id:x.id,start:x.start,slow:x.slow,src:x.src}))}:{})};
    }
    return J({day,owner,thumbs:out},200,'no-store');
  }
  if (q.get('thumbs')) {
    const rows = (await db.prepare('SELECT id, slug, vid, start FROM nv_feat WHERE auto = 0 ORDER BY added, id').all()).results || [], by = {};
    rows.forEach((r) => { (by[r.slug] = by[r.slug] || []).push(r); });
    const vipViewer = await isVip(request, env), owner = await isOwner(request, env), accessCache = {};
    await ensureThumbPins(db, now);
    const pinRows = (await db.prepare('SELECT slug, vid FROM nv_thumb_pins ORDER BY pinned_at, vid').all()).results || [], pinBySlug = {};
    pinRows.forEach((r) => { (pinBySlug[r.slug] = pinBySlug[r.slug] || []).push(Number(r.vid)); });
    const hiddenRows = (await db.prepare('SELECT slug, vid FROM nv_thumb_hidden').all()).results || [], hiddenBySlug = {};
    hiddenRows.forEach((r) => { (hiddenBySlug[r.slug] = hiddenBySlug[r.slug] || []).push(Number(r.vid)); });
    await Promise.all(Object.keys(by).map(async (slug) => { accessCache[slug] = await clipAccessMap(db, 'preview', slug); }));
    const day = Math.floor(now / 3600), out = {}; // rota entre los elegidos del canal: 1 hora minimo cada uno
    const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };
    for (const slug of Object.keys(by)) {
      if (!SLUG.test(slug)) continue;
      const acc = accessCache[slug] || {}, allowed = (vid, start) => vipViewer || acc[`${vid}/${start || 0}/0`] !== 'vip';
      const have = {};
      (await clipList(env, db, slug, 500)).forEach((c) => { have[c.v] = String(c.st); });
      const hidden = hiddenBySlug[slug] || [], ok = by[slug].filter((r) => have[r.vid] != null && allowed(r.vid, have[r.vid]) && hidden.indexOf(Number(r.vid)) < 0);
      if (!ok.length) continue;
      const pinned = (pinBySlug[slug] || []).filter((id) => ok.some((x) => Number(x.vid) === id));
      const r = pinned.length ? ok.filter((x) => Number(x.vid) === pinned[hash(slug + ':' + day) % pinned.length])[0] : ok[hash(slug + ':' + day) % ok.length];
      out[slug] = { id: r.vid, src: `/api/novinhas/featured?cs=1&c=${slug}&v=${r.vid}&t=${have[r.vid]}`, ...(owner ? { pinned, hidden, choices: ok.map((x) => ({ id: Number(x.vid), src: `/api/novinhas/featured?cs=1&c=${slug}&v=${x.vid}&t=${have[x.vid]}` })) } : {}) };
    }
    return J({ day, owner, thumbs: out }, 200, 'no-store');
  }
  if (q.get('row')) {
    const N = Math.min(20, Math.max(1, parseInt(q.get('row'), 10) || 8)); let chans = [];
    try { const r = await env.ASSETS.fetch(new URL('/novinhas/channels-live.json', request.url)); chans = (await r.json()).filter((c) => SLUG.test(c.slug)); } catch (e) {}
    const tot = {}; chans.forEach((c) => { tot[c.slug] = c.total || 0; });
    await Promise.all(chans.map((c) => clipList(env, db, c.slug, 500).catch(() => null))); // precarga en paralelo (luego cada clipsOf sale de cache)
    const bad = Object.assign({}, ROW_BAD); try { await db.prepare('CREATE TABLE IF NOT EXISTS nv_row_bad (slug TEXT, vid INTEGER, ts INTEGER, PRIMARY KEY (slug, vid))').run(); ((await db.prepare('SELECT slug, vid FROM nv_row_bad').all()).results || []).forEach((r) => { bad[r.slug + ':' + r.vid] = 1; }); } catch (e) {}
    const all = (await db.prepare('SELECT id, slug, vid, name, start FROM nv_feat ORDER BY added, id').all()).results || [];
    const items = [], used = {};
    // Fijo unico: Maryh (45) primero. El resto: azar entre TODOS los canales (un clip por canal, semilla nueva en cada carga: sale distinto cada vez)
    let sd = (Math.floor(Math.random() * 4294967296) ^ now) >>> 0; const rn = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
    const vipViewer = await isVip(request, env), accessCache = {};
    await Promise.all(chans.map(async (c) => { accessCache[c.slug] = await clipAccessMap(db, 'preview', c.slug); }));
    const clipsOf = async (slug) => { const h = {}, acc = accessCache[slug] || {}; (await clipList(env, db, slug, 500)).forEach((c) => { if (!bad[slug + ':' + c.v] && (vipViewer || acc[`${c.v}/${c.st || 0}/0`] !== 'vip')) h[c.v] = c.st; }); return h; };
    const fixSlug = 'canal-da-maryh', fixId = FIXED_THUMBS[fixSlug];
    { const h = await clipsOf(fixSlug); if (fixId && h[fixId] != null && fixSlug in tot) { const r = all.filter((x) => x.slug === fixSlug && x.vid === fixId)[0]; items.push({ slug: fixSlug, name: (r && r.name) || fixSlug, total: tot[fixSlug], id: fixId, start: h[fixId] }); used[fixSlug] = 1; } }
    try { await db.prepare('CREATE TABLE IF NOT EXISTS nv_row_pin (slug TEXT PRIMARY KEY, vid INTEGER, ts INTEGER)').run(); const pins = (await db.prepare('SELECT slug, vid FROM nv_row_pin').all()).results || []; for (const pn of pins) { if (used[pn.slug] || !(pn.slug in tot) || bad[pn.slug + ':' + pn.vid]) continue; const h = await clipsOf(pn.slug); if (h[pn.vid] == null) continue; const r = all.filter((x) => x.slug === pn.slug)[0], cc = chans.filter((c) => c.slug === pn.slug)[0] || {}; items.push({ slug: pn.slug, name: (r && r.name) || cc.name || pn.slug, total: tot[pn.slug], id: pn.vid, start: h[pn.vid], pin: 1 }); used[pn.slug] = 1; } } catch (e) {}
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
        const h = await clipsOf(c.slug), ks = Object.keys(h).map((v) => ({ v: +v, st: h[v] }));
        if (!ks.length) continue; const m = ks[Math.floor(Math.random() * ks.length)];
        items.push({ slug: c.slug, name: c.name || c.slug, total: c.total || 0, id: m.v, start: m.st });
      }
    }
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = items[i]; items[i] = items[j]; items[j] = t; } // todos en posicion al azar, incluido el primero (Maryh sigue siempre dentro de la fila)
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
    const featureRow = await db.prepare('SELECT start FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, vid).first();
    if (!(await clipCanView(request, env, 'preview', slug, vid, featureRow && featureRow.start || 0, 0))) return new Response('VIP access required', { status: 403 });
    const st0 = (await db.prepare('SELECT start FROM nv_feat WHERE slug = ? AND vid = ?').bind(slug, vid).first() || {}).start || 0, ck = clipKey(slug, vid, st0);
    const ch = await env.NOVINHAS_VIDEOS.head(ck);
    if (ch) {
      const mm = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || ''), tot = ch.size, vipView = await isVip(request, env), cap = vipView ? tot : Math.max(65536, Math.min(tot, Math.floor(tot / 4))); let a0 = 0, b0 = cap - 1, sc = vipView ? 200 : 206;
      const hh = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': vipView ? 'private, no-store' : 'public, max-age=300', 'X-Robots-Tag': 'noindex' });
      if (mm) { if (mm[1] === '') a0 = Math.max(0, cap - parseInt(mm[2], 10)); else a0 = parseInt(mm[1], 10); if (mm[2]) b0 = Math.min(parseInt(mm[2], 10), cap - 1); if (!(a0 <= b0) || a0 >= cap) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + cap } }); sc = 206; }
      if (!vipView || mm) hh.set('Content-Range', `bytes ${a0}-${b0}/${cap}`);
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
