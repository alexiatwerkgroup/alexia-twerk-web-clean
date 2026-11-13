// Binance Pay (Merchant API). Requiere secretos en Cloudflare Pages: BINANCE_PAY_KEY y BINANCE_PAY_SECRET.
// Sin claves configuradas, configured(env) = false y el sitio usa el modal manual.
import { recordCoinMovement, ensureCoinLedger } from './coin-ledger.js';
const HOST = 'https://bpay.binanceapi.com';
export const configured = (env) => !!(env.BINANCE_PAY_KEY && env.BINANCE_PAY_SECRET);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function call(env, path, body) {
  const ts = Date.now().toString(), nonce = crypto.randomUUID().replace(/-/g, ''), payload = JSON.stringify(body);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.BINANCE_PAY_SECRET), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts + '\n' + nonce + '\n' + payload + '\n'))).toUpperCase();
  const r = await fetch(HOST + path, { method: 'POST', headers: { 'content-type': 'application/json', 'BinancePay-Timestamp': ts, 'BinancePay-Nonce': nonce, 'BinancePay-Certificate-SN': env.BINANCE_PAY_KEY, 'BinancePay-Signature': sig }, body: payload });
  return r.json().catch(() => ({}));
}
export async function ensureOrders(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS pay_orders (id TEXT PRIMARY KEY, email TEXT NOT NULL, item TEXT NOT NULL, amount REAL NOT NULL, coins INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'created', created INTEGER NOT NULL, paid INTEGER)`).run();
}
// Valida precio SIEMPRE en el servidor. Hoy solo monedas es automatico (1 moneda = US$0.50, minimo US$10).
export function priceFor(item, amt) {
  if (item !== 'coins') return null;
  const a = Math.round(parseFloat(amt) * 100) / 100;
  if (!(a >= 10) || a > 1000 || Math.abs(a * 2 - Math.round(a * 2)) > 1e-9) return null;
  return { amount: a, coins: Math.round(a / 0.5) };
}
export async function createOrder(env, order, origin) {
  const r = await call(env, '/binancepay/openapi/v3/order', {
    env: { terminalType: 'WEB' }, merchantTradeNo: order.id, orderAmount: order.amount.toFixed(2), currency: 'USDT',
    description: order.coins + ' Twerkhub coins', goodsDetails: [{ goodsType: '02', goodsCategory: 'Z000', referenceGoodsId: 'coins', goodsName: order.coins + ' Twerkhub coins' }],
    returnUrl: origin + '/paymentmethods/?paid=' + order.id, cancelUrl: origin + '/paymentmethods/?item=coins', webhookUrl: origin + '/api/pay/binance-webhook',
    orderExpireTime: Date.now() + 30 * 60 * 1000
  });
  return r && r.status === 'SUCCESS' && r.data ? r.data.checkoutUrl : null;
}
// Consulta a Binance (no se confia en el payload del webhook) y acredita UNA sola vez.
export async function settle(env, id) {
  await ensureOrders(env.DB);
  const o = await env.DB.prepare('SELECT * FROM pay_orders WHERE id = ?').bind(id).first();
  if (!o) return { ok: false, error: 'not_found' };
  if (o.status === 'paid') return { ok: true, status: 'paid', coins: o.coins };
  const q = await call(env, '/binancepay/openapi/v2/order/query', { merchantTradeNo: id });
  const st = q && q.data && q.data.status;
  if (st !== 'PAID') return { ok: true, status: st === 'EXPIRED' || st === 'CANCELED' || st === 'ERROR' ? 'failed' : 'pending' };
  const up = await env.DB.prepare("UPDATE pay_orders SET status = 'paid', paid = ? WHERE id = ? AND status = 'created'").bind(Math.floor(Date.now() / 1000), id).run();
  if (up.meta && up.meta.changes === 1) {
    await ensureCoinLedger(env.DB);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO jenny_coins (email,coins) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET coins=coins+excluded.coins').bind(o.email, o.coins),
      recordCoinMovement(env.DB, o.email, o.coins, 'binance_pay', id)
    ]);
  }
  return { ok: true, status: 'paid', coins: o.coins };
}
