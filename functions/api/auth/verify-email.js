// GET /api/auth/verify-email?token=XXX
//   → 302 redirect to /?verified=1 on success, /?verified=0 on failure

import { consumeToken } from '../../_lib/tokens.js'
import { logger } from '../../_lib/logger.js'

const SITE_URL_DEFAULT = 'https://alexiatwerkgroup.com'

export async function onRequest(context) {
  const { request, env } = context

  if (!env.DB) {
    logger.error('verify-email', 'DB binding missing')
    return new Response('Database not configured', { status: 500 })
  }

  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''
  const siteOrigin = (env.SITE_URL || SITE_URL_DEFAULT).replace(/\/+$/, '')

  function redirect(query) {
    return new Response(null, {
      status: 302,
      headers: { Location: siteOrigin + '/' + (query || '') },
    })
  }

  if (!token) {
    logger.warn('verify-email', 'Missing token')
    return redirect('?verified=0&reason=missing')
  }

  const result = await consumeToken(env, token, 'email_verification')
  if (!result) {
    logger.warn('verify-email', 'Token not found or expired', { token: token.slice(0, 8) })
    return redirect('?verified=0&reason=expired')
  }

  try {
    await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?')
      .bind(result.userId)
      .run()
    logger.info('verify-email', 'Email verified', { user: result.userId })
  } catch (e) {
    logger.error('verify-email', 'Update failed', { error: e.message })
    return redirect('?verified=0&reason=storage')
  }

  return redirect('?verified=1')
}
