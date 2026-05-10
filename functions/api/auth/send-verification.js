// POST /api/auth/send-verification   (auth required)
//   → { ok }
//
// Sends an email verification link to the current user's email.
// Idempotent: invalidates older verify tokens for this user.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';
import { createTokenRow } from '../../_lib/tokens.js';
import { sendEmail, renderVerifyEmail } from '../../_lib/resend.js';

const VERIFY_TOKEN_TTL_SEC = 24 * 60 * 60;  // 24 hours

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'email_service_not_configured' }, 503, origin);

  const me = await authenticate(request, env);
  if (!me || !me.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const user = await env.DB.prepare('SELECT email, email_verified FROM users WHERE id = ?')
    .bind(me.sub)
    .first();
  if (!user) return json({ ok: false, error: 'user_not_found' }, 404, origin);
  if (user.email_verified) return json({ ok: true, already_verified: true }, 200, origin);

  const profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?')
    .bind(me.sub)
    .first();

  let raw;
  try {
    raw = await createTokenRow(env, me.sub, 'email_verification', VERIFY_TOKEN_TTL_SEC);
  } catch (e) {
    return json({ ok: false, error: 'token_create_failed' }, 500, origin);
  }

  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '');
  const verifyUrl = `${siteOrigin}/api/auth/verify-email?token=${encodeURIComponent(raw)}`;

  try {
    await sendEmail(env, {
      to: user.email,
      subject: 'TWERKHUB · Verify your email',
      html: renderVerifyEmail({ verifyUrl, username: profile && profile.username }),
    });
  } catch (e) {
    return json({ ok: false, error: 'email_send_failed', detail: e && e.message }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
}
