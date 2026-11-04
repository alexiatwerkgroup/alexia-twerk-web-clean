// POST /api/c/<slug>/unlock {n}  -> costs COIN_COST coin per video (coins shared with Jenny)
// GET  /api/c/<slug>/unlock      -> { coins }
import { authenticate } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';
import { modelOf, validN, videoKey, coinCost, ensureTables } from '../../../_lib/catalog.js';

export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!modelOf(slug)) return json({ ok: false, error: 'not_found' }, 404);
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return json({ ok: false, error: 'login_required' }, 401);
  const em = String(u.email).toLowerCase();
  await ensureTables(env);
  if (request.method === 'GET') {
    const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
    return json({ ok: true, coins: c ? c.coins : 0, tokens: (await env.DB.prepare('SELECT tokens FROM profiles WHERE id = ?').bind(p.sub).first())?.tokens || 0 });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch {}
  const n = String(b.n || '');
  if (!validN(n)) return json({ ok: false, error: 'bad_video' }, 400);
  const cost = coinCost(slug, n);
  if (!cost) return json({ ok: false, error: 'bad_video' }, 400);
  const had = await env.DB.prepare('SELECT 1 x FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind(slug, em, n).first();
  if (had) return json({ ok: true, already: true });
  // never charge for a video that is not in storage yet
  const o = await env.JENNY_VIDEOS.head(videoKey(slug, n));
  if (!o) return json({ ok: false, error: 'not_available' }, 404);
  const r = await env.DB.prepare('UPDATE jenny_coins SET coins = coins - ? WHERE email = ? AND coins >= ?').bind(cost, em, cost).run();
  if (!r.meta || r.meta.changes !== 1) return json({ ok: false, error: 'not_enough_coins', cost }, 402);
  await env.DB.prepare("INSERT OR IGNORE INTO catalog_unlocks (slug, email, n, via) VALUES (?, ?, ?, 'coins')").bind(slug, em, n).run();
  const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
  return json({ ok: true, kind: 'coins', coins: c ? c.coins : 0 });
}
