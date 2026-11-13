// Helpers del acceso VIP de Novinhas. La config vive en el bucket R2 (NOVINHAS_VIDEOS), no en variables de entorno.
const mem = {};
async function cached(env, key) {
  const m = mem[key]; if (m && Date.now() - m.t < 60000) return m.v;
  const o = await env.NOVINHAS_VIDEOS.get(key); const v = o ? await o.json().catch(() => null) : null;
  mem[key] = { t: Date.now(), v }; return v;
}
export const vipCfg = (env) => cached(env, '_config/vip.json');
export const codesCfg = (env) => cached(env, '_config/codes.json');
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function sha256hex(s) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
export async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
function same(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
export async function isVip(request, env) {
  const m = /(?:^|;\s*)twk_vip=([0-9]+)\.([0-9a-f]{64})/.exec(request.headers.get('Cookie') || ''); if (!m) return false;
  if (+m[1] < Date.now() / 1000) return false;
  const cc = await codesCfg(env); if (!cc || !cc.key) return false;
  return same(m[2], await hmac(cc.key, 'vip.' + (cc.epoch || 1) + '.' + m[1]));
}
export async function cookieFor(env, expSec) {
  const cc = await codesCfg(env); const now = Math.floor(Date.now() / 1000);
  const exp = expSec ? Math.min(expSec, now + 400 * 86400) : now + 30 * 86400;
  return `twk_vip=${exp}.${await hmac(cc.key, 'vip.' + (cc.epoch || 1) + '.' + exp)}; Path=/; Max-Age=${Math.max(60, exp - now)}; HttpOnly; Secure; SameSite=Lax`;
}
// Codigos individuales (uno por suscriptor) guardados en D1. Vencen solos.
export async function ensureCodes(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_codes (code TEXT PRIMARY KEY, label TEXT, exp INTEGER, created INTEGER, uses INTEGER DEFAULT 0, revoked INTEGER DEFAULT 0)').run();
}
// Un video esta bloqueado si el canal es VIP y el id no esta en la lista de libres.
export function isLocked(cfg, slug, id) {
  const c = cfg && cfg.channels && cfg.channels[slug]; return !!(c && c.vip && !(c.free || []).includes(Number(id)));
}
