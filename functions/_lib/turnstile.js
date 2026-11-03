export const SITE_KEY = '0x4AAAAAAFyov-cxmExBGGwP';
const HOSTS = new Set(['twerkhub.lat', 'www.twerkhub.lat']);
export function securityError(error, status = 403) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
export async function verifyTurnstile(request, env, token, action, fetcher = fetch) {
  if (!env.TURNSTILE_SECRET_KEY) return securityError('security_check_unavailable', 503);
  if (typeof token !== 'string' || !token || token.length > 2048) return securityError('security_verification_required');
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || undefined }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return securityError('security_check_unavailable', 503);
    const result = await response.json();
    if (result.success !== true || !HOSTS.has(result.hostname) || result.action !== action) return securityError('security_verification_failed');
    return null;
  } catch { return securityError('security_check_unavailable', 503); }
}

export async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return null;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))), b => b.toString(16).padStart(2, '0')).join('');
}
export const PASS_SCHEMA = 'CREATE TABLE IF NOT EXISTS auth_turnstile_passes (nonce TEXT PRIMARY KEY, ip_hash TEXT NOT NULL, expires INTEGER NOT NULL)';
export const PASS_COOKIE = '__Host-twk_turnstile';
export function passCookie(value, seconds) { return `${PASS_COOKIE}=${value}; Max-Age=${seconds}; Path=/; Secure; HttpOnly; SameSite=Lax`; }
export async function consumeOAuthPass(request, env) {
  const nonce = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)__Host-twk_turnstile=([a-f0-9-]+)/)?.[1];
  const hash = await ipHash(request);
  if (!nonce || !hash || !env.DB) return false;
  try {
    await env.DB.prepare(PASS_SCHEMA).run();
    return !!await env.DB.prepare('DELETE FROM auth_turnstile_passes WHERE nonce = ? AND ip_hash = ? AND expires > ? RETURNING nonce').bind(nonce, hash, Date.now()).first();
  } catch { return false; }
}

export const STATE_SCHEMA = 'CREATE TABLE IF NOT EXISTS auth_turnstile_oauth_states (state TEXT PRIMARY KEY, ip_hash TEXT NOT NULL, expires INTEGER NOT NULL)';
export async function saveOAuthState(request, env, state) {
  const hash = await ipHash(request);
  if (!hash || !env.DB) throw Error('security_check_unavailable');
  await env.DB.prepare(STATE_SCHEMA).run();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_turnstile_oauth_states WHERE expires <= ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO auth_turnstile_oauth_states (state, ip_hash, expires) VALUES (?, ?, ?)').bind(state, hash, Date.now() + 600000)
  ]);
}
export async function consumeOAuthState(request, env, state) {
  const hash = await ipHash(request);
  if (!hash || !env.DB) return false;
  try {
    await env.DB.prepare(STATE_SCHEMA).run();
    return !!await env.DB.prepare('DELETE FROM auth_turnstile_oauth_states WHERE state = ? AND ip_hash = ? AND expires > ? RETURNING state').bind(state, hash, Date.now()).first();
  } catch { return false; }
}
