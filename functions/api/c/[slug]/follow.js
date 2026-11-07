// POST /api/c/<slug>/follow -> subscribe logged-in user   DELETE -> unsubscribe   GET -> owner only: list
import { authenticate } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';
import { modelOf, ensureTables, OWNER } from '../../../_lib/catalog.js';
export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!modelOf(slug)) return json({ ok: false, error: 'not_found' }, 404);
  const p = await authenticate(request, env);
  let me = '';
  if (p && p.sub) { const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); me = u ? String(u.email).toLowerCase() : ''; }
  await ensureTables(env);
  if (request.method === 'GET') {
    if (new URL(request.url).searchParams.get('mine') === '1') {
      if (!me) return json({ ok: false, error: 'login_required' }, 401);
      const row = await env.DB.prepare('SELECT 1 AS subscribed FROM catalog_follow WHERE slug = ? AND email = ?').bind(slug, me).first();
      return json({ ok: true, following: !!row });
    }
    if (me !== OWNER) return json({ ok: false, error: 'forbidden' }, 403);
    const r = await env.DB.prepare('SELECT email, created, via FROM catalog_follow WHERE slug = ? ORDER BY created DESC').bind(slug).all();
    return json({ ok: true, count: (r.results || []).length, list: r.results || [] });
  }
  if (request.method === 'DELETE') {
    if (!me) return json({ ok: false, error: 'login_required' }, 401);
    await env.DB.prepare('DELETE FROM catalog_follow WHERE slug = ? AND email = ?').bind(slug, me).run();
    return json({ ok: true, following: false });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!me) return json({ ok: false, error: 'login_required' }, 401);
  await env.DB.prepare("INSERT OR IGNORE INTO catalog_follow (slug, email, via) VALUES (?, ?, 'account')").bind(slug, me).run();
  return json({ ok: true, following: true });
}
