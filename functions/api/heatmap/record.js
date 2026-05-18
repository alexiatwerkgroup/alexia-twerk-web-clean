// POST /api/heatmap/record   body: { vid, watched: number[] }   (auth optional)
//   → { ok, total_views }
//
// Replaces Supabase record_watch RPC. `watched` is an array of bucket
// indices (0..N-1) representing which 5%-segments the user watched.
// Idempotent: same buckets from same user don't re-increment.
// Lightweight: aggregates into a single row per video_id with a JSON
// `buckets` map of { bucketIdx: count }.
//
// Auth optional — anon writes accepted but tagged with "anon" user_id.
// Heavy egress was the Supabase pain. On Cloudflare we batch UPSERT.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';

const MAX_BUCKETS_PER_REQ = 100;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const vid = String(body.vid || '').slice(0, 256);
  const watched = Array.isArray(body.watched) ? body.watched : [];
  if (!vid) return json({ ok: false, error: 'missing_vid' }, 400, origin);
  if (!watched.length) return json({ ok: true, total_views: 0, granted_buckets: 0 }, 200, origin);

  const buckets = watched
    .filter(function (n) { return Number.isFinite(n) && n >= 0 && n < 200; })
    .slice(0, MAX_BUCKETS_PER_REQ)
    .map(function (n) { return Math.floor(n); });

  if (!buckets.length) return json({ ok: true, total_views: 0, granted_buckets: 0 }, 200, origin);

  // Read current heatmap row
  const existing = await env.DB.prepare(
    'SELECT total_views, buckets FROM video_heatmap WHERE video_id = ?'
  )
    .bind(vid)
    .first();

  let bucketMap = {};
  let totalViews = 0;
  if (existing) {
    totalViews = existing.total_views || 0;
    try { bucketMap = JSON.parse(existing.buckets || '{}'); } catch (_) { bucketMap = {}; }
  }

  // Increment each bucket's count by 1 (per submission, not per watcher)
  buckets.forEach(function (b) {
    bucketMap[b] = (bucketMap[b] || 0) + 1;
  });
  totalViews += 1;

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
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  // Optional: log per-user view (only if authenticated)
  try {
    const me = await authenticate(request, env);
    if (me && me.sub) {
      await env.DB.prepare(
        'INSERT INTO user_video_views (user_id, video_slug) VALUES (?, ?)'
      )
        .bind(me.sub, vid)
        .run();
    }
  } catch (_) { /* non-fatal */ }

  return json({ ok: true, total_views: totalViews, granted_buckets: buckets.length }, 200, origin);
}
