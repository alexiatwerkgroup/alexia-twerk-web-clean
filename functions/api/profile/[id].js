// GET /api/profile/[id]   — public profile read by user ID OR username.
// No auth required (profiles are public). Email is NOT returned to non-owners.

import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  if (request.method !== 'GET') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('profile.GET', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const idOrUsername = (params && params.id) ? String(params.id).trim() : ''
  if (!idOrUsername) {
    logger.warn('profile.GET', 'Missing ID')
    return json(Errors.MISSING_FIELD('id').toJSON(), 400, allowedOrigin)
  }

  const isUuid = UUID_RE.test(idOrUsername)
  const sql = isUuid
    ? `SELECT id, username, bio, avatar_url, tokens, total_earned, streak,
              tier, registered_at, seconds_on_site, cuts_watched, last_seen_at
         FROM profiles WHERE id = ?`
    : `SELECT id, username, bio, avatar_url, tokens, total_earned, streak,
              tier, registered_at, seconds_on_site, cuts_watched, last_seen_at
         FROM profiles WHERE LOWER(username) = LOWER(?)`

  let row
  try {
    row = await env.DB.prepare(sql).bind(idOrUsername).first()
  } catch (e) {
    logger.error('profile.GET', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!row) {
    logger.debug('profile.GET', 'Profile not found', { lookup: idOrUsername })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  // Check if requester is the profile owner
  let isOwner = false
  try {
    const me = await authenticate(request, env)
    if (me && me.sub === row.id) {
      isOwner = true
    }
  } catch (e) {
    logger.debug('profile.GET', 'Auth check failed', { error: e.message })
  }

  if (isOwner) {
    try {
      const ownerRow = await env.DB.prepare('SELECT email, last_login_date, welcomed FROM profiles WHERE id = ?')
        .bind(row.id)
        .first()
      logger.debug('profile.GET', 'Owner profile returned', { id: row.id })
      return json({ ok: true, profile: { ...row, ...ownerRow, isOwner: true } }, 200, allowedOrigin)
    } catch (e) {
      logger.error('profile.GET', 'Owner data lookup failed', { error: e.message })
    }
  }

  logger.debug('profile.GET', 'Public profile returned', { id: row.id })
  return json({ ok: true, profile: row }, 200, allowedOrigin)
}
