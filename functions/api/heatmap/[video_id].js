import { json, preflight } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const ALLOWED_ORIGINS = ['https://alexiatwerkgroup.com', 'https://www.alexiatwerkgroup.com', 'http://localhost:8788', 'http://localhost:3000']

export async function onRequest(context) {
  const { request, env, params } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'GET') return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  if (!env.DB) {
    logger.error('heatmap.GET', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }

  const videoId = (params && params.video_id) ? String(params.video_id).trim() : ''
  if (!videoId) {
    logger.warn('heatmap.GET', 'Missing video ID')
    return json(Errors.MISSING_FIELD('video_id').toJSON(), 400, allowedOrigin)
  }

  try {
    const row = await env.DB.prepare('SELECT total_views, buckets FROM video_heatmap WHERE video_id = ?')
      .bind(videoId)
      .first()

    if (!row) {
      logger.debug('heatmap.GET', 'Heatmap not found', { vid: videoId })
      return json({ ok: true, heatmap: null }, 200, allowedOrigin)
    }

    let buckets = {}
    try {
      buckets = JSON.parse(row.buckets || '{}')
    } catch {
      logger.warn('heatmap.GET', 'Invalid JSON in buckets', { vid: videoId })
    }

    logger.debug('heatmap.GET', 'Heatmap retrieved', { vid: videoId, views: row.total_views })
    return json({ ok: true, heatmap: { total_views: row.total_views, buckets } }, 200, allowedOrigin)
  } catch (e) {
    logger.error('heatmap.GET', 'Query failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }
}
