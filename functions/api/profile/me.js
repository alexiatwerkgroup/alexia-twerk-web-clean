// GET  /api/profile/me  → { ok, profile }     (auth required)
// POST /api/profile/me  body: { username?, bio?, avatar_url? }

import { authenticate } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { validate, ValidationError } from '../../_lib/validate.js'
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
  if (!env.DB) {
    logger.error('profile.me', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.JWT_SECRET) {
    logger.error('profile.me', 'JWT_SECRET missing')
    return json(Errors.JWT_SECRET_MISSING.toJSON(), 500, allowedOrigin)
  }

  const payload = await authenticate(request, env)
  if (!payload || !payload.sub) {
    logger.warn('profile.me', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  // ─── GET ─────────────────────────────────────────────────────────────
  if (request.method === 'GET') {
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
        logger.warn('profile.me GET', 'Profile not found', { user: payload.sub })
        return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
      }

      logger.info('profile.me GET', 'Profile retrieved', { user: payload.sub })
      return json({ ok: true, profile }, 200, allowedOrigin)
    } catch (e) {
      logger.error('profile.me GET', 'Query failed', { error: e.message })
      return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
    }
  }

  // ─── POST (update) ───────────────────────────────────────────────────
  if (request.method !== 'POST') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const updates = []
  const binds = []

  // Update username
  if (body.username !== undefined) {
    const u = String(body.username || '').trim()
    if (u) {
      try {
        validate(u, 'username')
      } catch (e) {
        if (e instanceof ValidationError) {
          logger.warn('profile.me POST', 'Invalid username', { user: payload.sub })
          return json(
            { ok: false, error: e.code, detail: e.detail },
            400,
            allowedOrigin
          )
        }
        throw e
      }

      // Check uniqueness
      try {
        const taken = await env.DB.prepare(
          'SELECT id FROM profiles WHERE LOWER(username) = LOWER(?) AND id != ?'
        )
          .bind(u, payload.sub)
          .first()
        if (taken) {
          logger.warn('profile.me POST', 'Username taken', { user: payload.sub, username: u })
          return json(Errors.USERNAME_TAKEN.toJSON(), 409, allowedOrigin)
        }
      } catch (e) {
        logger.error('profile.me POST', 'Username check failed', { error: e.message })
        return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
      }
    }
    updates.push('username = ?')
    binds.push(u || null)
  }

  // Update bio
  if (body.bio !== undefined) {
    const b = String(body.bio || '').slice(0, 500)
    updates.push('bio = ?')
    binds.push(b || null)
  }

  // Update avatar_url
  if (body.avatar_url !== undefined) {
    const a = String(body.avatar_url || '').slice(0, 200000)
    if (a && !/^(data:image\/(png|jpeg|jpg|webp);base64,|https?:\/\/)/i.test(a)) {
      logger.warn('profile.me POST', 'Invalid avatar format', { user: payload.sub })
      return json(Errors.INVALID_INPUT.toJSON(), 400, allowedOrigin)
    }
    updates.push('avatar_url = ?')
    binds.push(a || null)
  }

  if (!updates.length) {
    logger.warn('profile.me POST', 'Nothing to update', { user: payload.sub })
    return json(
      { ok: false, error: 'nothing_to_update', detail: 'No fields provided' },
      400,
      allowedOrigin
    )
  }

  updates.push('last_active_at = CURRENT_TIMESTAMP')
  binds.push(payload.sub)

  try {
    await env.DB.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...binds)
      .run()
    logger.info('profile.me POST', 'Profile updated', { user: payload.sub })
  } catch (e) {
    logger.error('profile.me POST', 'Update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Fetch updated profile
  try {
    const profile = await env.DB.prepare(
      `SELECT id, email, username, bio, avatar_url, tokens, total_earned, streak,
              tier, last_active_at, registered_at, seconds_on_site, cuts_watched
         FROM profiles WHERE id = ?`
    )
      .bind(payload.sub)
      .first()

    return json({ ok: true, profile }, 200, allowedOrigin)
  } catch (e) {
    logger.error('profile.me POST', 'Fetch updated profile failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }
}
