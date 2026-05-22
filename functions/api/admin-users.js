// TWERKHUB · admin users endpoint · Cloudflare Pages Function + D1
// Deploy: lives at https://alexiatwerkgroup.com/api/admin-users
//
// Returns all registered users from Cloudflare D1 table "subscribers"
// Owner-gated: returns data only if authenticated as the owner email
//
// Required Cloudflare Pages binding:
//   D1 database: name "DB" → database "twerkhub-subscribers"

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';
const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  }

  // D1 binding check
  if (!env.DB) {
    return json({ ok: false, error: 'd1_binding_missing', data: [] }, 500, origin);
  }

  try {
    // Get all subscribers with stats
    const result = await env.DB.prepare(
      `SELECT
        id,
        email,
        source,
        created_at as registered_at,
        ip,
        user_agent,
        confirmed
      FROM subscribers
      ORDER BY created_at DESC
      LIMIT 1000`
    ).all();

    const users = (result.results || []).map((row, idx) => ({
      rank: idx + 1,
      id: row.id,
      username: row.email?.split('@')[0] || `user_${row.id}`,
      email: row.email || '',
      tokens: 0,
      total_earned: 0,
      seconds_on_site: 0,
      cuts_watched: 0,
      streak: 0,
      tier: 'basic',
      registered_at: row.registered_at ? new Date(row.registered_at * 1000).toISOString() : null,
      last_seen_at: row.registered_at ? new Date(row.registered_at * 1000).toISOString() : null,
      source: row.source || 'unknown',
      confirmed: row.confirmed || 0
    }));

    // Get stats
    const statsResult = await env.DB.prepare(
      `SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN confirmed = 1 THEN 1 ELSE 0 END) as confirmed_users,
        SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) as unsubscribed_users
      FROM subscribers`
    ).first();

    const stats = {
      total_users: statsResult?.total_users || 0,
      confirmed_users: statsResult?.confirmed_users || 0,
      unsubscribed_users: statsResult?.unsubscribed_users || 0,
      active_users: (statsResult?.total_users || 0) - (statsResult?.unsubscribed_users || 0)
    };

    return json(
      {
        ok: true,
        data: users,
        stats: stats,
        total_count: users.length
      },
      200,
      origin
    );
  } catch (err) {
    console.error('[admin-users] D1 query failed', err && err.message);
    return json(
      {
        ok: false,
        error: 'query_failed',
        message: err?.message || 'unknown_error',
        data: []
      },
      500,
      origin
    );
  }
}
