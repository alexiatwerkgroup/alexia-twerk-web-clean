// GET /api/auth/google/callback?code=...&state=...
//   → 302 redirect to / with auth cookie set
//
// Exchanges the auth code for tokens, fetches user info from Google,
// creates or links the user in D1, issues our own JWT.

import { signJWT, uuidv4 } from '../../../_lib/auth.js';
import { setSessionCookie } from '../../../_lib/http.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function clearCookie(name) {
  return `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure; HttpOnly`;
}

function redirect(siteOrigin, query) {
  const headers = new Headers();
  headers.set('Location', siteOrigin + '/' + (query || ''));
  return { headers };
}

export async function onRequest(context) {
  const { request, env } = context;
  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '');

  if (!env.DB || !env.JWT_SECRET || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    const r = redirect(siteOrigin, '?oauth_error=not_configured');
    return new Response(null, { status: 302, headers: r.headers });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    const r = redirect(siteOrigin, '?oauth_error=' + encodeURIComponent(errorParam));
    return new Response(null, { status: 302, headers: r.headers });
  }

  const expectedState = getCookie(request, 'twk_oauth_state');
  const verifier = getCookie(request, 'twk_oauth_verifier');

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    const r = redirect(siteOrigin, '?oauth_error=invalid_state');
    return new Response(null, { status: 302, headers: r.headers });
  }

  // Exchange code for tokens
  const redirectUri = siteOrigin + '/api/auth/google/callback';
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const r = redirect(siteOrigin, '?oauth_error=token_exchange_failed');
    return new Response(null, { status: 302, headers: r.headers });
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    const r = redirect(siteOrigin, '?oauth_error=no_access_token');
    return new Response(null, { status: 302, headers: r.headers });
  }

  // Fetch user info
  const userRes = await fetch(USERINFO_URL, {
    headers: { 'Authorization': 'Bearer ' + accessToken },
  });
  if (!userRes.ok) {
    const r = redirect(siteOrigin, '?oauth_error=userinfo_failed');
    return new Response(null, { status: 302, headers: r.headers });
  }
  const userInfo = await userRes.json();
  const email = String(userInfo.email || '').toLowerCase().trim();
  const verifiedEmail = !!userInfo.email_verified;
  const googleSub = userInfo.sub;
  const fullName = userInfo.name || '';

  if (!email || !verifiedEmail) {
    const r = redirect(siteOrigin, '?oauth_error=unverified_email');
    return new Response(null, { status: 302, headers: r.headers });
  }

  // Find or create user in D1
  let user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first();
  let userId;

  if (user) {
    userId = user.id;
    // Mark email_verified=1 (Google confirmed it)
    try {
      await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
    } catch (_) {}
  } else {
    // Create new user. Password_hash is set to a sentinel "oauth:google:<sub>"
    // since the user can't log in via password — only via Google.
    userId = uuidv4();
    const passwordHash = 'oauth:google:' + googleSub;
    try {
      // Generate a unique-ish username from name or email
      let baseUsername = (fullName || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 20) || 'user';
      let username = baseUsername;
      let attempt = 0;
      while (attempt < 10) {
        const taken = await env.DB.prepare('SELECT id FROM profiles WHERE LOWER(username) = LOWER(?)').bind(username).first();
        if (!taken) break;
        attempt++;
        username = baseUsername + Math.floor(Math.random() * 9000 + 1000);
      }
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, 1)').bind(userId, email, passwordHash),
        env.DB.prepare(
          'INSERT INTO profiles (id, email, username, last_active_at, last_seen_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
        ).bind(userId, email, username),
      ]);
    } catch (e) {
      const r = redirect(siteOrigin, '?oauth_error=signup_failed');
      return new Response(null, { status: 302, headers: r.headers });
    }
  }

  // Issue JWT
  const jwt = await signJWT({ sub: userId, email }, env.JWT_SECRET);

  // Redirect to home with cookie set. We ALSO put the token in the URL
  // fragment (#twk_token=...) so client-side JS can copy it into
  // localStorage `alexia-auth-v3` (the explicit Authorization Bearer source).
  // Fragments aren't sent to the server, so this is safe in URL.
  const profile = await env.DB.prepare('SELECT username FROM profiles WHERE id = ?').bind(userId).first();
  const userPayload = encodeURIComponent(JSON.stringify({
    id: userId,
    email: email,
    username: (profile && profile.username) || null,
  }));

  const headers = new Headers();
  headers.set('Location', `${siteOrigin}/#twk_oauth_done=1&twk_token=${encodeURIComponent(jwt)}&twk_user=${userPayload}`);
  headers.append('Set-Cookie', setSessionCookie(jwt));
  headers.append('Set-Cookie', clearCookie('twk_oauth_state'));
  headers.append('Set-Cookie', clearCookie('twk_oauth_verifier'));

  return new Response(null, { status: 302, headers });
}
