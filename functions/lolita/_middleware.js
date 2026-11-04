// Only completed, size-verified uploads activate the public catalog.
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (!['/lolita','/lolita/','/lolita/index.html'].includes(path)) return context.next();
  let complete = 0;
  try {
    const rows = await context.env.DB.prepare("SELECT key FROM lolita_uploads WHERE status='complete'").all();
    const keys = new Set((rows.results || []).map(r => r.key));
    for (let n=1;n<=87;n++) if (keys.has('lolita/v'+String(n).padStart(2,'0')+'.mp4')) complete++;
  } catch {}
  if (complete === 87) return context.next();
  return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lolita · Twerkhub</title><style>body{margin:0;background:#08787b;color:#fff;font:20px system-ui;min-height:100vh;display:grid;place-items:center}main{max-width:650px;padding:32px}h1{color:#ffae00;font-size:54px}p{line-height:1.6}a{color:#ffae00}small{color:#aaa}</style><main><a href="/">TWERKHUB</a><h1>Lolita · very soon</h1><p>Estamos preparando el catálogo completo. Estará disponible cuando termine la carga de todos los videos.</p><p><small>${complete} de 87 videos preparados. Las compras todavía no están habilitadas.</small></p></main></html>`, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
