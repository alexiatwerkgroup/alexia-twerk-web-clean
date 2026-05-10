// GET /api/profile/[id]   — public profile read by user ID OR username.
// No auth required (profiles are public, like the original Supabase RLS
// policy `using (true)` on SELECT). Email is NOT returned to non-owners.
//
// Accepts either a UUID (matches profiles.id) or a username (matches
// profiles.username case-insensitively).

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const idOrUsername = (params && params.id) ? String(params.id).trim() : '';
  if (!idOrUsername) return json({ ok: false, error: 'missing_id' }, 400, origin);

  const isUuid = UUID_RE.test(idOrUsername);
  const sql = isUuid
    ? `SELECT id, username, bio, avatar_url, tokens, total_earned, streak,
              tier, registered_at, seconds_on_site, cuts_watched, last_seen_at
         FROM profiles WHERE id = ?`
    : `SELECT id, username, bio, avatar_url, tokens, total_earned, streak,
              tier, registered_at, seconds_on_site, cuts_watched, last_seen_at
         FROM profiles WHERE LOWER(username) = LOWER(?)`;

  const row = await env.DB.prepare(sql).bind(idOrUsername).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404, origin);

  // If the requester IS the profile owner, also include email.
  let isOwner = false;
  try {
    const me = await authenticate(request, env);
    if (me && me.sub === row.id) isOwner = true;
  } catch (_) {}

  if (isOwner) {
    const ownerRow = await env.DB.prepare('SELECT email, last_login_date, welcomed FROM profiles WHERE id = ?')
      .bind(row.id)
      .first();
    return json({ ok: true, profile: { ...row, ...ownerRow, isOwner: true } }, 200, origin);
  }

  return json({ ok: true, profile: row }, 200, origin);
}
