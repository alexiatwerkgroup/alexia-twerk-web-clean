// Owner-only. GET /api/jenny/grant -> list; POST {email} -> grant; DELETE {email} -> revoke.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { promoState, PROMO_MIN } from '../../_lib/jenny.js';
import { ensureCoinLedger, recordCoinMovement } from '../../_lib/coin-ledger.js';
const OWNER = 'alexiatwerkoficial@gmail.com';
export async function onRequest({ request, env }) {
  const key = request.headers.get('X-Grant-Key') || '';
  const keyOk = !!env.GRANT_KEY && env.GRANT_KEY.length >= 24 && key === env.GRANT_KEY;
  if (!keyOk) {
    const me = await authenticate(request, env);
    if (!me || String(me.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'forbidden' }, 403);
  }
  if (request.method === 'GET') {
    const r = await env.DB.prepare('SELECT email, granted_at FROM jenny_access ORDER BY granted_at DESC').all();
    return json({ ok: true, list: r.results || [] });
  }
  let b = {}; try { b = await request.json(); } catch {}
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);
  const coins = parseInt(b.coins, 10);
  if (coins) {
    const minC = (await promoState(env)).active ? PROMO_MIN : 20;
    if (request.method === 'POST' && coins < minC) return json({ ok: false, error: 'min_' + minC + '_coins' }, 400);
    if (request.method !== 'POST' && request.method !== 'DELETE') return json({ ok: false, error: 'method' }, 405);
    await ensureCoinLedger(env.DB);
    const delta = request.method === 'DELETE' ? -Math.abs(coins) : Math.abs(coins);
    const update = request.method === 'DELETE'
      ? env.DB.prepare('UPDATE jenny_coins SET coins = coins - ? WHERE lower(email)=? AND coins >= ?').bind(-delta, email, -delta)
      : env.DB.prepare('INSERT INTO jenny_coins (email,coins) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET coins=coins+excluded.coins').bind(email, delta);
    const results = await env.DB.batch([update, recordCoinMovement(env.DB, email, delta, request.method === 'DELETE' ? 'admin_adjustment' : 'coin_credit', 'jenny:manual-credit')]);
    if (request.method === 'DELETE' && (!results[0].meta || results[0].meta.changes !== 1)) return json({ ok: false, error: 'insufficient_coins' }, 402);
    const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE email = ?').bind(email).first();
    return json({ ok: true, coins: c ? c.coins : 0 });
  }
  const ns = (Array.isArray(b.n) ? b.n : String(b.n || '').split(',')).map(x => { x = String(x).trim().toLowerCase(); return /^x\d+$/.test(x) ? 'x' + x.slice(1).padStart(2, '0') : x.padStart(2, '0'); }).filter(x => /^(0[1-9]|[1-8][0-9]|9[0-4])$/.test(x) || /^x(0[1-9]|1[0-9]|2[0-4])$/.test(x));
  if (ns.length) {
    for (const n of ns) {
      if (request.method === 'POST') await env.DB.prepare("INSERT OR IGNORE INTO jenny_unlocks (email, n, via) VALUES (?, ?, 'paid')").bind(email, n).run();
      else if (request.method === 'DELETE') await env.DB.prepare('DELETE FROM jenny_unlocks WHERE email = ? AND n = ?').bind(email, n).run();
    }
    return json({ ok: true, videos: ns });
  }
  if (request.method === 'POST') { await env.DB.prepare('INSERT OR IGNORE INTO jenny_access (email) VALUES (?)').bind(email).run(); return json({ ok: true }); }
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM jenny_access WHERE email = ?').bind(email).run(); return json({ ok: true }); }
  return json({ ok: false, error: 'method' }, 405);
}
