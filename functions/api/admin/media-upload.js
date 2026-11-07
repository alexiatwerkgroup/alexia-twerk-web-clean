import { authenticate } from '../../_lib/auth.js';
import { catalogStorage } from '../../_lib/catalog.js';
const OWNER = 'alexiatwerkoficial@gmail.com';
const CHUNK = 16 * 1024 * 1024;
const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
async function tables(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS lolita_uploads (key TEXT PRIMARY KEY, upload_id TEXT NOT NULL, size INTEGER NOT NULL, status TEXT NOT NULL DEFAULT \'uploading\', created INTEGER NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS lolita_upload_parts (key TEXT NOT NULL, n INTEGER NOT NULL, etag TEXT NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY (key,n))').run();
}
export async function onRequest({ request, env }) {
  if (!env.DB) return reply({ error: 'not_configured' }, 503);
  const identity = await authenticate(request, env).catch(() => null);
  if (!identity?.sub) return reply({ error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(user?.email || '').toLowerCase() !== OWNER) return reply({ error: 'owner_only' }, 403);
  const url = new URL(request.url), action = url.searchParams.get('action');
  const requestedModel = url.searchParams.get('model') || 'lolita';
  if (!['lolita','tainara','abbi'].includes(requestedModel)) return reply({ error: 'bad_model' }, 400);
  const model = requestedModel;
  const storage = catalogStorage(env, model);
  if (!storage) return reply({ error: 'not_configured' }, 503);
  if (!['GET','POST','PUT'].includes(request.method)) return reply({ error: 'method' }, 405);
  await tables(env.DB);
  if (request.method === 'GET' && action === 'status') {
    const r = await env.DB.prepare('SELECT key,size,status FROM lolita_uploads WHERE key LIKE ? ORDER BY key').bind(model + '/%').all();
    return reply({ ok: true, chunk: CHUNK, files: r.results || [] });
  }
  const name = url.searchParams.get('name') || '';
  if (!/^(?:bonus-)?v(0[1-9]|[1-9][0-9])\.mp4$/.test(name)) return reply({ error: 'bad_name' }, 400);
  if (model === 'abbi' && !/^v(0[1-9]|[12][0-9]|3[0-6])\.mp4$/.test(name)) return reply({ error: 'bad_name' }, 400);
  const key = name.startsWith('bonus-') ? model + '/bonus/' + name.slice(6) : model + '/' + name;
  if (request.method === 'POST' && action === 'init') {
    const body = await request.json().catch(() => ({}));
    const size = Number(body.size);
    if (!Number.isSafeInteger(size) || size < 1 || size > 2 * 1024 ** 3) return reply({ error: 'bad_size' }, 400);
    const existing = await storage.head(key);
    if (existing) {
      const known = await env.DB.prepare('SELECT size,status FROM lolita_uploads WHERE key=?').bind(key).first();
      if (known && known.size === size && existing.size === size) {
        await env.DB.prepare("UPDATE lolita_uploads SET status='complete' WHERE key=?").bind(key).run();
        return reply({ ok: true, complete: true, bytes: existing.size });
      }
      if (!known && model === 'abbi' && existing.size === size) {
        await env.DB.prepare("INSERT INTO lolita_uploads(key,upload_id,size,status,created) VALUES (?,'preexisting',?,'complete',?)").bind(key,size,Date.now()).run();
        return reply({ ok: true, complete: true, bytes: existing.size, preexisting: true });
      }
      return reply({ error: 'object_already_exists' }, 409);
    }
    let row = await env.DB.prepare('SELECT * FROM lolita_uploads WHERE key=?').bind(key).first();
    if (row && row.size !== size) return reply({ error: 'different_file_size' }, 409);
    if (!row) {
      const upload = await storage.createMultipartUpload(key, { httpMetadata: { contentType: 'video/mp4', cacheControl: 'private, no-store' } });
      try {
        await env.DB.prepare('INSERT INTO lolita_uploads(key,upload_id,size,status,created) VALUES (?,?,?,\'uploading\',?)').bind(key,upload.uploadId,size,Date.now()).run();
      } catch {
        await upload.abort();
      }
      row = await env.DB.prepare('SELECT * FROM lolita_uploads WHERE key=?').bind(key).first();
    }
    if (!row) return reply({ error: 'init_failed' }, 503);
    const parts = await env.DB.prepare('SELECT n,bytes FROM lolita_upload_parts WHERE key=? ORDER BY n').bind(key).all();
    return reply({ ok: true, chunk: CHUNK, parts: parts.results || [] });
  }
  const row = await env.DB.prepare('SELECT * FROM lolita_uploads WHERE key=?').bind(key).first();
  if (!row) return reply({ error: 'not_initialized' }, 409);
  const upload = storage.resumeMultipartUpload(key,row.upload_id);
  if (request.method === 'PUT' && action === 'part') {
    if (row.status !== 'uploading') return reply({ error: 'already_complete' }, 409);
    const n = Number(url.searchParams.get('part'));
    if (!Number.isInteger(n) || n < 1 || n > Math.ceil(row.size/CHUNK)) return reply({ error: 'bad_part' }, 400);
    const expected = Math.min(CHUNK,row.size-(n-1)*CHUNK);
    const length = Number(request.headers.get('Content-Length'));
    if (length && length !== expected) return reply({ error: 'bad_part_size' }, 400);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== expected || bytes.byteLength > CHUNK) return reply({ error: 'bad_part_size' }, 400);
    const part = await upload.uploadPart(n,bytes);
    await env.DB.prepare('INSERT INTO lolita_upload_parts(key,n,etag,bytes) VALUES (?,?,?,?) ON CONFLICT(key,n) DO UPDATE SET etag=excluded.etag,bytes=excluded.bytes').bind(key,n,part.etag,bytes.byteLength).run();
    return reply({ ok: true, part: n, bytes: bytes.byteLength });
  }
  if (request.method === 'POST' && action === 'complete') {
    const r = await env.DB.prepare('SELECT n,etag,bytes FROM lolita_upload_parts WHERE key=? ORDER BY n').bind(key).all();
    const parts = r.results || [];
    if (parts.length !== Math.ceil(row.size/CHUNK) || parts.some((p,i)=>p.n!==i+1) || parts.reduce((s,p)=>s+p.bytes,0)!==row.size) return reply({ error: 'missing_parts' }, 409);
    const exists = await storage.head(key);
    if (!exists) await upload.complete(parts.map(p=>({partNumber:p.n,etag:p.etag})));
    const head = await storage.head(key);
    if (!head || head.size !== row.size) return reply({ error: 'size_check_failed' }, 503);
    await env.DB.prepare('UPDATE lolita_uploads SET status=\'complete\' WHERE key=?').bind(key).run();
    return reply({ ok: true, complete: true, bytes: head.size });
  }
  return reply({ error: 'bad_action' }, 400);
}
