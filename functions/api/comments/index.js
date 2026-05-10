// GET  /api/comments?page=:slug&limit=N&offset=N
//   → { ok, comments: [...], total }
//
// POST /api/comments  body: { page_slug, body }   (auth required)
//   → { ok, comment }
//
// Public read (anyone), authenticated write. Body trimmed/limited to 2000
// chars. Anti-spam: throttled to 1 comment / 5s per user (server-side).

import { authenticate, uuidv4 } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';

const MIN_COMMENT_LEN = 1;
const MAX_COMMENT_LEN = 2000;
const RATE_WINDOW_MS = 5000;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  // ─── GET (list) ─────────────────────────────────────────────────────
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const slug = (url.searchParams.get('page') || '').slice(0, 256);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0);
    if (!slug) return json({ ok: false, error: 'missing_page' }, 400, origin);

    const rows = await env.DB.prepare(
      `SELECT id, page_slug, body, author_name, username_snapshot, user_id,
              likes_count, created_at
         FROM video_comments WHERE page_slug = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
    )
      .bind(slug, limit, offset)
      .all();

    const total = await env.DB.prepare(
      'SELECT COUNT(*) as n FROM video_comments WHERE page_slug = ?'
    )
      .bind(slug)
      .first();

    return json({ ok: true, comments: (rows && rows.results) || [], total: (total && total.n) || 0 }, 200, origin);
  }

  // ─── POST (create) ──────────────────────────────────────────────────
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);

  const me = await authenticate(request, env);
  if (!me || !me.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  const slug = String(body.page_slug || '').trim().slice(0, 256);
  const text = String(body.body || '').trim();
  if (!slug) return json({ ok: false, error: 'missing_page_slug' }, 400, origin);
  if (text.length < MIN_COMMENT_LEN || text.length > MAX_COMMENT_LEN) {
    return json({ ok: false, error: 'invalid_body_length' }, 400, origin);
  }

  // Rate limit: deny if last comment by this user < 5s ago
  const last = await env.DB.prepare(
    "SELECT created_at FROM video_comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
  )
    .bind(me.sub)
    .first();
  if (last && last.created_at) {
    const lastMs = Date.parse(last.created_at + 'Z') || 0;
    if (lastMs && Date.now() - lastMs < RATE_WINDOW_MS) {
      return json({ ok: false, error: 'rate_limited' }, 429, origin);
    }
  }

  // Snapshot author info from profile at post time
  const profile = await env.DB.prepare(
    'SELECT username, email FROM profiles WHERE id = ?'
  )
    .bind(me.sub)
    .first();

  const id = uuidv4();
  const username = (profile && profile.username) || null;
  const authorName = username || (profile && profile.email ? String(profile.email).split('@')[0] : 'anon');

  try {
    await env.DB.prepare(
      `INSERT INTO video_comments (id, page_slug, body, author_name, username_snapshot, user_id, likes_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(id, slug, text, authorName, username, me.sub)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  const comment = {
    id,
    page_slug: slug,
    body: text,
    author_name: authorName,
    username_snapshot: username,
    user_id: me.sub,
    likes_count: 0,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  return json({ ok: true, comment }, 200, origin);
}
