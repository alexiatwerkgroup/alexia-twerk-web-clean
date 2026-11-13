// POST {item:'coins', amt} -> crea la orden en Binance Pay y devuelve checkoutUrl. Requiere sesion iniciada.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { configured, priceFor, createOrder, ensureOrders } from '../../_lib/binancepay.js';
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'no_db' }, 503);
  if (!configured(env)) return json({ ok: false, error: 'not_configured' }, 503);
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || !u.email) return json({ ok: false, error: 'login_required' }, 401);
  let b = {}; try { b = await request.json(); } catch (_) {}
  const price = priceFor(String(b.item || ''), b.amt);
  if (!price) return json({ ok: false, error: 'bad_amount' }, 400);
  await ensureOrders(env.DB);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 30), email = String(u.email).trim().toLowerCase();
  const open = await env.DB.prepare("SELECT COUNT(*) n FROM pay_orders WHERE email = ? AND status = 'created' AND created > ?").bind(email, Math.floor(Date.now() / 1000) - 3600).first();
  if (open && open.n >= 10) return json({ ok: false, error: 'too_many' }, 429);
  await env.DB.prepare('INSERT INTO pay_orders (id,email,item,amount,coins,status,created) VALUES (?,?,?,?,?,?,?)').bind(id, email, 'coins', price.amount, price.coins, 'created', Math.floor(Date.now() / 1000)).run();
  const url = await createOrder(env, { id, amount: price.amount, coins: price.coins }, new URL(request.url).origin);
  if (!url) return json({ ok: false, error: 'binance_error' }, 502);
  return json({ ok: true, checkoutUrl: url, order: id });
}
