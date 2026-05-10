// POST /api/tokens/grant   (auth required)
// Body: { amount: 1..1000, reason?: string }
// Returns: { ok, granted, balance, tier }

import { authenticate } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'
import { clamp } from '../../_lib/validate.js'
import { computeTier } from '../../_lib/tier.js'

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
    logger.error('tokens.grant', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  // Authenticate
  const payload = await authenticate(request, env)
  if (!payload || !payload.sub) {
    logger.warn('tokens.grant', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  // Validate and clamp amount
  let amount = parseInt(body.amount, 10)
  if (isNaN(amount)) {
    logger.warn('tokens.grant', 'Invalid amount', { user: payload.sub, amount: body.amount })
    return json(Errors.INVALID_INPUT.toJSON(), 400, allowedOrigin)
  }

  amount = clamp(amount, 1, 1000)
  const reason = String(body.reason || '').slice(0, 64)

  // Fetch profile
  let profile
  try {
    profile = await env.DB.prepare('SELECT tokens, total_earned FROM profiles WHERE id = ?')
      .bind(payload.sub)
      .first()
  } catch (e) {
    logger.error('tokens.grant', 'Profile lookup failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!profile) {
    logger.warn('tokens.grant', 'Profile not found', { user: payload.sub })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  const newBalance = (profile.tokens || 0) + amount
  const newTotal = (profile.total_earned || 0) + amount
  const newTier = computeTier(newBalance)

  // Update profile
  try {
    await env.DB.prepare(
      `UPDATE profiles
         SET tokens = ?, total_earned = ?, tier = ?,
             last_active_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(newBalance, newTotal, newTier, payload.sub)
      .run()
    logger.info('tokens.grant', 'Tokens granted', {
      user: payload.sub,
      amount,
      newBalance,
      reason,
    })
  } catch (e) {
    logger.error('tokens.grant', 'Update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json(
    { ok: true, granted: amount, balance: newBalance, tier: newTier, reason },
    200,
    allowedOrigin
  )
}
