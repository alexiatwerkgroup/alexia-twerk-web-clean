import { authenticate } from '../../_lib/auth.js'
import { json, preflight } from '../../_lib/http.js'
import { createTokenRow } from '../../_lib/tokens.js'
import { sendEmail, renderVerifyEmail } from '../../_lib/resend.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const VERIFY_TOKEN_TTL_SEC = 24 * 60 * 60
const ALLOWED_ORIGINS = ['https://alexiatwerkgroup.com', 'https://www.alexiatwerkgroup.com', 'http://localhost:8788', 'http://localhost:3000']

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'POST') return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  if (!env.DB) {
    logger.error('send-verification', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.RESEND_API_KEY) {
    logger.error('send-verification', 'Email service not configured')
    return json({ ok: false, error: 'email_service_not_configured' }, 503, allowedOrigin)
  }

  const me = await authenticate(request, env)
  if (!me || !me.sub) {
    logger.warn('send-verification', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  let user
  try {
    user = await env.DB.prepare('SELECT email, email_verified FROM users WHERE id = ?').bind(me.sub).first()
  } catch (e) {
    logger.error('send-verification', 'User lookup failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  if (!user) {
    logger.warn('send-verification', 'User not found', { user: me.sub })
    return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
  }

  if (user.email_verified) {
    logger.debug('send-verification', 'Email already verified', { user: me.sub })
    return json({ ok: true, already_verified: true }, 200, allowedOrigin)
  }

  let profile
  try {
    profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?').bind(me.sub).first()
  } catch (e) {
    logger.warn('send-verification', 'Profile lookup failed', { error: e.message })
  }

  let raw
  try {
    raw = await createTokenRow(env, me.sub, 'email_verification', VERIFY_TOKEN_TTL_SEC)
  } catch (e) {
    logger.error('send-verification', 'Token creation failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '')
  const verifyUrl = `${siteOrigin}/api/auth/verify-email?token=${encodeURIComponent(raw)}`

  context.waitUntil(
    sendEmail(env, {
      to: user.email,
      subject: 'TWERKHUB · Verify your email',
      html: renderVerifyEmail({ verifyUrl, username: profile && profile.username }),
    })
      .then(() => {
        logger.info('send-verification', 'Email sent', { user: me.sub })
      })
      .catch((e) => {
        logger.error('send-verification', 'Email send failed', { error: e.message })
      })
  )

  return json({ ok: true }, 200, allowedOrigin)
}
