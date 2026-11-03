import { REOPEN_AT, isJennyOpen } from '../../_lib/jenny-launch.js';
export function onRequestGet() {
  const now = Date.now();
  return Response.json({ now, reopens_at: REOPEN_AT, open: isJennyOpen(now) }, { headers: { 'Cache-Control': 'no-store' } });
}
