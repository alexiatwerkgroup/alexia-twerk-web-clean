// TWERKHUB · email subscribe endpoint
// POST /api/subscribe   body: { email, source?, hp? }
// Returns: { ok, message }

import { json, preflight, readJSON } from './_lib/http.js'
import { validate, ValidationError } from './_lib/validate.js'
import { Errors } from './_lib/errors.js'
import { logger } from './_lib/logger.js'

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
  'http://localhost:8788',
  'http://localhost:3000',
]

// Blacklisted throwaway email domains
const BANNED_DOMAINS = ['mailinator.com', 'guerrillamail.', 'tempmail.', 'yopmail.com', 'trashmail.']

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'POST') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('subscribe', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const payload = await readJSON(request)
  if (!payload) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  // Honeypot detection
  if (payload.hp && String(payload.hp).trim() !== '') {
    logger.debug('subscribe', 'Honeypot triggered')
    // Pretend success to confuse bots
    return json({ ok: true, message: 'subscribed' }, 200, allowedOrigin)
  }

  const email = String(payload.email || '').trim().toLowerCase()
  const source = String(payload.source || 'home_modal').slice(0, 64)

  // Validate email
  try {
    validate(email, 'email')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('subscribe', 'Invalid email', { email: email.slice(0, 10) })
      return json(Errors.INVALID_EMAIL.toJSON(), 400, allowedOrigin)
    }
    throw e
  }

  // Check for banned domains (throwaway emails)
  if (BANNED_DOMAINS.some((d) => email.includes(d))) {
    logger.warn('subscribe', 'Banned domain', { email: email.slice(0, 10) })
    return json(Errors.INVALID_EMAIL.toJSON(), 400, allowedOrigin)
  }

  // Capture metadata
  const ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '').slice(0, 64)
  const ua = (request.headers.get('User-Agent') || '').slice(0, 256)

  // Insert into D1 (idempotent via unique constraint)
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO subscribers (email, source, ip, user_agent)
       VALUES (?, ?, ?, ?)`
    )
      .bind(email, source, ip, ua)
      .run()
    logger.info('subscribe', 'Email subscribed', { email: email.slice(0, 10), source })
  } catch (e) {
    logger.error('subscribe', 'Insert failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json({ ok: true, message: 'subscribed' }, 200, allowedOrigin)
}
