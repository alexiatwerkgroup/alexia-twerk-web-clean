// TWERKHUB · email subscribe endpoint · Cloudflare Pages Function + D1
// Deploy: lives at https://alexiatwerkgroup.com/api/subscribe
//
// Required Cloudflare Pages binding:
//   D1 database: name "DB" → database "twerkhub-subscribers"
//   (Settings → Functions → D1 database bindings → Add binding)
//
// No external services, no env vars, no egress. Pure Cloudflare.
// Schema: see d1-subscribers-schema.sql

const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
];

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  }

  // D1 binding check
  if (!env.DB) {
    return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400, origin);
  }

  // Honeypot — if filled, it's a bot. Pretend success.
  if (payload.hp && String(payload.hp).trim() !== '') {
    return json({ ok: true, message: 'subscribed' }, 200, origin);
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const source = String(payload.source || 'home_modal').slice(0, 64);

  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return json({ ok: false, error: 'invalid_email' }, 400, origin);
  }

  // Block obvious throwaways
  const banned = ['mailinator.com', 'guerrillamail.', 'tempmail.', 'yopmail.com', 'trashmail.'];
  if (banned.some((d) => email.includes(d))) {
    return json({ ok: false, error: 'invalid_email' }, 400, origin);
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '';
  const ua = request.headers.get('User-Agent') || '';

  // Insert into D1 (idempotent: ignore duplicates by unique constraint on email)
  try {
    await env.DB.prepare(
      `insert or ignore into subscribers (email, source, ip, user_agent)
       values (?, ?, ?, ?)`
    )
      .bind(email, source, ip.slice(0, 64), ua.slice(0, 256))
      .run();

    return json({ ok: true, message: 'subscribed' }, 200, origin);
  } catch (err) {
    console.error('D1 insert failed', err && err.message);
    return json({ ok: false, error: 'storage_failed' }, 500, origin);
  }
}
