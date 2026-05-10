// POST /api/auth/forgot-password   body: { email }
//   → { ok: true }   (always — don't leak whether email exists)
//
// Generates a one-time reset token (1 hour expiry) and emails it to the user.
// If email doesn't exist, returns ok:true silently (anti-enumeration).
// Throttled: max 1 reset email / 60s per email.

import { json, preflight, readJSON } from '../../_lib/http.js';
import { createTokenRow } from '../../_lib/tokens.js';
import { sendEmail, renderResetEmail } from '../../_lib/resend.js';

const RESET_TOKEN_TTL_SEC = 60 * 60;   // 1 hour
const RATE_WINDOW_SEC = 60;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: 'email_service_not_configured' }, 503, origin);
  }

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return json({ ok: false, error: 'missing_email' }, 400, origin);

  const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first();

  // Anti-enumeration: always pretend success even if user doesn't exist.
  // The actual email is only sent if the user exists.
  if (!user) {
    return json({ ok: true }, 200, origin);
  }

  // Rate limit: deny if a token was created < 60s ago for this user.
  const recent = await env.DB.prepare(
    "SELECT created_at FROM auth_tokens WHERE user_id = ? AND kind = 'password_reset' ORDER BY created_at DESC LIMIT 1"
  )
    .bind(user.id)
    .first();
  if (recent && recent.created_at) {
    const age = Date.now() - Date.parse(recent.created_at + 'Z');
    if (age < RATE_WINDOW_SEC * 1000) {
      return json({ ok: true, throttled: true }, 200, origin);  // silent for the client
    }
  }

  const profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?').bind(user.id).first();

  let raw;
  try {
    raw = await createTokenRow(env, user.id, 'password_reset', RESET_TOKEN_TTL_SEC);
  } catch (e) {
    return json({ ok: false, error: 'token_create_failed' }, 500, origin);
  }

  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '');
  const resetUrl = `${siteOrigin}/reset.html?token=${encodeURIComponent(raw)}`;

  try {
    await sendEmail(env, {
      to: user.email,
      subject: 'TWERKHUB · Reset your password',
      html: renderResetEmail({
        resetUrl,
        username: profile && profile.username,
        expiresInMin: 60,
      }),
    });
  } catch (e) {
    console.error('forgot-password email failed', e && e.message);
    // Still return ok:true to avoid leaking whether the email was sent.
    return json({ ok: true, _email_warning: 'send_may_have_failed' }, 200, origin);
  }

  return json({ ok: true }, 200, origin);
}
