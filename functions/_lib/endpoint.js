/**
 * Standard endpoint wrapper
 * Handles CORS, JSON parsing, error handling, logging
 * 
 * Usage:
 *   export const onRequest = createEndpoint({
 *     method: 'POST',
 *     validate: { email: 'email', password: 'password' },
 *     rateLimit: { window_sec: 3600, limit: 5 },
 *     handler: async (body, env, context) => {
 *       return { ok: true, user: {...} }
 *     }
 *   })
 */

import { json, readJSON, preflight } from './http.js'
import { validateObject, ValidationError } from './validate.js'
import { errorResponse, Errors, APIError } from './errors.js'
import { logger } from './logger.js'
import { checkRateLimit, makeIpKey } from './rate-limit.js'

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
  'http://localhost:8788',
  'http://localhost:3000',
]

export function createEndpoint({
  method = 'POST',
  validate: validationRules = {},
  rateLimit = null,
  requireAuth = false,
  handler,
} = {}) {
  return async function onRequest(context) {
    const { request, env } = context
    const origin = request.headers.get('Origin') || ''
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    try {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return preflight(allowedOrigin)
      }

      // Method check
      if (request.method !== method) {
        return json(
          Errors.METHOD_NOT_ALLOWED.toJSON(),
          Errors.METHOD_NOT_ALLOWED.status,
          allowedOrigin
        )
      }

      // DB check
      if (!env.DB) {
        logger.error('endpoint', 'DB binding missing')
        return json(
          Errors.D1_BINDING_MISSING.toJSON(),
          Errors.D1_BINDING_MISSING.status,
          allowedOrigin
        )
      }

      // JWT check
      if (!env.JWT_SECRET) {
        logger.error('endpoint', 'JWT_SECRET missing')
        return json(
          Errors.JWT_SECRET_MISSING.toJSON(),
          Errors.JWT_SECRET_MISSING.status,
          allowedOrigin
        )
      }

      // Parse JSON
      let body = {}
      if (method !== 'GET') {
        body = await readJSON(request)
        if (!body && Object.keys(validationRules).length > 0) {
          return json(
            Errors.BAD_JSON.toJSON(),
            Errors.BAD_JSON.status,
            allowedOrigin
          )
        }
      }

      // Validation
      if (Object.keys(validationRules).length > 0) {
        try {
          body = validateObject(body, validationRules)
        } catch (e) {
          if (e instanceof ValidationError) {
            return json(
              { ok: false, error: e.code, detail: e.detail },
              e.status,
              allowedOrigin
            )
          }
          throw e
        }
      }

      // Rate limiting
      if (rateLimit) {
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
        const key = makeIpKey(clientIp, request.url.split('/').pop())
        const rl = await checkRateLimit(
          env,
          key,
          rateLimit.window_sec,
          rateLimit.limit
        )
        if (!rl.allowed) {
          logger.warn('endpoint', 'Rate limit exceeded', { key, ip: clientIp })
          return json(
            { ok: false, error: 'rate_limited', retry_after: rl.reset_in_seconds },
            429,
            allowedOrigin
          )
        }
      }

      // Call handler
      logger.info('endpoint', `${method} ${request.url}`)
      const result = await handler(body, env, context)

      // Success response
      return json({ ok: true, ...result }, 200, allowedOrigin)
    } catch (error) {
      // Error handling
      if (error instanceof APIError) {
        logger.error('endpoint', error.code, { detail: error.detail })
        return json(error.toJSON(), error.status, allowedOrigin)
      }

      logger.error('endpoint', 'Unhandled error', { message: error.message })
      return json(
        Errors.INTERNAL_ERROR.toJSON(),
        Errors.INTERNAL_ERROR.status,
        allowedOrigin
      )
    }
  }
}
