import { signJWT, uuidv4 } from '../../../_lib/auth.js'
import { setSessionCookie } from '../../../_lib/http.js'
import { logger } from '../../../_lib/logger.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || ''
  const m = cookie.match(new RegExp('(?:^|;\s*)' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[1]) : ''
}

function clearCookie(name) {
  return `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure; HttpOnly`
}

function redirect(siteOrigin, query) {
  const headers = new Headers()
  headers.set('Location', siteOrigin + '/' + (query || ''))
  return { headers }
}

export async function onRequest(context) {
  const { request, env } = context
  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '')

  if (!env.DB || !env.JWT_SECRET || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.error('google.callback', 'OAuth not configured')
    const r = redirect(siteOrigin, '?oauth_error=not_configured')
    return new Response(null, { status: 302, headers: r.headers })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const errorParam = url.searchParams.get('error')

  if (errorParam) {
    logger.warn('google.callback', 'Google error', { error: errorParam })
    const r = redirect(siteOrigin, '?oauth_error=' + encodeURIComponent(errorParam))
    return new Response(null, { status: 302, headers: r.headers })
  }

  const expectedState = getCookie(request, 'twk_oauth_state')
  const verifier = getCookie(request, 'twk_oauth_verifier')

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    logger.warn('google.callback', 'State mismatch or missing verifier')
    const r = redirect(siteOrigin, '?oauth_error=invalid_state')
    return new Response(null, { status: 302, headers: r.headers })
  }

  const redirectUri = siteOrigin + '/api/auth/google/callback'
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })

  if (!tokenRes.ok) {
    logger.error('google.callback', 'Token exchange failed', { status: tokenRes.status })
    const r = redirect(siteOrigin, '?oauth_error=token_exchange_failed')
    return new Response(null, { status: 302, headers: r.headers })
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token
  if (!accessToken) {
    logger.error('google.callback', 'No access token in response')
    const r = redirect(siteOrigin, '?oauth_error=no_access_token')
    return new Response(null, { status: 302, headers: r.headers })
  }

  const userRes = await fetch(USERINFO_URL, {
    headers: { 'Authorization': 'Bearer ' + accessToken },
  })

  if (!userRes.ok) {
    logger.error('google.callback', 'User info fetch failed', { status: userRes.status })
    const r = redirect(siteOrigin, '?oauth_error=userinfo_failed')
    return new Response(null, { status: 302, headers: r.headers })
  }

  const userInfo = await userRes.json()
  const email = String(userInfo.email || '').toLowerCase().trim()
  const verifiedEmail = !!userInfo.email_verified
  const googleSub = userInfo.sub
  const fullName = userInfo.name || ''

  if (!email || !verifiedEmail) {
    logger.warn('google.callback', 'Unverified email', { email })
    const r = redirect(siteOrigin, '?oauth_error=unverified_email')
    return new Response(null, { status: 302, headers: r.headers })
  }

  let user
  try {
    user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first()
  } catch (e) {
    logger.error('google.callback', 'User lookup failed', { error: e.message })
    const r = redirect(siteOrigin, '?oauth_error=db_error')
    return new Response(null, { status: 302, headers: r.headers })
  }

  let userId

  if (user) {
    userId = user.id
    try {
      await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run()
      logger.info('google.callback', 'Existing user logged in', { id: userId, email })
    } catch (_) {}
  } else {
    userId = uuidv4()
    const passwordHash = 'oauth:google:' + googleSub

    try {
      let baseUsername = (fullName || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 20) || 'user'
      let username = baseUsername
      let attempt = 0

      while (attempt < 10) {
        const taken = await env.DB.prepare('SELECT id FROM profiles WHERE LOWER(username) = LOWER(?)').bind(username).first()
        if (!taken) break
        attempt++
        username = baseUsername + Math.floor(Math.random() * 9000 + 1000)
      }

      await env.DB.batch([
        env.DB.prepare('INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, 1)').bind(userId, email, passwordHash),
        env.DB.prepare('INSERT INTO profiles (id, email, username, last_active_at, last_seen_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').bind(userId, email, username),
      ])
      logger.info('google.callback', 'New user created', { id: userId, email, username })
    } catch (e) {
      logger.error('google.callback', 'User creation failed', { error: e.message })
      const r = redirect(siteOrigin, '?oauth_error=signup_failed')
      return new Response(null, { status: 302, headers: r.headers })
    }
  }

  let jwt
  try {
    jwt = await signJWT({ sub: userId, email }, env.JWT_SECRET)
  } catch (e) {
    logger.error('google.callback', 'JWT sign failed', { error: e.message })
    const r = redirect(siteOrigin, '?oauth_error=jwt_failed')
    return new Response(null, { status: 302, headers: r.headers })
  }

  const profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?').bind(userId).first()
  const userPayload = encodeURIComponent(JSON.stringify({
    id: userId,
    email: email,
    username: (profile && profile.username) || null,
  }))

  const headers = new Headers()
  headers.set('Location', `${siteOrigin}/#twk_oauth_done=1&twk_token=${encodeURIComponent(jwt)}&twk_user=${userPayload}`)
  headers.append('Set-Cookie', setSessionCookie(jwt))
  headers.append('Set-Cookie', clearCookie('twk_oauth_state'))
  headers.append('Set-Cookie', clearCookie('twk_oauth_verifier'))

  return new Response(null, { status: 302, headers })
}
