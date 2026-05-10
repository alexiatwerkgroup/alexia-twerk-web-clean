// POST /api/auth/signin
// Body: { email, password } OR { username, password }
// Returns: { ok, user: {id,email,username}, token } + Set-Cookie

import { verifyPassword, signJWT } from '../../_lib/auth.js'
import { json, preflight, readJSON, setSessionCookie } from '../../_lib/http.js'
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
    logger.error('signin', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.JWT_SECRET) {
    logger.error('signin', 'JWT_SECRET missing')
    return json(Errors.JWT_SECRET_MISSING.toJSON(), 500, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const password = String(body.password || '').trim()
  if (!password) {
    logger.warn('signin', 'Missing password')
    return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
  }

  // Validate password format
  try {
    validate(password, 'password')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('signin', 'Invalid password format')
      return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
    }
    throw e
  }

  // Resolve email — direct or via username
  let email = String(body.email || '').trim().toLowerCase()
  const username = body.username ? String(body.username).trim() : ''

  if (!email && username) {
    try {
      validate(username, 'username')
      const row = await env.DB.prepare(
        'SELECT email FROM profiles WHERE LOWER(username) = LOWER(?)'
      )
        .bind(username)
        .first()
      if (!row) {
        logger.warn('signin', 'Username not found', { username })
        return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
      }
      email = String(row.email || '').toLowerCase()
    } catch (e) {
      if (e instanceof ValidationError) {
        logger.warn('signin', 'Invalid username format')
        return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
      }
      throw e
    }
  }

  // Validate email
  if (!email) {
    logger.warn('signin', 'Missing email and username')
    return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
  }

  try {
    validate(email, 'email')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('signin', 'Invalid email format')
      return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
    }
    throw e
  }

  // Look up user
  let user
  try {
    user = await env.DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    )
      .bind(email)
      .first()
  } catch (e) {
    logger.error('signin', 'Database error', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!user) {
    logger.warn('signin', 'User not found', { email })
    return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
  }

  // Verify password
  let passwordValid
  try {
    passwordValid = await verifyPassword(password, user.password_hash)
  } catch (e) {
    logger.error('signin', 'Password verification error', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!passwordValid) {
    logger.warn('signin', 'Invalid password', { id: user.id })
    return json(Errors.INVALID_CREDENTIALS.toJSON(), 401, allowedOrigin)
  }

  // Look up username from profile
  let profile
  try {
    profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?')
      .bind(user.id)
      .first()
  } catch (e) {
    logger.error('signin', 'Profile lookup error', { error: e.message })
  }

  // Update last_seen_at (non-critical)
  try {
    await env.DB.prepare('UPDATE profiles SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run()
  } catch (e) {
    logger.warn('signin', 'Failed to update last_seen_at', { error: e.message })
  }

  // Sign JWT
  let token
  try {
    token = await signJWT({ sub: user.id, email: user.email }, env.JWT_SECRET)
  } catch (e) {
    logger.error('signin', 'JWT sign failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  logger.info('signin', 'User authenticated', { id: user.id })

  return json(
    {
      ok: true,
      user: { id: user.id, email: user.email, username: (profile && profile.username) || null },
      token,
    },
    200,
    allowedOrigin,
    { 'Set-Cookie': setSessionCookie(token) }
  )
}
