// Owner only. GET lista · POST {label,days} crea · POST {code,days} renueva · DELETE ?code= revoca
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { ensureCodes } from '../../_lib/vip.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function owner(request, env) {
  const p = await authenticate(request, env); if (!p || !p.sub) return false;
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  return !!u && String(u.email).toLowerCase() === OWNER;
}
const WORDS = ['safada', 'gostosa', 'danca', 'funk', 'baile', 'linda', 'musa', 'rebola', 'fogo', 'doce'];
function gen() {
  const a = new Uint32Array(2); crypto.getRandomValues(a);
  return WORDS[a[0] % WORDS.length] + '-' + (1000 + (a[1] % 9000));
}
export async function onRequest({ request, env }) {
  if (!(await owner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
  await ensureCodes(env.DB);
  const now = Math.floor(Date.now() / 1000), url = new URL(request.url);
  if (request.method === 'GET') {
    const r = (await env.DB.prepare('SELECT code, label, exp, created, uses, revoked FROM nv_codes ORDER BY created DESC LIMIT 1000').all()).results || [];
    return J({ ok: true, now, codes: r });
  }
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    const days = Math.max(1, Math.min(400, parseInt(b.days) || 30));
    if (b.code) {
      const c = String(b.code).toLowerCase();
      const r = await env.DB.prepare('SELECT exp FROM nv_codes WHERE code = ?').bind(c).first(); if (!r) return J({ ok: false, error: 'not_found' }, 404);
      const exp = Math.max(r.exp, now) + days * 86400;
      await env.DB.prepare('UPDATE nv_codes SET exp = ?, revoked = 0 WHERE code = ?').bind(exp, c).run();
      return J({ ok: true, code: c, exp });
    }
    const label = String(b.label || '').slice(0, 80);
    for (let i = 0; i < 5; i++) {
      const code = gen();
      try { await env.DB.prepare('INSERT INTO nv_codes (code,label,exp,created) VALUES (?,?,?,?)').bind(code, label, now + days * 86400, now).run(); return J({ ok: true, code, exp: now + days * 86400 }); } catch (e) {}
    }
    return J({ ok: false, error: 'gen_failed' }, 500);
  }
  if (request.method === 'DELETE') {
    await env.DB.prepare('UPDATE nv_codes SET revoked = 1 WHERE code = ?').bind(String(url.searchParams.get('code') || '').toLowerCase()).run();
    return J({ ok: true });
  }
  return J({ ok: false }, 405);
}
