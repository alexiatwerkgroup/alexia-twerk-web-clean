// GET  /api/jenny/promo           -> public status { active, ends_at, cost, min }
// POST /api/jenny/promo {hours}   -> owner only: start gift prices (default 24 h)
// DELETE /api/jenny/promo         -> owner only: stop now
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { promoState, OWNER } from '../../_lib/jenny.js';

export async function onRequest({ request, env }) {
  if (request.method === 'GET') return json({ ok: true, ...(await promoState(env)) });
  const au = await authenticate(request, env).catch(() => null);
  const me = au && au.sub ? await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(au.sub).first() : null;
  if (!me || String(me.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'forbidden' }, 403);
  await promoState(env);
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch {}
    const h = Math.min(72, Math.max(1, Number(b.hours) || 24)), now = Date.now();
    await env.DB.prepare('INSERT INTO jenny_promo (id, ends_at, started_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET ends_at = excluded.ends_at, started_at = excluded.started_at').bind(now + h * 3600000, now).run();
    return json({ ok: true, ...(await promoState(env)) });
  }
  if (request.method === 'DELETE') { await env.DB.prepare('UPDATE jenny_promo SET ends_at = 0 WHERE id = 1').run(); return json({ ok: true, active: false }); }
  return json({ ok: false, error: 'method' }, 405);
}
