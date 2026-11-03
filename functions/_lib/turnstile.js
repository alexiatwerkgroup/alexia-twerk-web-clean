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

