// GET /api/admin/full-stats   (auth required, owner-only)
//   → { ok, users: [...], total_users, total_tokens_outstanding, ... }
//
// Replaces Supabase admin_get_full_stats RPC. Hard-gated to OWNER_EMAIL.
// Returns full user list (email + metrics) for the admin dashboard.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const me = await authenticate(request, env);
  // Silent empty for non-owners (matches original Supabase RPC behavior).
  if (!me || !me.email || String(me.email).toLowerCase() !== OWNER_EMAIL) {
    return json({ ok: true, users: [], total_users: 0, owner_only: true }, 200, origin);
  }

  const usersRows = await env.DB.prepare(
    `SELECT id, email, username, tokens, total_earned, streak, tier,
            registered_at, last_login_date, last_seen_at,
            seconds_on_site, cuts_watched, welcomed
       FROM profiles
      ORDER BY registered_at DESC
      LIMIT 1000`
  ).all();

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) as total_users,
            COALESCE(SUM(tokens), 0) as total_tokens_outstanding,
            COALESCE(SUM(total_earned), 0) as total_tokens_lifetime,
            COALESCE(SUM(seconds_on_site), 0) as total_seconds,
            COALESCE(SUM(cuts_watched), 0) as total_cuts
       FROM profiles`
  ).first();

  const commentTotal = await env.DB.prepare(
    'SELECT COUNT(*) as n FROM video_comments'
  ).first();

  return json(
    {
      ok: true,
      users: (usersRows && usersRows.results) || [],
      ...totals,
      total_comments: (commentTotal && commentTotal.n) || 0,
      generated_at: new Date().toISOString(),
    },
    200,
    origin
  );
}
