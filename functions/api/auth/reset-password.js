// POST /api/auth/reset-password   body: { token, new_password }
//   → { ok, user, token: <jwt> } + Set-Cookie  (auto-signs them in)
//
// Validates the one-time token, updates the password, optionally signs the
// user in immediately. Token is consumed (single-use).

import { hashPassword, signJWT } from '../../_lib/auth.js';
import { json, preflight, readJSON, setSessionCookie } from '../../_lib/http.js';
import { consumeToken } from '../../_lib/tokens.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.JWT_SECRET) return json({ ok: false, error: 'jwt_secret_missing' }, 500, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const token = String(body.token || '').trim();
  const newPassword = String(body.new_password || '');
  if (!token) return json({ ok: false, error: 'missing_token' }, 400, origin);
  if (newPassword.length < 6 || newPassword.length > 256) {
    return json({ ok: false, error: 'invalid_password_length' }, 400, origin);
  }

  const result = await consumeToken(env, token, 'password_reset');
  if (!result) return json({ ok: false, error: 'invalid_or_expired_token' }, 400, origin);

  let newHash;
  try {
    newHash = await hashPassword(newPassword);
  } catch (e) {
    return json({ ok: false, error: 'hash_failed' }, 500, origin);
  }

  try {
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newHash, result.userId)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  // Auto-sign-in: issue fresh JWT
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
    .bind(result.userId)
    .first();
  const profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?')
    .bind(result.userId)
    .first();

  const jwt = await signJWT({ sub: result.userId, email: user && user.email }, env.JWT_SECRET);

  return json(
    {
      ok: true,
      user: { id: result.userId, email: user && user.email, username: (profile && profile.username) || null },
      token: jwt,
    },
    200,
    origin,
    { 'Set-Cookie': setSessionCookie(jwt) }
  );
}
