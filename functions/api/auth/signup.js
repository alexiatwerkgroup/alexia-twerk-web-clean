// POST /api/auth/signup
// Body: { email, password, username? }
// Returns: { ok, user: {id,email,username}, token } + Set-Cookie

import { hashPassword, signJWT, uuidv4 } from '../../_lib/auth.js'
import { json, preflight, readJSON, setSessionCookie } from '../../_lib/http.js'
import { createTokenRow } from '../../_lib/tokens.js'
import { sendEmail, renderVerifyEmail } from '../../_lib/resend.js'
import { validate, validateObject, ValidationError } from '../../_lib/validate.js'
import { Errors, APIError } from '../../_lib/errors.js'
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
    logger.error('signup', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.JWT_SECRET) {
    logger.error('signup', 'JWT_SECRET missing')
    return json(Errors.JWT_SECRET_MISSING.toJSON(), 500, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  // Validate email and password
  let email, password, username
  try {
    const validated = validateObject(body, {
      email: 'email',
      password: 'password',
    })
    email = validated.email
    password = validated.password
    username = body.username ? String(body.username).trim() : null
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('signup', 'Validation failed', { errors: e.detail })
      return json({ ok: false, error: e.code, detail: e.detail }, 400, allowedOrigin)
    }
    throw e
  }

  // Validate username if provided
  if (username) {
    try {
      validate(username, 'username')
    } catch (e) {
      if (e instanceof ValidationError) {
        logger.warn('signup', 'Invalid username', { username })
        return json({ ok: false, error: e.code, detail: e.detail }, 400, allowedOrigin)
      }
      throw e
    }
  }

  // Check email duplicate
  try {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existing) {
      logger.warn('signup', 'Email already registered', { email })
      return json(Errors.EMAIL_TAKEN.toJSON(), 409, allowedOrigin)
    }
  } catch (e) {
    logger.error('signup', 'Database error checking email', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Check username duplicate if provided
  if (username) {
    try {
      const u = await env.DB.prepare('SELECT id FROM profiles WHERE LOWER(username) = LOWER(?)')
        .bind(username)
        .first()
      if (u) {
        logger.warn('signup', 'Username already taken', { username })
        return json(Errors.USERNAME_TAKEN.toJSON(), 409, allowedOrigin)
      }
    } catch (e) {
      logger.error('signup', 'Database error checking username', { error: e.message })
      return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
    }
  }

  // Hash password
  const id = uuidv4()
  let passwordHash
  try {
    passwordHash = await hashPassword(password)
  } catch (e) {
    logger.error('signup', 'Password hashing failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Create user + profile (atomic batch)
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').bind(
        id,
        email,
        passwordHash
      ),
      env.DB.prepare(
        'INSERT INTO profiles (id, email, username, last_active_at, last_seen_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      ).bind(id, email, username || null),
    ])
    logger.info('signup', 'User created', { id, email })
  } catch (e) {
    logger.error('signup', 'Insert failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Sign JWT
  let token
  try {
    token = await signJWT({ sub: id, email }, env.JWT_SECRET)
  } catch (e) {
    logger.error('signup', 'JWT sign failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Send verification email (non-blocking)
  if (env.RESEND_API_KEY) {
    try {
      const rawTok = await createTokenRow(env, id, 'email_verification', 24 * 60 * 60)
      const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '')
      const verifyUrl = `${siteOrigin}/api/auth/verify-email?token=${encodeURIComponent(rawTok)}`
      context.waitUntil(
        sendEmail(env, {
          to: email,
          subject: 'TWERKHUB · Verify your email',
          html: renderVerifyEmail({ verifyUrl, username: username || null }),
        }).catch(function (e) {
          logger.warn('signup', 'Email send failed', { error: e.message })
        })
      )
    } catch (e) {
      logger.warn('signup', 'Email setup failed', { error: e.message })
    }
  }

  return json(
    { ok: true, user: { id, email, username: username || null }, token },
    200,
    allowedOrigin,
    { 'Set-Cookie': setSessionCookie(token) }
  )
}
