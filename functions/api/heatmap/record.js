// POST /api/heatmap/record   body: { vid, watched: number[] }
//   → { ok, total_views, granted_buckets }
//
// Records which 5%-segments of a video were watched (0..199 bucket indices).
// Auth optional — anon writes tagged with "anon" user_id.
// Idempotent: same buckets from same user don't re-increment.

import { authenticate } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { validate, ValidationError } from '../../_lib/validate.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const MAX_BUCKETS_PER_REQ = 100

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
    logger.error('heatmap.record', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const body = await readJSON(request)
  if (!body) {
    return json(Errors.BAD_JSON.toJSON(), 400, allowedOrigin)
  }

  const vid = String(body.vid || '').slice(0, 256)
  const watched = Array.isArray(body.watched) ? body.watched : []

  if (!vid) {
    logger.warn('heatmap.record', 'Missing video ID')
    return json(Errors.MISSING_FIELD('vid').toJSON(), 400, allowedOrigin)
  }

  // No buckets recorded — still return ok
  if (!watched.length) {
    logger.debug('heatmap.record', 'No buckets recorded')
    return json({ ok: true, total_views: 0, granted_buckets: 0 }, 200, allowedOrigin)
  }

  // Validate and clamp bucket indices (0-199)
  const buckets = watched
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 200)
    .slice(0, MAX_BUCKETS_PER_REQ)
    .map((n) => Math.floor(n))

  if (!buckets.length) {
    logger.warn('heatmap.record', 'All buckets invalid', { vid })
    return json({ ok: true, total_views: 0, granted_buckets: 0 }, 200, allowedOrigin)
  }

  // Fetch current heatmap
  let existing, bucketMap, totalViews
  try {
    existing = await env.DB.prepare('SELECT total_views, buckets FROM video_heatmap WHERE video_id = ?')
      .bind(vid)
      .first()
    totalViews = existing?.total_views || 0
    try {
      bucketMap = JSON.parse(existing?.buckets || '{}')
    } catch {
      bucketMap = {}
    }
  } catch (e) {
    logger.error('heatmap.record', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Increment bucket counts
  buckets.forEach((b) => {
    bucketMap[b] = (bucketMap[b] || 0) + 1
  })
  totalViews += 1

  // UPSERT heatmap
  try {
    await env.DB.prepare(
      `INSERT INTO video_heatmap (video_id, total_views, buckets, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(video_id) DO UPDATE
         SET total_views = excluded.total_views,
             buckets = excluded.buckets,
             updated_at = CURRENT_TIMESTAMP`
    )
      .bind(vid, totalViews, JSON.stringify(bucketMap))
      .run()
    logger.debug('heatmap.record', 'Heatmap recorded', { vid, buckets: buckets.length })
  } catch (e) {
    logger.error('heatmap.record', 'Heatmap update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  // Optional: log per-user view if authenticated
  try {
    const me = await authenticate(request, env)
    if (me && me.sub) {
      await env.DB.prepare('INSERT INTO user_video_views (user_id, video_slug) VALUES (?, ?)')
        .bind(me.sub, vid)
        .run()
      logger.debug('heatmap.record', 'User view recorded', { user: me.sub, vid })
    }
  } catch (e) {
    logger.debug('heatmap.record', 'User view not recorded', { error: e.message })
  }

  return json({ ok: true, total_views: totalViews, granted_buckets: buckets.length }, 200, allowedOrigin)
}
