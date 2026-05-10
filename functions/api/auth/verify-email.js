// GET /api/auth/verify-email?token=XXX
//   → 302 redirect to /?verified=1 on success, /?verified=0 on failure
//
// One-shot verification endpoint. User clicks the link in email, lands here,
// we mark email_verified=1, redirect to home with a flash flag.

import { consumeToken } from '../../_lib/tokens.js';

const SITE_URL_DEFAULT = 'https://alexiatwerkgroup.com';

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.DB) return new Response('Database not configured', { status: 500 });

  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const siteOrigin = (env.SITE_URL || SITE_URL_DEFAULT).replace(/\/+$/, '');

  function redirect(query) {
    return new Response(null, {
      status: 302,
      headers: { Location: siteOrigin + '/' + (query || '') },
    });
  }

  if (!token) return redirect('?verified=0&reason=missing');

  const result = await consumeToken(env, token, 'email_verification');
  if (!result) return redirect('?verified=0&reason=expired');

  try {
    await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?')
      .bind(result.userId)
      .run();
  } catch (e) {
    return redirect('?verified=0&reason=storage');
  }

  return redirect('?verified=1');
}
