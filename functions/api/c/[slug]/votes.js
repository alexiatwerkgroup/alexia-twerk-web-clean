// GET /api/c/<slug>/votes -> { counts, mine, login }   POST {n, v} (v: 1 like | -1 dislike | 0 clear). Login required.
import { authenticate } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';
import { modelOf, validN, ensureTables } from '../../../_lib/catalog.js';
export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!modelOf(slug)) return json({ ok: false, error: 'not_found' }, 404);
  const p = await authenticate(request, env);
  const uid = p && p.sub ? String(p.sub) : '';
  await ensureTables(env);
  if (request.method === 'GET') {
    const r = await env.DB.prepare('SELECT n, SUM(v=1) up, SUM(v=-1) down FROM catalog_votes WHERE slug = ? GROUP BY n').bind(slug).all();
    const counts = {}; (r.results || []).forEach(x => { counts[x.n] = { up: x.up || 0, down: x.down || 0 }; });
    let mine = {};
    if (uid) { const m = await env.DB.prepare('SELECT n, v FROM catalog_votes WHERE slug = ? AND user_id = ?').bind(slug, uid).all(); (m.results || []).forEach(x => { mine[x.n] = x.v; }); }
    return json({ ok: true, counts, mine, login: !!uid });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!uid) return json({ ok: false, error: 'login_required' }, 401);
  let b = {}; try { b = await request.json(); } catch {}
  const n = String(b.n || ''); const v = parseInt(b.v, 10);
  if (!validN(n) || ![1, -1, 0].includes(v)) return json({ ok: false, error: 'bad_request' }, 400);
  if (v === 0) await env.DB.prepare('DELETE FROM catalog_votes WHERE slug = ? AND user_id = ? AND n = ?').bind(slug, uid, n).run();
  else await env.DB.prepare("INSERT INTO catalog_votes (slug, user_id, n, v) VALUES (?, ?, ?, ?) ON CONFLICT(slug, user_id, n) DO UPDATE SET v = excluded.v, ts = strftime('%s','now')").bind(slug, uid, n, v).run();
  const c = await env.DB.prepare('SELECT SUM(v=1) up, SUM(v=-1) down FROM catalog_votes WHERE slug = ? AND n = ?').bind(slug, n).first();
  return json({ ok: true, n, mine: v, up: (c && c.up) || 0, down: (c && c.down) || 0 });
}
