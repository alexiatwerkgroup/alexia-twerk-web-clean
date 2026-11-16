// Reviews de compradores (reales). Las envia cualquier cuenta con sesion (verificada si es VIP/compra); el dueño aprueba antes de que se vean.
//  GET  /api/reviews                  -> {items:[{id,name,stars,text,product,verified,ts}], n, avg}   (solo aprobadas, publico)
//  GET  /api/reviews?me=1             -> {user, vip, owner, mine:{stars,text,status}|null}
//  GET  /api/reviews?all=1            -> (dueño) todas, con pendientes
//  POST {stars,text,name?}            -> (VIP con sesion) envia/actualiza su review -> queda PENDIENTE
//  POST {action:'add',name,stars,text,product?}   -> (dueño) agrega una review de un comprador real ya aprobada
//  POST {action:'approve'|'delete',id}            -> (dueño)
import { authenticate } from '../_lib/auth.js';
import { OWNER } from '../_lib/analytics.js';
import { isVip } from '../_lib/vip.js';

const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

async function who(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return null;
    const u = await env.DB.prepare('SELECT email, username FROM profiles WHERE id = ?').bind(p.sub).first(); if (!u) return null;
    return { id: String(p.sub), owner: String(u.email).toLowerCase() === OWNER, name: u.username || '' };
  } catch (e) { return null; }
}
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, name TEXT, stars INTEGER, text TEXT, product TEXT, verified INTEGER DEFAULT 1, status TEXT DEFAULT \'pending\', ts INTEGER)').run();
}

export async function onRequest({ request, env }) {
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  const db = env.DB, url = new URL(request.url), q = url.searchParams, now = Date.now();
  await ensure(db);

  if (request.method === 'POST') {
    const me = await who(request, env); if (!me) return J({ ok: false, error: 'login' }, 401);
    let b = {}; try { b = await request.json(); } catch (e) {}
    if (b.action === 'approve' || b.action === 'delete') {
      if (!me.owner) return J({ ok: false, error: 'owner_only' }, 403);
      const id = parseInt(b.id, 10); if (!(id > 0)) return J({ ok: false, error: 'bad_id' }, 400);
      if (b.action === 'approve') await db.prepare("UPDATE nv_reviews SET status = 'ok' WHERE id = ?").bind(id).run();
      else await db.prepare('DELETE FROM nv_reviews WHERE id = ?').bind(id).run();
      return J({ ok: true });
    }
    const stars = Math.round(Number(b.stars)), text = clean(b.text, 500);
    if (!(stars >= 1 && stars <= 5)) return J({ ok: false, error: 'bad_stars' }, 400);
    if (text.length < 15) return J({ ok: false, error: 'too_short' }, 400);
    if (b.action === 'add') {
      if (!me.owner) return J({ ok: false, error: 'owner_only' }, 403);
      await db.prepare("INSERT INTO nv_reviews (uid, name, stars, text, product, verified, status, ts) VALUES (NULL, ?, ?, ?, ?, 1, 'ok', ?)").bind(clean(b.name, 24) || 'Buyer', stars, text, clean(b.product, 40), now).run();
      return J({ ok: true });
    }
    const vipBuyer = me.owner || (await isVip(request, env));
    const name = clean(b.name, 24) || clean(me.name, 24) || 'Member';
    const old = await db.prepare('SELECT id FROM nv_reviews WHERE uid = ?').bind(me.id).first();
    if (old) await db.prepare("UPDATE nv_reviews SET name = ?, stars = ?, text = ?, status = 'pending', ts = ? WHERE id = ?").bind(name, stars, text, now, old.id).run();
    else await db.prepare("INSERT INTO nv_reviews (uid, name, stars, text, product, verified, status, ts) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)").bind(me.id, name, stars, text, vipBuyer ? 'VIP' : '', vipBuyer ? 1 : 0, now).run();
    return J({ ok: true, status: 'pending' });
  }

  if (q.get('me')) {
    const me = await who(request, env);
    if (!me) return J({ user: false, vip: false, owner: false, mine: null });
    const vip = me.owner || (await isVip(request, env));
    const mine = await db.prepare('SELECT stars, text, status, name FROM nv_reviews WHERE uid = ?').bind(me.id).first();
    return J({ user: true, vip, owner: me.owner, name: me.name, mine: mine || null });
  }
  if (q.get('all')) {
    const me = await who(request, env); if (!me || !me.owner) return J({ ok: false, error: 'owner_only' }, 403);
    const r = await db.prepare('SELECT id, name, stars, text, product, status, ts FROM nv_reviews ORDER BY (status = \'pending\') DESC, ts DESC LIMIT 200').all();
    return J({ items: r.results || [] });
  }
  const r = await db.prepare("SELECT id, name, stars, text, product, verified, ts FROM nv_reviews WHERE status = 'ok' ORDER BY ts DESC LIMIT 60").all();
  const items = r.results || [], n = items.length, avg = n ? Math.round((items.reduce((a, x) => a + x.stars, 0) / n) * 10) / 10 : 0;
  return J({ items, n, avg }, 200, 'public, max-age=60');
}
