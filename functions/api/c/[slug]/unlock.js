// POST /api/c/<slug>/unlock {n}  -> costs COIN_COST coin per video (coins shared with Jenny)
// GET  /api/c/<slug>/unlock      -> { coins }
import { authenticate } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';
import { modelOf, validModelN, videoKey, coinCost, ensureTables, OWNER, catalogStorage, isPublished } from '../../../_lib/catalog.js';
import { ensureCoinLedger, recordCoinMovement } from '../../../_lib/coin-ledger.js';

export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!modelOf(slug)) return json({ ok: false, error: 'not_found' }, 404);
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email, tier, tokens FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return json({ ok: false, error: 'login_required' }, 401);
  const em = String(u.email).toLowerCase();
  await ensureTables(env);
  await ensureCoinLedger(env.DB);
  const allow = String(env.JENNY_ALLOWED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const grant = await env.DB.prepare('SELECT 1 x FROM catalog_access WHERE slug = ? AND email = ?').bind(slug, em).first();
  const accessMode = em === OWNER ? 'owner' : u.tier === 'vip' ? 'vip' : allow.includes(em) ? 'allowlisted' : grant ? 'granted' : '';
  if (request.method === 'GET') {
    const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
    const rows = await env.DB.prepare('SELECT n FROM catalog_unlocks WHERE slug = ? AND email = ? ORDER BY n').bind(slug, em).all();
    return json({ ok: true, coins: c ? c.coins : 0, tokens: u.tokens || 0, unlocked: (rows.results || []).map(x => x.n), access_mode: accessMode });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch {}
  const n = String(b.n || '');
  if (!validModelN(slug, n)) return json({ ok: false, error: 'bad_video' }, 400);
  if (request.method === 'POST' && !(await isPublished(env, slug, n))) return json({ ok: false, error: 'not_available' }, 404);
  const cost = coinCost(slug, n);
  if (!cost) return json({ ok: false, error: 'bad_video' }, 400);
  if (accessMode) {
    const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
    return json({ ok: true, already: true, access_mode: accessMode, coins: c ? c.coins : 0 });
  }
  const had = await env.DB.prepare('SELECT 1 x FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind(slug, em, n).first();
  if (had) return json({ ok: true, already: true });
  // never charge for a video that is not in storage yet
  const storage = catalogStorage(env, slug);
  if (!storage) return json({ ok: false, error: 'not_configured' }, 503);
  const o = await storage.head(videoKey(slug, n));
  if (!o) return json({ ok: false, error: 'not_available' }, 404);
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE jenny_coins SET coins = coins - ? WHERE email = ? AND coins >= ? AND NOT EXISTS (SELECT 1 FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?)').bind(cost, em, cost, slug, em, n),
    env.DB.prepare("INSERT OR IGNORE INTO catalog_unlocks (slug, email, n, via) SELECT ?, ?, ?, 'coins' WHERE changes() = 1").bind(slug, em, n),
    recordCoinMovement(env.DB, em, -cost, 'video_unlock', slug + ':' + n)
  ]);
  if (!results[0].meta || results[0].meta.changes !== 1) {
    const already = await env.DB.prepare('SELECT 1 x FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind(slug, em, n).first();
    if (already) return json({ ok: true, already: true });
    return json({ ok: false, error: 'not_enough_coins', cost }, 402);
  }
  const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
  return json({ ok: true, kind: 'coins', coins: c ? c.coins : 0 });
}
