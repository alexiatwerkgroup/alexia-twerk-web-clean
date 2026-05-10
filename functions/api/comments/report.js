// POST /api/comments/report   body: { comment_id, reason? }   (auth required)
//   → { ok }
//
// Files a moderation report. Used by community-page.js's "Report" button.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const me = await authenticate(request, env);
  if (!me || !me.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const commentId = String(body.comment_id || '');
  const reason = String(body.reason || '').slice(0, 500);
  if (!commentId) return json({ ok: false, error: 'missing_comment_id' }, 400, origin);

  const row = await env.DB.prepare(
    'SELECT page_slug, user_id FROM video_comments WHERE id = ?'
  )
    .bind(commentId)
    .first();
  if (!row) return json({ ok: false, error: 'comment_not_found' }, 404, origin);

  try {
    await env.DB.prepare(
      `INSERT INTO comment_reports (comment_id, page_slug, reason, reporter_user_id, reported_user_id)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(commentId, row.page_slug || null, reason || null, me.sub, row.user_id || null)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
}
