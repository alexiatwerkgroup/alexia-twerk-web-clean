// POST /api/tokens/claim-daily   (auth required)
// Returns: { ok, granted, balance, streak, tier }
//
// Idempotent per UTC day.
// Daily base = 50 tokens. Streak bonus = streak * 5 (capped at 50).

import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'
import { computeTier } from '../../_lib/tier.js'

const DAILY_BASE = 50
const STREAK_BONUS_PER_DAY = 5
const STREAK_BONUS_CAP = 50

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
  'http://localhost:8788',
  'http://localhost:3000',
]

function utcDate() {
  return new Date().toISOString().slice(0, 10)
}
function yesterdayUtcDate() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'POST') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('tokens.claim-daily', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const payload = await authenticate(request, env)
  if (!payload || !payload.sub) {
    logger.warn('tokens.claim-daily', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const today = utcDate()
  const yesterday = yesterdayUtcDate()

  let profile
  try {
    profile = await env.DB.prepare(
      'SELECT tokens, total_earned, streak, last_login_date FROM profiles WHERE id = ?'
    )
      .bind(payload.sub)
      .first()
  } catch (e) {
    logger.error('tokens.claim-daily', 'Profile lookup failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!profile) {
    logger.warn('tokens.claim-daily', 'Profile not found', { user: payload.sub })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  // Already claimed today
  if (profile.last_login_date === today) {
    logger.debug('tokens.claim-daily', 'Already claimed today', { user: payload.sub })
    return json(
      {
        ok: true,
        granted: 0,
        balance: profile.tokens,
        streak: profile.streak,
        tier: computeTier(profile.tokens),
        already_claimed: true,
      },
      200,
      allowedOrigin
    )
  }

  // Calculate streak and bonus
  const newStreak = profile.last_login_date === yesterday ? (profile.streak || 0) + 1 : 1
  const streakBonus = Math.min(newStreak * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP)
  const granted = DAILY_BASE + streakBonus
  const newBalance = (profile.tokens || 0) + granted
  const newTotal = (profile.total_earned || 0) + granted
  const newTier = computeTier(newBalance)

  try {
    await env.DB.prepare(
      `UPDATE profiles
          SET tokens = ?, total_earned = ?, streak = ?, last_login_date = ?,
              tier = ?, last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
      .bind(newBalance, newTotal, newStreak, today, newTier, payload.sub)
      .run()
    logger.info('tokens.claim-daily', 'Daily claim granted', { user: payload.sub, granted, streak: newStreak })
  } catch (e) {
    logger.error('tokens.claim-daily', 'Update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json(
    {
      ok: true,
      granted,
      balance: newBalance,
      streak: newStreak,
      tier: newTier,
      already_claimed: false,
    },
    200,
    allowedOrigin
  )
}
