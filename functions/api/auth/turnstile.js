import { verifyTurnstile, securityError, ipHash, PASS_SCHEMA, passCookie } from '../../_lib/turnstile.js';
import { limitByIP } from '../../_lib/auth-abuse.js';
export async function onRequestPost(context) {
  const { request, env } = context;
  const limited = await limitByIP(context, 'oauth-challenge', 3600, 10);
  if (limited) return limited;
  let body; try { body = await request.json(); } catch { return securityError('bad_json', 400); }
  const error = await verifyTurnstile(request, env, body.turnstileToken, 'oauth');
  if (error) return error;
  const hash = await ipHash(request);
  if (!hash || !env.DB) return securityError('security_check_unavailable', 503);
  const nonce = crypto.randomUUID();
  try {
    await env.DB.prepare(PASS_SCHEMA).run();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM auth_turnstile_passes WHERE expires <= ?').bind(Date.now()),
      env.DB.prepare('INSERT INTO auth_turnstile_passes (nonce, ip_hash, expires) VALUES (?, ?, ?)').bind(nonce, hash, Date.now() + 120000)
    ]);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Set-Cookie': passCookie(nonce, 120) } });
  } catch { return securityError('security_check_unavailable', 503); }
}
