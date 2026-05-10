// POST /api/comments/report   body: { comment_id, reason? }
//   → { ok }
//
// Files a moderation report for a comment.

import { authenticate } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
  'http://localhost:8788',
  'http://localhost:3000',
]

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'POST') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('comments.report', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const me = await authenticate(request, env)
  if (!me || !me.sub) {
    logger.warn('comments.report', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const commentId = String(body.comment_id || '').trim()
  const reason = String(body.reason || '').slice(0, 500)

  if (!commentId) {
    logger.warn('comments.report', 'Missing comment ID', { user: me.sub })
    return json(Errors.MISSING_FIELD('comment_id').toJSON(), 400, allowedOrigin)
  }

  // Verify comment exists
  let row
  try {
    row = await env.DB.prepare('SELECT page_slug, user_id FROM video_comments WHERE id = ?')
      .bind(commentId)
      .first()
  } catch (e) {
    logger.error('comments.report', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!row) {
    logger.warn('comments.report', 'Comment not found', { id: commentId, user: me.sub })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  // Create report
  try {
    await env.DB.prepare(
      `INSERT INTO comment_reports (comment_id, page_slug, reason, reporter_user_id, reported_user_id)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(commentId, row.page_slug || null, reason || null, me.sub, row.user_id || null)
      .run()
    logger.info('comments.report', 'Comment reported', { id: commentId, reporter: me.sub, reported: row.user_id })
  } catch (e) {
    logger.error('comments.report', 'Insert failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json({ ok: true }, 200, allowedOrigin)
}
