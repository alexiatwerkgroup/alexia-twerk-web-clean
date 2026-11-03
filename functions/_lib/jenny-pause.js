import { isJennyOpen, launchPage } from './jenny-launch.js';
// Temporary pause: keep purchases and the SFW catalog intact. Remove this gate to reopen.


export async function explicitPauseResponse(request) {
  if (isJennyOpen()) return null;
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/').toLowerCase(); }
  catch { return null; }
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex,nofollow' };
  if (/^\/jenny\/uncensored(?:\/|\.html|$)/.test(path)) {
    return new Response(request.method === 'HEAD' ? null : launchPage(), {
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  // Includes covers and promotional teasers, as well as direct preview URLs.
  const preview = /^\/jenny\/p\/(?:x\d+|tz\d+)\./.test(path);
  let explicit = /^\/api\/jenny\/video\/?$/.test(path) && /^x/i.test(url.searchParams.get('n') || '');
  if (/^\/api\/jenny\/unlock\/?$/.test(path) && request.method === 'POST') {
    try { explicit = /^x/i.test(String((await request.clone().json()).n || '')); } catch {}
  }
  if (preview || explicit) return new Response(JSON.stringify({ ok: false, error: 'temporarily_unavailable', message: 'very soon' }), {
    status: 403, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  });
  return null;
}
