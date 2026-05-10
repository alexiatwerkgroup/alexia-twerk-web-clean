// POST /api/session/bump   (auth required)
// Body: { seconds_delta: 0..60, cuts_delta: 0..5 }
// Returns: { ok, seconds_on_site, cuts_watched, last_seen_at }
//
// Heartbeat tracker. Server clamps deltas to prevent spoofing.

import { authenticate } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'
import { clamp } from '../../_lib/validate.js'

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
    logger.error('session.bump', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const payload = await authenticate(request, env)
  if (!payload || !payload.sub) {
    logger.warn('session.bump', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  // Clamp values to prevent spoofing
  const secs = clamp(parseInt(body.seconds_delta, 10) || 0, 0, 60)
  const cuts = clamp(parseInt(body.cuts_delta, 10) || 0, 0, 5)

  // No-op: still bump last_seen_at for admin visibility
  if (secs === 0 && cuts === 0) {
    try {
      await env.DB.prepare('UPDATE profiles SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(payload.sub)
        .run()
      logger.debug('session.bump', 'Heartbeat (no-op)', { user: payload.sub })
    } catch (e) {
      logger.error('session.bump', 'Heartbeat update failed', { error: e.message })
    }
    return json({ ok: true, granted: 0 }, 200, allowedOrigin)
  }

  try {
    await env.DB.prepare(
      `UPDATE profiles
         SET seconds_on_site = COALESCE(seconds_on_site,0) + ?,
             cuts_watched    = COALESCE(cuts_watched,0)   + ?,
             last_seen_at    = CURRENT_TIMESTAMP,
             last_active_at  = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(secs, cuts, payload.sub)
      .run()
    logger.debug('session.bump', 'Session bumped', { user: payload.sub, seconds: secs, cuts })
  } catch (e) {
    logger.error('session.bump', 'Update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Return updated stats
  try {
    const row = await env.DB.prepare(
      'SELECT seconds_on_site, cuts_watched, last_seen_at FROM profiles WHERE id = ?'
    )
      .bind(payload.sub)
      .first()

    return json({ ok: true, ...row }, 200, allowedOrigin)
  } catch (e) {
    logger.error('session.bump', 'Stats fetch failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }
}
