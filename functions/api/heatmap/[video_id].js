// GET /api/heatmap/[video_id]   (no auth — public)
//   → { ok, total_views, buckets, updated_at }

import { json, preflight } from '../../_lib/http.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const vid = (params && params.video_id) ? String(params.video_id) : '';
  if (!vid) return json({ ok: false, error: 'missing_video_id' }, 400, origin);

  const row = await env.DB.prepare(
    'SELECT total_views, buckets, updated_at FROM video_heatmap WHERE video_id = ?'
  )
    .bind(vid)
    .first();

  if (!row) {
    return json({ ok: true, total_views: 0, buckets: {}, updated_at: null }, 200, origin);
  }

  let buckets = {};
  try { buckets = JSON.parse(row.buckets || '{}'); } catch (_) {}

  return json(
    { ok: true, total_views: row.total_views || 0, buckets, updated_at: row.updated_at },
    200,
    origin,
    // 5 min cache — analytics doesn't need to be real-time
    { 'Cache-Control': 'public, max-age=300, s-maxage=300' }
  );
}
