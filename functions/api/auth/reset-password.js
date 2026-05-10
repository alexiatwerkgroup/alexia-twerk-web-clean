// POST /api/auth/reset-password   body: { token, new_password }
//   → { ok, user, token: <jwt> } + Set-Cookie  (auto-signs them in)

import { hashPassword, signJWT } from '../../_lib/auth.js'
import { json, preflight, readJSON, setSessionCookie } from '../../_lib/http.js'
import { consumeToken } from '../../_lib/tokens.js'
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
  if (request.method !== 'POST') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('reset-password', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.JWT_SECRET) {
    logger.error('reset-password', 'JWT_SECRET missing')
    return json(Errors.JWT_SECRET_MISSING.toJSON(), 500, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const token = String(body.token || '').trim()
  const newPassword = String(body.new_password || '')

  if (!token) {
    logger.warn('reset-password', 'Missing token')
    return json(Errors.MISSING_FIELD('token').toJSON(), 400, allowedOrigin)
  }

  // Validate password
  try {
    validate(newPassword, 'password')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('reset-password', 'Invalid password', { error: e.code })
      return json(
        { ok: false, error: e.code, detail: e.detail },
        400,
        allowedOrigin
      )
    }
    throw e
  }

  // Consume token
  const result = await consumeToken(env, token, 'password_reset')
  if (!result) {
    logger.warn('reset-password', 'Invalid or expired token')
    return json(
      { ok: false, error: 'invalid_or_expired_token', detail: 'Token not found or expired' },
      400,
      allowedOrigin
    )
  }

  // Hash new password
  let newHash
  try {
    newHash = await hashPassword(newPassword)
  } catch (e) {
    logger.error('reset-password', 'Password hashing failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Update password
  try {
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newHash, result.userId)
      .run()
    logger.info('reset-password', 'Password reset', { user: result.userId })
  } catch (e) {
    logger.error('reset-password', 'Update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Fetch user and profile for response
  let user, profile
  try {
    user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
      .bind(result.userId)
      .first()
    profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?')
      .bind(result.userId)
      .first()
  } catch (e) {
    logger.error('reset-password', 'User lookup failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Sign JWT
  let jwt
  try {
    jwt = await signJWT({ sub: result.userId, email: user && user.email }, env.JWT_SECRET)
  } catch (e) {
    logger.error('reset-password', 'JWT sign failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  logger.info('reset-password', 'User auto-signed in', { user: result.userId })

  return json(
    {
      ok: true,
      user: { id: result.userId, email: user && user.email, username: (profile && profile.username) || null },
      token: jwt,
    },
    200,
    allowedOrigin,
    { 'Set-Cookie': setSessionCookie(jwt) }
  )
}
