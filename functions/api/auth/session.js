// GET /api/auth/session
// Returns: { ok, user: {id,email,username,...} | null }

import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
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
  if (request.method !== 'GET') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('session', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.JWT_SECRET) {
    logger.error('session', 'JWT_SECRET missing')
    return json(Errors.JWT_SECRET_MISSING.toJSON(), 500, allowedOrigin)
  }

  const payload = await authenticate(request, env)
  if (!payload || !payload.sub) {
    logger.debug('session', 'Unauthenticated request')
    return json({ ok: true, user: null }, 200, allowedOrigin)
  }

  try {
    const profile = await env.DB.prepare(
      `SELECT id, email, username, bio, avatar_url, tokens, total_earned, streak,
              last_login_date, welcomed, tier, last_active_at, registered_at,
              seconds_on_site, cuts_watched, last_seen_at
         FROM profiles WHERE id = ?`
    )
      .bind(payload.sub)
      .first()

    if (!profile) {
      logger.warn('session', 'Profile not found', { user: payload.sub })
      return json({ ok: true, user: null }, 200, allowedOrigin)
    }

    logger.debug('session', 'Session valid', { user: payload.sub })
    return json({ ok: true, user: profile }, 200, allowedOrigin)
  } catch (e) {
    logger.error('session', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }
}
