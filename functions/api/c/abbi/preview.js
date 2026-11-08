import { validModelN, catalogStorage, isPublished } from '../../../_lib/catalog.js';

export async function onRequestGet({ request, env }) {
  const n = new URL(request.url).searchParams.get('n') || '';
  if (!validModelN('abbi', n)) return new Response('bad_request', { status: 400 });
  if (!(await isPublished(env, 'abbi', n))) return new Response('not_found', { status: 404 });
  const storage = catalogStorage(env, 'abbi');
  if (!storage || !env.DB) return new Response('not_configured', { status: 503 });
  const key = `preview-v1/abbi/v${n}.mp4`;
  const head = await storage.head(key);
  if (!head?.size) return new Response('not_found', { status: 404 });

  const range = request.headers.get('Range');
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  let status = 200, start = 0, end = head.size - 1;
  if (match) {
    if (match[1] === '') start = Math.max(0, head.size - parseInt(match[2], 10));
    else start = parseInt(match[1], 10);
    if (match[2] && match[1]) end = Math.min(end, parseInt(match[2], 10));
    if (start > end || start >= head.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${head.size}` } });
    status = 206;
  }
  const length = end - start + 1;
  const obj = await storage.get(key, match ? { range: { offset: start, length } } : undefined);
  return new Response(obj.body, { status, headers: {
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(length),
    ...(match ? { 'Content-Range': `bytes ${start}-${end}/${head.size}` } : {}),
    'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', 'X-Preview-Duration': '10'
  }});
}
