// Webhook de Binance Pay: avisa que hay novedades de una orden; la verificacion real se hace consultando a Binance (settle).
import { settle, configured } from '../../_lib/binancepay.js';
const OK = () => new Response(JSON.stringify({ returnCode: 'SUCCESS', returnMessage: null }), { headers: { 'content-type': 'application/json' } });
export async function onRequestPost({ request, env }) {
  if (!env.DB || !configured(env)) return OK();
  let b = {}; try { b = await request.json(); } catch (_) {}
  let d = {}; try { d = typeof b.data === 'string' ? JSON.parse(b.data) : (b.data || {}); } catch (_) {}
  const id = String(d.merchantTradeNo || '').replace(/[^0-9a-zA-Z]/g, '').slice(0, 32);
  if (id) await settle(env, id).catch(() => {});
  return OK();
}
