// Helpers del acceso VIP de Novinhas. La config vive en el bucket R2 (NOVINHAS_VIDEOS), no en variables de entorno.
import { authenticate } from './auth.js';
import { OWNER } from './analytics.js';
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
const rev = {};
async function codeOk(env, cid) {
  const m = rev[cid]; if (m && Date.now() - m.t < 30000) return m.v;
  let v = false;
  try { const r = await env.DB.prepare('SELECT revoked, exp FROM nv_codes WHERE cid = ?').bind(cid).first(); v = !!r && !r.revoked && r.exp > Date.now() / 1000; } catch (e) { v = true; }
  rev[cid] = { t: Date.now(), v }; return v;
}
// El dueño del sitio (sesion iniciada con su cuenta) ve todo, sin codigo.
async function isOwner(request, env) {
  try {
    if (!/twk_jwt=/.test(request.headers.get('Cookie') || '') && !request.headers.get('Authorization')) return false;
    const p = await authenticate(request, env); if (!p || !p.sub) return false;
    const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
    return !!u && String(u.email).toLowerCase() === OWNER;
  } catch (e) { return false; }
}
export async function isVip(request, env) {
  if (await isOwner(request, env)) return true;
  const m = /(?:^|;\s*)twk_vip=([0-9]+)\.(?:([0-9a-f]{12})\.)?([0-9a-f]{64})/.exec(request.headers.get('Cookie') || ''); if (!m) return false;
  if (+m[1] < Date.now() / 1000) return false;
  const cc = await codesCfg(env); if (!cc || !cc.key) return false;
  const cid = m[2] || '';
  if (!same(m[3], await hmac(cc.key, 'vip.' + (cc.epoch || 1) + '.' + m[1] + (cid ? '.' + cid : '')))) return false;
  return cid ? await codeOk(env, cid) : true;
}
export async function cookieFor(env, expSec, cid) {
  const cc = await codesCfg(env); const now = Math.floor(Date.now() / 1000);
  const exp = expSec ? Math.min(expSec, now + 400 * 86400) : now + 30 * 86400;
  const sig = await hmac(cc.key, 'vip.' + (cc.epoch || 1) + '.' + exp + (cid ? '.' + cid : ''));
  return `twk_vip=${exp}.${cid ? cid + '.' : ''}${sig}; Path=/; Max-Age=${Math.max(60, exp - now)}; HttpOnly; Secure; SameSite=Lax`;
}
export async function ensureCodes(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_codes (code TEXT PRIMARY KEY, label TEXT, exp INTEGER, created INTEGER, uses INTEGER DEFAULT 0, revoked INTEGER DEFAULT 0, cid TEXT, note TEXT)').run();
  try { await db.prepare('ALTER TABLE nv_codes ADD COLUMN cid TEXT').run(); } catch (e) {}
  try { await db.prepare('ALTER TABLE nv_codes ADD COLUMN note TEXT').run(); } catch (e) {}
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_acts (code TEXT, dev TEXT, ip TEXT, ua TEXT, ts INTEGER, ok INTEGER)').run();
}
// Un video esta bloqueado si el canal es VIP y el id no esta en la lista de libres.
export function isLocked(cfg, slug, id) {
  const c = cfg && cfg.channels && cfg.channels[slug]; return !!(c && c.vip && !(c.free || []).includes(Number(id)));
}
