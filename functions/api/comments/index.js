// GET  /api/comments?page=:slug&limit=N&offset=N
//   → { ok, comments: [...], total }
//
// POST /api/comments  body: { page_slug, body }   (auth required)
//   → { ok, comment }
//
// Public read (anyone), authenticated write. Anti-spam: throttled to 1 comment / 5s per user.

import { authenticate, uuidv4 } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { validate, ValidationError } from '../../_lib/validate.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'
import { checkRateLimit, makeUserKey } from '../../_lib/rate-limit.js'

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
  if (!env.DB) {
    logger.error('comments', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  // ─── GET (list) ─────────────────────────────────────────────────────
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const slug = (url.searchParams.get('page') || '').slice(0, 256)
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50))
    const offset = Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0)

    if (!slug) {
      logger.warn('comments.GET', 'Missing page slug')
      return json({ ok: false, error: 'missing_page' }, 400, allowedOrigin)
    }

    try {
      const rows = await env.DB.prepare(
        `SELECT id, page_slug, body, author_name, username_snapshot, user_id,
                likes_count, created_at
           FROM video_comments WHERE page_slug = ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
      )
        .bind(slug, limit, offset)
        .all()

      const total = await env.DB.prepare(
        'SELECT COUNT(*) as n FROM video_comments WHERE page_slug = ?'
      )
        .bind(slug)
        .first()

      logger.info('comments.GET', 'Comments fetched', { slug, count: rows?.results?.length || 0 })
      return json(
        { ok: true, comments: (rows && rows.results) || [], total: (total && total.n) || 0 },
        200,
        allowedOrigin
      )
    } catch (e) {
      logger.error('comments.GET', 'Query failed', { error: e.message })
      return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
    }
  }

  // ─── POST (create) ──────────────────────────────────────────────────
  if (request.method !== 'POST') {
    return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  }

  // Authenticate
  const me = await authenticate(request, env)
  if (!me || !me.sub) {
    logger.warn('comments.POST', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const slug = String(body.page_slug || '').trim().slice(0, 256)
  const text = String(body.body || '').trim()

  // Validate inputs
  if (!slug) {
    logger.warn('comments.POST', 'Missing page_slug', { user: me.sub })
    return json(Errors.MISSING_FIELD('page_slug').toJSON(), 400, allowedOrigin)
  }

  try {
    validate(text, 'comment')
  } catch (e) {
    if (e instanceof ValidationError) {
      logger.warn('comments.POST', 'Invalid comment', { user: me.sub, error: e.code })
      return json({ ok: false, error: e.code, detail: e.detail }, 400, allowedOrigin)
    }
    throw e
  }

  // Rate limit: 1 comment per 5 seconds per user
  try {
    const rl = await checkRateLimit(env, makeUserKey(me.sub, 'comment'), 5, 1)
    if (!rl.allowed) {
      logger.warn('comments.POST', 'Rate limited', { user: me.sub })
      return json(
        { ok: false, error: 'rate_limited', retry_after: rl.reset_in_seconds },
        429,
        allowedOrigin
      )
    }
  } catch (e) {
    logger.error('comments.POST', 'Rate limit check failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Get profile snapshot
  let profile
  try {
    profile = await env.DB.prepare('SELECT username, email FROM profiles WHERE id = ?')
      .bind(me.sub)
      .first()
  } catch (e) {
    logger.error('comments.POST', 'Profile lookup failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  const id = uuidv4()
  const username = (profile && profile.username) || null
  const authorName =
    username || (profile && profile.email ? String(profile.email).split('@')[0] : 'anon')

  // Insert comment
  try {
    await env.DB.prepare(
      `INSERT INTO video_comments (id, page_slug, body, author_name, username_snapshot, user_id, likes_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(id, slug, text, authorName, username, me.sub)
      .run()
    logger.info('comments.POST', 'Comment created', { id, user: me.sub, slug })
  } catch (e) {
    logger.error('comments.POST', 'Insert failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  const comment = {
    id,
    page_slug: slug,
    body: text,
    author_name: authorName,
    username_snapshot: username,
    user_id: me.sub,
    likes_count: 0,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  }
  return json({ ok: true, comment }, 200, allowedOrigin)
}
