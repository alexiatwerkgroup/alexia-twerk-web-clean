import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com'
const ALLOWED_ORIGINS = ['https://alexiatwerkgroup.com', 'https://www.alexiatwerkgroup.com', 'http://localhost:8788', 'http://localhost:3000']

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'GET') return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  if (!env.DB) {
    logger.error('admin.full-stats', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const me = await authenticate(request, env)
  if (!me || !me.sub) {
    logger.warn('admin.full-stats', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const isAdmin = me.email && String(me.email).toLowerCase() === OWNER_EMAIL
  if (!isAdmin) {
    logger.warn('admin.full-stats', 'Unauthorized admin access', { user: me.sub, email: me.email })
    return json(Errors.FORBIDDEN.toJSON(), 403, allowedOrigin)
  }

  try {
    const stats = {}
    const userCount = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first()
    stats.total_users = userCount?.n || 0
    const commentCount = await env.DB.prepare('SELECT COUNT(*) as n FROM video_comments').first()
    stats.total_comments = commentCount?.n || 0
    const subscriberCount = await env.DB.prepare('SELECT COUNT(*) as n FROM subscribers').first()
    stats.total_subscribers = subscriberCount?.n || 0
    const reportCount = await env.DB.prepare('SELECT COUNT(*) as n FROM comment_reports').first()
    stats.pending_reports = reportCount?.n || 0
    const tokens = await env.DB.prepare('SELECT SUM(tokens) as total FROM profiles').first()
    stats.total_tokens_issued = tokens?.total || 0

    logger.info('admin.full-stats', 'Stats retrieved', { user: me.sub })
    return json({ ok: true, stats }, 200, allowedOrigin)
  } catch (e) {
    logger.error('admin.full-stats', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }
}
