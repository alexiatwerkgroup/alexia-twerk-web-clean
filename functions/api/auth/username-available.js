// GET /api/auth/username-available?u=foo
// Returns: { ok, available: bool }

import { json, preflight } from '../../_lib/http.js';

const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/i;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const url = new URL(request.url);
  const u = (url.searchParams.get('u') || '').trim();

  if (!u || !USERNAME_RE.test(u)) {
    return json({ ok: false, error: 'invalid_username' }, 400, origin);
  }

  const row = await env.DB.prepare('SELECT id FROM profiles WHERE LOWER(username) = LOWER(?)')
    .bind(u)
    .first();

  return json({ ok: true, available: !row }, 200, origin);
}
