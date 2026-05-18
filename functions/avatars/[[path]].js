// GET /avatars/[user_id]/[file]   — serve avatar from R2
//
// Public read, with long cache. Maps URL path to R2 key.
// Allows bypassing the need for a custom R2 public domain.

export async function onRequest(context) {
  const { request, env, params } = context;

  if (!env.AVATARS) return new Response('R2 not configured', { status: 500 });
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const path = (params && params.path) ? (Array.isArray(params.path) ? params.path.join('/') : String(params.path)) : '';
  if (!path) return new Response('Not Found', { status: 404 });

  const key = `avatars/${path}`;

  try {
    const obj = await env.AVATARS.get(key);
    if (!obj) return new Response('Not Found', { status: 404 });

    const headers = new Headers();
    headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('etag', obj.httpEtag);

    if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
    return new Response(obj.body, { status: 200, headers });
  } catch (e) {
    return new Response('R2 read error', { status: 500 });
  }
}
