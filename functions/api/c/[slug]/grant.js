// Owner-only. GET -> list buyers of <slug>; POST {email} -> full access; DELETE {email} -> revoke.
// POST {email, n:"01,02"} -> single videos; POST {email, coins:20} -> add coins (shared wallet).
import { authenticate } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';
import { modelOf, validN, ensureTables, OWNER, MIN_COIN_PURCHASE } from '../../../_lib/catalog.js';

export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!modelOf(slug)) return json({ ok: false, error: 'not_found' }, 404);
  const key = request.headers.get('X-Grant-Key') || '';
  const keyOk = !!env.GRANT_KEY && env.GRANT_KEY.length >= 24 && key === env.GRANT_KEY;
  if (!keyOk) {
    const me = await authenticate(request, env);
    if (!me || String(me.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'forbidden' }, 403);
  }
  await ensureTables(env);
  if (request.method === 'GET') {
    const r = await env.DB.prepare('SELECT email, granted_at FROM catalog_access WHERE slug = ? ORDER BY granted_at DESC').bind(slug).all();
    return json({ ok: true, list: r.results || [] });
  }
  let b = {}; try { b = await request.json(); } catch {}
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);
  const coins = parseInt(b.coins, 10);
  if (coins) {
    if (request.method === 'POST' && coins < MIN_COIN_PURCHASE) return json({ ok: false, error: 'min_' + MIN_COIN_PURCHASE + '_coins' }, 400);
    await env.DB.prepare('INSERT INTO jenny_coins (email, coins) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET coins = MAX(0, coins + excluded.coins)').bind(email, request.method === 'DELETE' ? -Math.abs(coins) : coins).run();
    const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(email).first();
    return json({ ok: true, coins: c ? c.coins : 0 });
  }
  const ns = (Array.isArray(b.n) ? b.n : String(b.n || '').split(',')).map(x => String(x).trim().padStart(2, '0')).filter(validN);
  if (ns.length) {
    for (const n of ns) {
      if (request.method === 'POST') await env.DB.prepare("INSERT OR IGNORE INTO catalog_unlocks (slug, email, n, via) VALUES (?, ?, ?, 'paid')").bind(slug, email, n).run();
      else if (request.method === 'DELETE') await env.DB.prepare('DELETE FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind(slug, email, n).run();
    }
    return json({ ok: true, videos: ns });
  }
  if (request.method === 'POST') { await env.DB.prepare('INSERT OR IGNORE INTO catalog_access (slug, email) VALUES (?, ?)').bind(slug, email).run(); return json({ ok: true }); }
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM catalog_access WHERE slug = ? AND email = ?').bind(slug, email).run(); return json({ ok: true }); }
  return json({ ok: false, error: 'method' }, 405);
}
