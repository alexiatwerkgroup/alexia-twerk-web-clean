// GET /api/auth/google/start
//   → 302 redirect to Google OAuth consent screen
//
// Initiates the Google OAuth flow. We use the standard Authorization Code
// flow with PKCE (S256). State + verifier stored in HttpOnly cookies.

import { json, preflight } from '../../../_lib/http.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = 'openid email profile';

function bytesToB64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256B64Url(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return bytesToB64Url(new Uint8Array(buf));
}

function randomB64Url(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return bytesToB64Url(b);
}

function setCookie(name, value, maxAgeSec) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax; Secure; HttpOnly`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.GOOGLE_CLIENT_ID) {
    return json({ ok: false, error: 'oauth_not_configured' }, 503, origin);
  }

  const state = randomB64Url(24);
  const verifier = randomB64Url(48);
  const challenge = await sha256B64Url(verifier);

  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '');
  const redirectUri = `${siteOrigin}/api/auth/google/callback`;

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');

  const headers = new Headers();
  headers.set('Location', url.toString());
  headers.append('Set-Cookie', setCookie('twk_oauth_state', state, 600));
  headers.append('Set-Cookie', setCookie('twk_oauth_verifier', verifier, 600));

  return new Response(null, { status: 302, headers });
}
