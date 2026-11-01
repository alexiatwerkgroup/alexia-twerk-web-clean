// Owner-only. GET /api/jenny/grant -> list; POST {email} -> grant; DELETE {email} -> revoke.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
const OWNER = 'alexiatwerkoficial@gmail.com';
export async function onRequest({ request, env }) {
  const me = await authenticate(request, env);
  if (!me || String(me.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'forbidden' }, 403);
  if (request.method === 'GET') {
    const r = await env.DB.prepare('SELECT email, granted_at FROM jenny_access ORDER BY granted_at DESC').all();
    return json({ ok: true, list: r.results || [] });
  }
  let b = {}; try { b = await request.json(); } catch {}
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);
  if (request.method === 'POST') { await env.DB.prepare('INSERT OR IGNORE INTO jenny_access (email) VALUES (?)').bind(email).run(); return json({ ok: true }); }
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM jenny_access WHERE email = ?').bind(email).run(); return json({ ok: true }); }
  return json({ ok: false, error: 'method' }, 405);
}
