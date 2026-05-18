// POST /api/auth/signin
// Body: { email, password }   OR   { username, password }
// Returns: { ok, user: {id,email,username}, token } + Set-Cookie
//
// Verifies bcrypt-style password hash and issues a fresh JWT.

import { verifyPassword, signJWT } from '../../_lib/auth.js';
import { json, preflight, readJSON, setSessionCookie } from '../../_lib/http.js';

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.JWT_SECRET) return json({ ok: false, error: 'jwt_secret_missing' }, 500, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const password = String(body.password || '');
  if (!password) return json({ ok: false, error: 'invalid_credentials' }, 400, origin);

  // Resolve email — direct or via username lookup
  let email = String(body.email || '').trim().toLowerCase();
  const username = body.username ? String(body.username).trim() : '';

  if (!email && username) {
    const row = await env.DB.prepare(
      'SELECT email FROM profiles WHERE LOWER(username) = LOWER(?)'
    )
      .bind(username)
      .first();
    if (!row) return json({ ok: false, error: 'invalid_credentials' }, 401, origin);
    email = String(row.email || '').toLowerCase();
  }

  if (!email || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_credentials' }, 401, origin);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?'
  )
    .bind(email)
    .first();

  if (!user) return json({ ok: false, error: 'invalid_credentials' }, 401, origin);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return json({ ok: false, error: 'invalid_credentials' }, 401, origin);

  // Look up username from profiles
  const profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?')
    .bind(user.id)
    .first();

  // Bump last_seen_at
  try {
    await env.DB.prepare('UPDATE profiles SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();
  } catch (_) { /* non-fatal */ }

  let token;
  try {
    token = await signJWT({ sub: user.id, email: user.email }, env.JWT_SECRET);
  } catch (e) {
    return json({ ok: false, error: 'jwt_sign_failed' }, 500, origin);
  }

  return json(
    {
      ok: true,
      user: { id: user.id, email: user.email, username: (profile && profile.username) || null },
      token,
    },
    200,
    origin,
    { 'Set-Cookie': setSessionCookie(token) }
  );
}
