// GET  /api/profile/me  → { ok, profile }     (auth required)
// POST /api/profile/me  body: { username?, bio?, avatar_url? }
//
// Read or update own profile. Username uniqueness checked.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';

const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/i;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  if (!env.JWT_SECRET) return json({ ok: false, error: 'jwt_secret_missing' }, 500, origin);

  const payload = await authenticate(request, env);
  if (!payload || !payload.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  // ─── GET ─────────────────────────────────────────────────────────────
  if (request.method === 'GET') {
    const profile = await env.DB.prepare(
      `SELECT id, email, username, bio, avatar_url, tokens, total_earned, streak,
              last_login_date, welcomed, tier, last_active_at, registered_at,
              seconds_on_site, cuts_watched, last_seen_at
         FROM profiles WHERE id = ?`
    )
      .bind(payload.sub)
      .first();
    if (!profile) return json({ ok: false, error: 'profile_not_found' }, 404, origin);
    return json({ ok: true, profile }, 200, origin);
  }

  // ─── POST (update) ───────────────────────────────────────────────────
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const updates = [];
  const binds = [];

  if (body.username !== undefined) {
    const u = String(body.username || '').trim();
    if (u && !USERNAME_RE.test(u)) return json({ ok: false, error: 'invalid_username' }, 400, origin);
    if (u) {
      const taken = await env.DB.prepare(
        'SELECT id FROM profiles WHERE LOWER(username) = LOWER(?) AND id != ?'
      )
        .bind(u, payload.sub)
        .first();
      if (taken) return json({ ok: false, error: 'username_taken' }, 409, origin);
    }
    updates.push('username = ?');
    binds.push(u || null);
  }
  if (body.bio !== undefined) {
    const b = String(body.bio || '').slice(0, 500);
    updates.push('bio = ?');
    binds.push(b || null);
  }
  if (body.avatar_url !== undefined) {
    // Accept base64 data URLs up to 200KB (covers a 240x240 JPEG @ 0.85 quality
    // which is ~30-60KB typically). Larger uploads should go to R2 — Phase 4.
    const a = String(body.avatar_url || '').slice(0, 200000);
    if (a && !/^(data:image\/(png|jpeg|jpg|webp);base64,|https?:\/\/)/i.test(a)) {
      return json({ ok: false, error: 'invalid_avatar_format' }, 400, origin);
    }
    updates.push('avatar_url = ?');
    binds.push(a || null);
  }

  if (!updates.length) return json({ ok: false, error: 'nothing_to_update' }, 400, origin);

  updates.push("last_active_at = CURRENT_TIMESTAMP");
  binds.push(payload.sub);

  try {
    await env.DB.prepare(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...binds)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  const profile = await env.DB.prepare(
    `SELECT id, email, username, bio, avatar_url, tokens, total_earned, streak,
            tier, last_active_at, registered_at, seconds_on_site, cuts_watched
       FROM profiles WHERE id = ?`
  )
    .bind(payload.sub)
    .first();

  return json({ ok: true, profile }, 200, origin);
}
