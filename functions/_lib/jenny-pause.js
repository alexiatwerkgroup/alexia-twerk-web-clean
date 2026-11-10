import { isJennyOpen, launchPage } from './jenny-launch.js';
// Temporary pause: keep purchases and the SFW catalog intact. Remove this gate to reopen.


export async function explicitPauseResponse(request) {
  if (isJennyOpen()) return null;
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/').toLowerCase(); }
  catch { return null; }
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex,nofollow' };
  if (/^\/jenny(?:\/(?:index\.html)?)?$/.test(path)) {
    return new Response(request.method === 'HEAD' ? null : launchPage(), {
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  // Global maintenance: block every Jenny media URL and unlock attempt, while leaving pages visible.
  const preview = /^\/jenny\/p\/.+\.(?:mp4|jpg|jpeg|png|webp)$/i.test(path);
  const mediaApi = /^\/api\/jenny\/video\/?$/.test(path);
  const unlockApi = /^\/api\/jenny\/unlock\/?$/.test(path);
  if (preview || mediaApi || unlockApi) return new Response(JSON.stringify({ ok: false, error: 'temporarily_unavailable', message: 'Jenny videos are temporarily under maintenance.' }), {
    status: 403, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  });
  return null;
}
