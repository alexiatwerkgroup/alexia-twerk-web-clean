// GET ?o=ORDER -> consulta/acredita la orden del usuario logueado (al volver de Binance).
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { settle, ensureOrders, configured } from '../../_lib/binancepay.js';
export async function onRequestGet({ request, env }) {
  if (!env.DB || !configured(env)) return json({ ok: false, error: 'not_configured' }, 503);
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  const id = String(new URL(request.url).searchParams.get('o') || '').replace(/[^0-9a-zA-Z]/g, '').slice(0, 32);
  await ensureOrders(env.DB);
  const o = id && u ? await env.DB.prepare('SELECT email FROM pay_orders WHERE id = ?').bind(id).first() : null;
  if (!o || o.email !== String(u.email).trim().toLowerCase()) return json({ ok: false, error: 'not_found' }, 404);
  return json(await settle(env, id));
}
