import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { ensureCoinLedger } from '../../_lib/coin-ledger.js';

export async function onRequestGet({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!user) return json({ ok: false, error: 'login_required' }, 401);
  const email = String(user.email || '').trim().toLowerCase();
  await ensureCoinLedger(env.DB);
  const rows = await env.DB.prepare(`SELECT delta, balance_after, kind, reference, created_at
    FROM coin_movements WHERE lower(email)=? ORDER BY created_at DESC, rowid DESC LIMIT 50`).bind(email).all();
  const balance = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE lower(email)=?').bind(email).first();
  return json({ ok: true, coins: balance ? balance.coins : 0, movements: rows.results || [], history_since: '2026-11-05' });
}
