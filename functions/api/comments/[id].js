// DELETE /api/comments/[id]   (auth required)
//   → { ok }
//
// Owner-only delete. Hard delete (no soft-delete column in schema).

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'DELETE') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const me = await authenticate(request, env);
  if (!me || !me.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const commentId = (params && params.id) ? String(params.id) : '';
  if (!commentId) return json({ ok: false, error: 'missing_id' }, 400, origin);

  const row = await env.DB.prepare('SELECT user_id FROM video_comments WHERE id = ?')
    .bind(commentId)
    .first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404, origin);

  // Owner of the comment OR site admin (Anti) can delete
  const isAdmin = me.email && String(me.email).toLowerCase() === OWNER_EMAIL;
  if (row.user_id !== me.sub && !isAdmin) {
    return json({ ok: false, error: 'forbidden' }, 403, origin);
  }

  try {
    await env.DB.prepare('DELETE FROM video_comments WHERE id = ?').bind(commentId).run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
}
