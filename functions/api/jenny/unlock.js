// POST /api/jenny/unlock {n}
//   short clip (<15 s) -> costs TOKEN_COST site tokens (earned)
//   long video         -> costs COIN_COST coin (bought coins, 1 coin = $0.50)
// GET  /api/jenny/unlock -> { coins, tokens }
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { validN, isShort, isExplicit, TOKEN_COST, COIN_COST, EXPLICIT_COST } from '../../_lib/jenny.js';

export async function onRequest({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email, tokens FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return json({ ok: false, error: 'login_required' }, 401);
  const em = String(u.email).toLowerCase();
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
  const cost = isExplicit(n) ? EXPLICIT_COST : COIN_COST;
  const r = await env.DB.prepare('UPDATE jenny_coins SET coins = coins - ? WHERE email = ? AND coins >= ?').bind(cost, em, cost).run();
  if (!r.meta || r.meta.changes !== 1) return json({ ok: false, error: 'not_enough_coins', cost }, 402);
  await env.DB.prepare("INSERT OR IGNORE INTO jenny_unlocks (email, n, via) VALUES (?, ?, 'coins')").bind(em, n).run();
  const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(em).first();
  return json({ ok: true, kind: 'coins', coins: c ? c.coins : 0 });
}
