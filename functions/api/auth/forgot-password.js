// POST /api/auth/forgot-password   body: { email }
//   → { ok: true }   (always — don't leak whether email exists)
//
// Generates a one-time reset token (1 hour expiry) and emails it.
// If email doesn't exist, returns ok:true silently (anti-enumeration).
// Throttled: max 1 reset email / 60s per email.

import { json, preflight, readJSON } from '../../_lib/http.js'
import { createTokenRow } from '../../_lib/tokens.js'
import { sendEmail, renderResetEmail } from '../../_lib/resend.js'
import { validate, ValidationError } from '../../_lib/validate.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const RESET_TOKEN_TTL_SEC = 60 * 60
const RATE_WINDOW_SEC = 60

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
    logger.error('forgot-password', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.RESEND_API_KEY) {
    logger.error('forgot-password', 'Email service not configured')
    return json(
      { ok: false, error: 'email_service_not_configured', detail: 'Email service is not configured' },
      503,
      allowedOrigin
    )
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const email = String(body.email || '').trim().toLowerCase()

  // Validate email format
  try {
    validate(email, 'email')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('forgot-password', 'Invalid email format')
      // Return ok:true to avoid leaking whether email exists
      return json({ ok: true }, 200, allowedOrigin)
    }
    throw e
  }

  // Look up user (anti-enumeration)
  let user
  try {
    user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(email)
      .first()
  } catch (e) {
    logger.error('forgot-password', 'User lookup failed', { error: e.message })
    // Still return ok:true to avoid leaking error details
    return json({ ok: true }, 200, allowedOrigin)
  }

  if (!user) {
    logger.debug('forgot-password', 'User not found', { email })
    // Anti-enumeration: pretend success
    return json({ ok: true }, 200, allowedOrigin)
  }

  // Rate limit: check if token was created recently
  let recent
  try {
    recent = await env.DB.prepare(
      "SELECT created_at FROM auth_tokens WHERE user_id = ? AND kind = 'password_reset' ORDER BY created_at DESC LIMIT 1"
    )
      .bind(user.id)
      .first()
  } catch (e) {
    logger.error('forgot-password', 'Rate limit check failed', { error: e.message })
    return json({ ok: true }, 200, allowedOrigin)
  }

  if (recent && recent.created_at) {
    const age = Date.now() - Date.parse(recent.created_at + 'Z')
    if (age < RATE_WINDOW_SEC * 1000) {
      logger.warn('forgot-password', 'Rate limited', { user: user.id })
      // Silent for client (don't reveal rate limit)
      return json({ ok: true }, 200, allowedOrigin)
    }
  }

  // Get profile for personalization
  let profile
  try {
    profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?')
      .bind(user.id)
      .first()
  } catch (e) {
    logger.warn('forgot-password', 'Profile lookup failed', { error: e.message })
  }

  // Create reset token
  let raw
  try {
    raw = await createTokenRow(env, user.id, 'password_reset', RESET_TOKEN_TTL_SEC)
    logger.info('forgot-password', 'Reset token created', { user: user.id })
  } catch (e) {
    logger.error('forgot-password', 'Token creation failed', { error: e.message })
    return json({ ok: true }, 200, allowedOrigin)
  }

  // Send email (non-blocking)
  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '')
  const resetUrl = `${siteOrigin}/reset.html?token=${encodeURIComponent(raw)}`

  context.waitUntil(
    sendEmail(env, {
      to: user.email,
      subject: 'TWERKHUB · Reset your password',
      html: renderResetEmail({
        resetUrl,
        username: profile && profile.username,
        expiresInMin: 60,
      }),
    })
      .then(() => {
        logger.info('forgot-password', 'Reset email sent', { user: user.id })
      })
      .catch((e) => {
        logger.error('forgot-password', 'Email send failed', { error: e.message })
      })
  )

  return json({ ok: true }, 200, allowedOrigin)
}
