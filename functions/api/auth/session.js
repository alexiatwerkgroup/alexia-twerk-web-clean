// GET /api/auth/session
// Returns: { ok, user: {id,email,username,...} | null }
//
// Validates the JWT (Authorization: Bearer or Cookie twk_jwt) and returns
// the current user's profile snapshot. Used on every page load by the
// client-side auth glue.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.JWT_SECRET) return json({ ok: false, error: 'jwt_secret_missing' }, 500, origin);

  const payload = await authenticate(request, env);
  if (!payload || !payload.sub) {
    return json({ ok: true, user: null }, 200, origin);
  }

  const profile = await env.DB.prepare(
    `SELECT id, email, username, bio, avatar_url, tokens, total_earned, streak,
            last_login_date, welcomed, tier, last_active_at, registered_at,
            seconds_on_site, cuts_watched, last_seen_at
       FROM profiles WHERE id = ?`
  )
    .bind(payload.sub)
    .first();

  if (!profile) return json({ ok: true, user: null }, 200, origin);

  return json({ ok: true, user: profile }, 200, origin);
}
