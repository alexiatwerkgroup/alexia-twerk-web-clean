// POST /api/jenny/unlock {n}
//   short clip (<15 s) -> costs TOKEN_COST site tokens (earned)
//   long video         -> costs COIN_COST coin (bought coins, 1 coin = $0.50)
// GET  /api/jenny/unlock -> { coins, tokens }
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { validN, isShort, isExplicit, videoKey, TOKEN_COST, COIN_COST, explicitCost, promoState, PROMO_COST } from '../../_lib/jenny.js';
import { ensureCoinLedger, recordCoinMovement } from '../../_lib/coin-ledger.js';

export async function onRequest({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email, tokens FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return json({ ok: false, error: 'login_required' }, 401);
  const em = String(u.email).toLowerCase();
  await ensureCoinLedger(env.DB);
  if (request.method === 'GET') {
    const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
    return json({ ok: true, coins: c ? c.coins : 0, tokens: u.tokens || 0 });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch {}
  const n = String(b.n || '');
  if (!validN(n)) return json({ ok: false, error: 'bad_video' }, 400);
  const had = await env.DB.prepare('SELECT 1 x FROM jenny_unlocks WHERE email = ? AND n = ?').bind(em, n).first();
  if (had) return json({ ok: true, already: true });
  if (isShort(n)) {
    const r = await env.DB.prepare('UPDATE profiles SET tokens = tokens - ? WHERE id = ? AND tokens >= ?').bind(TOKEN_COST, p.sub, TOKEN_COST).run();
    if (!r.meta || r.meta.changes !== 1) return json({ ok: false, error: 'not_enough_tokens', cost: TOKEN_COST, balance: u.tokens || 0 }, 402);
    await env.DB.prepare("INSERT OR IGNORE INTO jenny_unlocks (email, n, via) VALUES (?, ?, 'tokens')").bind(em, n).run();
    return json({ ok: true, kind: 'tokens', balance: (u.tokens || 0) - TOKEN_COST });
  }
  const pr = await promoState(env);
  const cost = pr.active ? PROMO_COST : (isExplicit(n) ? explicitCost(n) : COIN_COST);
  // never charge for a video that is not in storage yet
  if (isExplicit(n)) { const o = await env.JENNY_VIDEOS.head(videoKey(n)); if (!o) return json({ ok: false, error: 'not_available' }, 404); }
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE jenny_coins SET coins = coins - ? WHERE email = ? AND coins >= ? AND NOT EXISTS (SELECT 1 FROM jenny_unlocks WHERE email = ? AND n = ?)').bind(cost, em, cost, em, n),
    env.DB.prepare("INSERT OR IGNORE INTO jenny_unlocks (email, n, via) SELECT ?, ?, 'coins' WHERE changes() = 1").bind(em, n),
    recordCoinMovement(env.DB, em, -cost, 'video_unlock', 'jenny:' + n)
  ]);
  if (!results[0].meta || results[0].meta.changes !== 1) {
    const already = await env.DB.prepare('SELECT 1 x FROM jenny_unlocks WHERE email = ? AND n = ?').bind(em, n).first();
    if (already) return json({ ok: true, already: true });
    return json({ ok: false, error: 'not_enough_coins', cost }, 402);
  }
  const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
  return json({ ok: true, kind: 'coins', coins: c ? c.coins : 0 });
}
