// TWERKHUB · HTTP helpers · Cloudflare Pages Function library
// 2026-05-08 · CORS + JSON helpers shared across /api/* endpoints

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
  'http://localhost:8788',
  'http://localhost:3000',
];

export function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function json(body, status = 200, origin = '', extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  });
}

export function preflight(origin) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function readJSON(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function setSessionCookie(token, maxAgeSec = 7 * 24 * 60 * 60) {
  const parts = [
    `twk_jwt=${encodeURIComponent(token)}`,
    `Max-Age=${maxAgeSec}`,
    'Path=/',
    'SameSite=Lax',
    'Secure',
    'HttpOnly',
  ];
  return parts.join('; ');
}

export function clearSessionCookie() {
  return 'twk_jwt=; Max-Age=0; Path=/; SameSite=Lax; Secure; HttpOnly';
}
