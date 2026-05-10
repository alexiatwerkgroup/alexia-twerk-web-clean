// POST /api/tokens/claim-welcome   (auth required)
// One-time +200 welcome bonus on first login.

import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'
import { computeTier } from '../../_lib/tier.js'

const WELCOME_BONUS = 200

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
    logger.error('tokens.claim-welcome', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const payload = await authenticate(request, env)
  if (!payload || !payload.sub) {
    logger.warn('tokens.claim-welcome', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  let profile
  try {
    profile = await env.DB.prepare('SELECT tokens, total_earned, welcomed FROM profiles WHERE id = ?')
      .bind(payload.sub)
      .first()
  } catch (e) {
    logger.error('tokens.claim-welcome', 'Profile lookup failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!profile) {
    logger.warn('tokens.claim-welcome', 'Profile not found', { user: payload.sub })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  // Already welcomed
  if (profile.welcomed) {
    logger.debug('tokens.claim-welcome', 'Already welcomed', { user: payload.sub })
    return json(
      {
        ok: true,
        granted: 0,
        balance: profile.tokens,
        tier: computeTier(profile.tokens),
        already_welcomed: true,
      },
      200,
      allowedOrigin
    )
  }

  const newBalance = (profile.tokens || 0) + WELCOME_BONUS
  const newTotal = (profile.total_earned || 0) + WELCOME_BONUS
  const newTier = computeTier(newBalance)

  try {
    await env.DB.prepare(
      `UPDATE profiles
          SET tokens = ?, total_earned = ?, welcomed = 1, tier = ?,
              last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
      .bind(newBalance, newTotal, newTier, payload.sub)
      .run()
    logger.info('tokens.claim-welcome', 'Welcome bonus granted', { user: payload.sub })
  } catch (e) {
    logger.error('tokens.claim-welcome', 'Update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json(
    {
      ok: true,
      granted: WELCOME_BONUS,
      balance: newBalance,
      tier: newTier,
      already_welcomed: false,
    },
    200,
    allowedOrigin
  )
}
