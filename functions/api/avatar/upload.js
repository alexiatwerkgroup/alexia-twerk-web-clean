// POST /api/avatar/upload   (auth required)
//   body: { data: 'data:image/jpeg;base64,...' }   OR   raw multipart/form-data
//   → { ok, url }
//
// Uploads the image to Cloudflare R2 (bucket binding: AVATARS) and returns
// a public URL. Updates profiles.avatar_url to that URL.
//
// This replaces the base64-in-DB approach (which bloated the row to 30-60KB
// per user). With R2 the DB row is tiny (just the URL) and avatars are
// served from Cloudflare's edge with proper caching.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';

const MAX_BYTES = 2 * 1024 * 1024;  // 2 MB hard cap
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) return null;
  const b64 = m[2];
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, mime };
  } catch {
    return null;
  }
}

function extFromMime(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.AVATARS) return json({ ok: false, error: 'r2_binding_missing' }, 500, origin);

  const me = await authenticate(request, env);
  if (!me || !me.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  // Accept either JSON body with { data: 'data:image/...' } or raw multipart.
  let bytes = null;
  let mime = null;

  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    const body = await readJSON(request);
    if (!body || !body.data) return json({ ok: false, error: 'missing_data' }, 400, origin);
    const decoded = dataUrlToBytes(body.data);
    if (!decoded) return json({ ok: false, error: 'invalid_data_url' }, 400, origin);
    bytes = decoded.bytes;
    mime = decoded.mime;
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') return json({ ok: false, error: 'no_file' }, 400, origin);
      if (!ALLOWED_MIME.includes(file.type)) {
        return json({ ok: false, error: 'unsupported_mime', detail: file.type }, 400, origin);
      }
      bytes = new Uint8Array(await file.arrayBuffer());
      mime = file.type;
    } catch (e) {
      return json({ ok: false, error: 'multipart_parse_failed' }, 400, origin);
    }
  } else {
    return json({ ok: false, error: 'unsupported_content_type' }, 415, origin);
  }

  if (!bytes || bytes.length === 0) return json({ ok: false, error: 'empty_payload' }, 400, origin);
  if (bytes.length > MAX_BYTES) return json({ ok: false, error: 'too_large', max: MAX_BYTES }, 413, origin);

  const ext = extFromMime(mime);
  // Key includes user_id + timestamp so each upload is a fresh URL (cache-buster
  // for the browser when user changes avatar).
  const key = `avatars/${me.sub}/${Date.now()}.${ext}`;

  try {
    await env.AVATARS.put(key, bytes, {
      httpMetadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return json({ ok: false, error: 'r2_put_failed', detail: e && e.message }, 500, origin);
  }

  // Public URL is served via /avatar/[...path] worker route (defined separately).
  // If a custom R2 public domain is set in env.AVATARS_PUBLIC_BASE, use that.
  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '');
  const publicBase = env.AVATARS_PUBLIC_BASE
    ? String(env.AVATARS_PUBLIC_BASE).replace(/\/+$/, '')
    : `${siteOrigin}/avatars`;
  const publicUrl = `${publicBase}/${me.sub}/${key.split('/').slice(-1)[0]}`;

  // Update DB: clear any old base64 data, store the new R2 URL.
  try {
    await env.DB.prepare(
      'UPDATE profiles SET avatar_url = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
      .bind(publicUrl, me.sub)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  return json({ ok: true, url: publicUrl, key }, 200, origin);
}
