// Concurso "cazador" (Novinhas). Participan usuarios registrados que marcan "quiero participar".
//  GET            -> {auth, joined}
//  POST {join}    -> guarda/quita la participacion del usuario logueado (con su email, para contactarlo si resulta elegido)
//  GET ?list=1    -> (dueño) lista de participantes {email, username, ts}
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_hunt (uid TEXT PRIMARY KEY, email TEXT, username TEXT, joined INTEGER DEFAULT 1, ts INTEGER)').run();
}
async function me(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return null;
    const u = await env.DB.prepare('SELECT email, username FROM profiles WHERE id = ?').bind(p.sub).first();
    return u ? { uid: String(p.sub), email: String(u.email || ''), username: String(u.username || '') } : null;
  } catch (e) { return null; }
}
export async function onRequest({ request, env }) {
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  await ensure(env.DB);
  const url = new URL(request.url), u = await me(request, env);
  if (request.method === 'GET') {
    if (url.searchParams.get('list')) {
      if (!u || u.email.toLowerCase() !== OWNER) return J({ error: 'forbidden' }, 403);
      const r = await env.DB.prepare('SELECT email, username, ts FROM nv_hunt WHERE joined = 1 ORDER BY ts').all();
      return J({ ok: true, count: (r.results || []).length, list: r.results || [] });
    }
    if (!u) return J({ auth: false, joined: false });
    const row = await env.DB.prepare('SELECT joined FROM nv_hunt WHERE uid = ?').bind(u.uid).first();
    return J({ auth: true, joined: !!(row && row.joined) });
  }
  if (request.method !== 'POST') return J({ error: 'method' }, 405);
  if (!u) return J({ error: 'login' }, 401);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const join = b.join ? 1 : 0;
  await env.DB.prepare('INSERT INTO nv_hunt (uid, email, username, joined, ts) VALUES (?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET joined = excluded.joined, email = excluded.email, username = excluded.username, ts = CASE WHEN excluded.joined = 1 THEN excluded.ts ELSE nv_hunt.ts END')
    .bind(u.uid, u.email, u.username, join, Date.now()).run();
  return J({ ok: true, joined: !!join });
}
