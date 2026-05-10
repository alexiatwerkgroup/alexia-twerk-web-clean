// DELETE /api/comments/[id]   (auth required)
//   → { ok }
//
// Owner-only delete. Hard delete (no soft-delete).

import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com'

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
  'http://localhost:8788',
  'http://localhost:3000',
]

export async function onRequest(context) {
  const { request, env, params } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'DELETE') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('comments.DELETE', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const me = await authenticate(request, env)
  if (!me || !me.sub) {
    logger.warn('comments.DELETE', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const commentId = (params && params.id) ? String(params.id) : ''
  if (!commentId) {
    logger.warn('comments.DELETE', 'Missing comment ID', { user: me.sub })
    return json(Errors.MISSING_FIELD('id').toJSON(), 400, allowedOrigin)
  }

  // Get comment
  let row
  try {
    row = await env.DB.prepare('SELECT user_id FROM video_comments WHERE id = ?')
      .bind(commentId)
      .first()
  } catch (e) {
    logger.error('comments.DELETE', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!row) {
    logger.warn('comments.DELETE', 'Comment not found', { id: commentId, user: me.sub })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  // Authorization check
  const isAdmin = me.email && String(me.email).toLowerCase() === OWNER_EMAIL
  if (row.user_id !== me.sub && !isAdmin) {
    logger.warn('comments.DELETE', 'Forbidden', { id: commentId, user: me.sub })
    return json(Errors.FORBIDDEN.toJSON(), 403, allowedOrigin)
  }

  // Delete comment
  try {
    await env.DB.prepare('DELETE FROM video_comments WHERE id = ?')
      .bind(commentId)
      .run()
    logger.info('comments.DELETE', 'Comment deleted', { id: commentId, user: me.sub })
  } catch (e) {
    logger.error('comments.DELETE', 'Delete failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json({ ok: true }, 200, allowedOrigin)
}
