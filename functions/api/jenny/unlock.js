// POST /api/jenny/unlock {n}  -> spends TOKEN_COST site tokens to unlock ONE short clip (<15 s).
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { validN, isShort, TOKEN_COST } from '../../_lib/jenny.js';
export async function onRequestPost({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  let b = {}; try { b = await request.json(); } catch {}
  const n = String(b.n || '');
  if (!validN(n) || !isShort(n)) return json({ ok: false, error: 'not_unlockable_with_tokens' }, 400);
  const u = await env.DB.prepare('SELECT email, tokens FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return json({ ok: false, error: 'login_required' }, 401);
  const em = String(u.email).toLowerCase();
  const had = await env.DB.prepare('SELECT 1 x FROM jenny_unlocks WHERE email = ? AND n = ?').bind(em, n).first();
  if (had) return json({ ok: true, already: true, balance: u.tokens });
  const r = await env.DB.prepare('UPDATE profiles SET tokens = tokens - ? WHERE id = ? AND tokens >= ?').bind(TOKEN_COST, p.sub, TOKEN_COST).run();
  if (!r.meta || r.meta.changes !== 1) return json({ ok: false, error: 'not_enough_tokens', cost: TOKEN_COST, balance: u.tokens }, 402);
  await env.DB.prepare("INSERT OR IGNORE INTO jenny_unlocks (email, n, via) VALUES (?, ?, 'tokens')").bind(em, n).run();
  return json({ ok: true, balance: u.tokens - TOKEN_COST });
}
