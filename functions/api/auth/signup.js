// POST /api/auth/signup
// Body: { email, password, username? }
// Returns: { ok, user: {id,email,username}, token } + Set-Cookie
//
// Creates a row in `users` and `profiles` in D1 AND Supabase
// (keeps both databases in sync). Issues a JWT.

import { hashPassword, signJWT, uuidv4 } from '../../_lib/auth.js';
import { json, preflight, readJSON, setSessionCookie } from '../../_lib/http.js';
import { createTokenRow } from '../../_lib/tokens.js';
import { sendEmail, renderVerifyEmail } from '../../_lib/resend.js';

const SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vpZrp8cL12lpJ3MYWlne6Q_dDkW2NlI';

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/i;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.JWT_SECRET) return json({ ok: false, error: 'jwt_secret_missing' }, 500, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const usernameRaw = body.username ? String(body.username).trim() : '';

  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return json({ ok: false, error: 'invalid_email' }, 400, origin);
  }
  if (password.length < 6 || password.length > 256) {
    return json({ ok: false, error: 'invalid_password' }, 400, origin);
  }
  if (usernameRaw && !USERNAME_RE.test(usernameRaw)) {
    return json({ ok: false, error: 'invalid_username' }, 400, origin);
  }

  // Check duplicates
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ ok: false, error: 'email_taken' }, 409, origin);

  if (usernameRaw) {
    const u = await env.DB.prepare('SELECT id FROM profiles WHERE LOWER(username) = LOWER(?)')
      .bind(usernameRaw)
      .first();
    if (u) return json({ ok: false, error: 'username_taken' }, 409, origin);
  }

  const id = uuidv4();
  let passwordHash;
  try {
    passwordHash = await hashPassword(password);
  } catch (e) {
    return json({ ok: false, error: 'hash_failed' }, 500, origin);
  }

  // Atomic insert via batch (D1 supports batched statements)
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').bind(
        id,
        email,
        passwordHash
      ),
      env.DB.prepare(
        'INSERT INTO profiles (id, email, username, last_active_at, last_seen_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      ).bind(id, email, usernameRaw || null),
    ]);
  } catch (e) {
    console.error('signup insert failed', e && e.message);
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  // Also write to Supabase profiles table to keep databases in sync
  try {
    const now = new Date().toISOString();
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: id,
          email: email,
          username: usernameRaw || null,
          last_active_at: now,
          last_seen_at: now,
          tokens: 0,
          total_earned: 0,
          seconds_on_site: 0,
          cuts_watched: 0,
          streak: 0,
          tier: 'basic'
        })
      }
    );

    if (!supabaseResponse.ok) {
      console.warn(`[signup] Supabase write failed: ${supabaseResponse.status} ${supabaseResponse.statusText}`);
      // Don't fail signup if Supabase write fails — user is already created in D1
      // A sync job can catch this later
    } else {
      console.log('[signup] Wrote new user profile to Supabase');
    }
  } catch (e) {
    console.warn('[signup] Supabase write error (non-fatal):', e && e.message);
    // Continue — D1 write succeeded, user is registered
  }

  let token;
  try {
    token = await signJWT({ sub: id, email }, env.JWT_SECRET);
  } catch (e) {
    return json({ ok: false, error: 'jwt_sign_failed' }, 500, origin);
  }

  // Send verification email — non-blocking. If it fails, signup still
  // succeeds (user can re-request via /api/auth/send-verification).
  if (env.RESEND_API_KEY) {
    try {
      const rawTok = await createTokenRow(env, id, 'email_verification', 24 * 60 * 60);
      const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '');
      const verifyUrl = `${siteOrigin}/api/auth/verify-email?token=${encodeURIComponent(rawTok)}`;
      // Fire-and-forget — we don't await on email delivery to keep signup snappy.
      context.waitUntil(
        sendEmail(env, {
          to: email,
          subject: 'TWERKHUB · Verify your email',
          html: renderVerifyEmail({ verifyUrl, username: usernameRaw || null }),
        }).catch(function (e) {
          console.warn('signup verify-email send failed', e && e.message);
        })
      );
    } catch (_) { /* non-fatal */ }
  }

  return json(
    { ok: true, user: { id, email, username: usernameRaw || null }, token },
    200,
    origin,
    { 'Set-Cookie': setSessionCookie(token) }
  );
}
