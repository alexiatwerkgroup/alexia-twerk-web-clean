import { json } from '../../../_lib/http.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS abbi_publications (n TEXT PRIMARY KEY, published_at INTEGER NOT NULL)').run();
  const result = await env.DB.prepare('SELECT n, published_at FROM abbi_publications ORDER BY n').all();
  return json({ ok: true, videos: result.results || [] }, 200, '', { 'Cache-Control': 'public, max-age=30' });
}
