// GET /api/auth/username-available?u=foo
// Returns: { ok, available: bool }

import { json, preflight } from '../../_lib/http.js'
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
  if (request.method !== 'GET') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }
  if (!env.DB) {
    logger.error('username-available', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const url = new URL(request.url)
  const u = (url.searchParams.get('u') || '').trim()

  // Validate username
  try {
    validate(u, 'username')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.debug('username-available', 'Invalid username format', { username: u })
      return json({ ok: false, error: e.code, detail: e.detail }, 400, allowedOrigin)
    }
    throw e
  }

  try {
    const row = await env.DB.prepare('SELECT id FROM profiles WHERE LOWER(username) = LOWER(?)')
      .bind(u)
      .first()

    const available = !row
    logger.debug('username-available', 'Check completed', { username: u, available })
    return json({ ok: true, available }, 200, allowedOrigin)
  } catch (e) {
    logger.error('username-available', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }
}
