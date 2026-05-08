// POST /api/auth/signout
// Clears the session cookie. JWT remains technically valid until exp,
// but client-side will discard it.

import { json, preflight, clearSessionCookie } from '../../_lib/http.js';

export async function onRequest(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);

  return json({ ok: true }, 200, origin, { 'Set-Cookie': clearSessionCookie() });
}
