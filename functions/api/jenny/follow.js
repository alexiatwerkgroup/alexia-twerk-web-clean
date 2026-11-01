// POST /api/jenny/follow            -> subscribe the logged-in user (account email, nothing to type)
// DELETE /api/jenny/follow          -> unsubscribe the logged-in user
// GET /api/jenny/follow             -> owner only: list of subscribers
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { OWNER } from '../../_lib/jenny.js';
export async function onRequest({ request, env }) {
  const p = await authenticate(request, env);
  let me = '';
  if (p && p.sub) { const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); me = u ? String(u.email).toLowerCase() : ''; }
  if (request.method === 'GET') {
    if (me !== OWNER) return json({ ok: false, error: 'forbidden' }, 403);
    const r = await env.DB.prepare('SELECT email, created, via FROM jenny_follow ORDER BY created DESC').all();
    return json({ ok: true, count: (r.results || []).length, list: r.results || [] });
  }
  if (request.method === 'DELETE') {
    if (!me) return json({ ok: false, error: 'login_required' }, 401);
    await env.DB.prepare('DELETE FROM jenny_follow WHERE email = ?').bind(me).run();
    return json({ ok: true, following: false });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!me) return json({ ok: false, error: 'login_required' }, 401);
  const email = me;
  await env.DB.prepare('INSERT OR IGNORE INTO jenny_follow (email, via) VALUES (?, ?)').bind(email, 'account').run();
  return json({ ok: true, following: true });
}
