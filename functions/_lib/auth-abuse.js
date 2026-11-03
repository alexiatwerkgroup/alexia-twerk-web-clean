// Atomic, persistent IP quotas. Only Cloudflare's trusted client-IP header is used.
// Store a keyed hash, never the raw IP. No browser-supplied IP fallback.
export const QUOTA_SCHEMA = 'CREATE TABLE IF NOT EXISTS auth_ip_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)';
export const QUOTA_SQL = `INSERT INTO auth_ip_limits (key, count, expires) VALUES (?, 1, ?)
  ON CONFLICT(key) DO UPDATE SET
    count = CASE WHEN auth_ip_limits.expires <= ? THEN 1 ELSE auth_ip_limits.count + 1 END,
    expires = CASE WHEN auth_ip_limits.expires <= ? THEN excluded.expires ELSE auth_ip_limits.expires END
  WHERE auth_ip_limits.expires <= ? OR auth_ip_limits.count < ?
  RETURNING count, expires`;

function denied(status, error, retryAfter) {
  return new Response(JSON.stringify({ ok: false, error, retryAfter }), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) }
  });
}

export async function limitByIP(context, scope, seconds, max) {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return denied(503, 'security_check_unavailable', 60);
  return limitByIdentity(context, scope, seconds, max, 'ip:' + ip.trim().toLowerCase());
}

export async function limitByIdentity(context, scope, seconds, max, identity) {
  const { env } = context;
  if (!identity || !env.DB || !env.JWT_SECRET) return denied(503, 'security_check_unavailable', 60);
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const hash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(identity))), b => b.toString(16).padStart(2, '0')).join('');
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(QUOTA_SCHEMA).run();
    const row = await env.DB.prepare(QUOTA_SQL).bind(scope + ':' + hash, now + seconds, now, now, now, max).first();
    if (!row) return denied(429, 'rate_limit_exceeded', seconds);
    context.authQuota = { limit: max, remaining: Math.max(0, max - row.count), reset: row.expires };
    return null;
  } catch {
    // Never silently allow unmetered signup when the protection fails.
    return denied(503, 'security_check_unavailable', 60);
  }
}

export async function authAbuseResponse(context) {
  const { request } = context;
  if (request.method !== 'POST') return null;
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const rules = {
    '/api/auth/signup': ['signup-attempt', 3600, 10],
    '/api/auth/signin': ['signin-attempt-hour-v2', 3600, 5],
    '/api/auth/forgot-password': ['password-reset', 3600, 5],
    '/api/auth/send-verification': ['verify-email', 3600, 5]
  };
  const rule = rules[path];
  return rule ? limitByIP(context, ...rule) : null;
}
