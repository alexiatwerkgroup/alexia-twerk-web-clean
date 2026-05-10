// POST /api/session/bump   (auth required)
// Body: { seconds_delta: 0..60, cuts_delta: 0..5 }
// Returns: { ok, seconds_on_site, cuts_watched, last_seen_at }
//
// Heartbeat tracker. Replaces Supabase bump_session RPC.
// Server clamps deltas so a malicious client can't fake huge time.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const payload = await authenticate(request, env);
  if (!payload || !payload.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const secs = Math.max(0, Math.min(60, parseInt(body.seconds_delta, 10) || 0));
  const cuts = Math.max(0, Math.min(5, parseInt(body.cuts_delta, 10) || 0));

  if (secs === 0 && cuts === 0) {
    // No-op: still bump last_seen_at so admin views stay accurate
    try {
      await env.DB.prepare('UPDATE profiles SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(payload.sub)
        .run();
    } catch (_) {}
    return json({ ok: true, granted: 0 }, 200, origin);
  }

  try {
    await env.DB.prepare(
      `UPDATE profiles
          SET seconds_on_site = COALESCE(seconds_on_site,0) + ?,
              cuts_watched    = COALESCE(cuts_watched,0)   + ?,
              last_seen_at    = CURRENT_TIMESTAMP,
              last_active_at  = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
      .bind(secs, cuts, payload.sub)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  const row = await env.DB.prepare(
    'SELECT seconds_on_site, cuts_watched, last_seen_at FROM profiles WHERE id = ?'
  )
    .bind(payload.sub)
    .first();

  return json({ ok: true, ...row }, 200, origin);
}
