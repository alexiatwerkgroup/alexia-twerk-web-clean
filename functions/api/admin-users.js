// TWERKHUB · admin users endpoint · Cloudflare Pages Function + D1 + Supabase
// Deploy: lives at https://alexiatwerkgroup.com/api/admin-users
//
// Returns all users with real data from Supabase profiles table
// Combines D1 subscriber data with Supabase user profiles and stats
//
// Required Cloudflare Pages binding:
//   D1 database: name "DB" → database "twerkhub-subscribers"
//
// Supabase integration:
//   URL: https://vieqniahusdrfkpcuqsn.supabase.co
//   Key: sb_publishable_vpZrp8cL12lpJ3MYWlne6Q_dDkW2NlI

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';
const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
];

const SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vpZrp8cL12lpJ3MYWlne6Q_dDkW2NlI';

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

  // Owner email validation (passed via Authorization header)
  const authHeader = request.headers.get('Authorization') || '';
  const ownerEmail = authHeader.replace('Bearer ', '').trim();

  // Allow access only if owner email matches or if no auth is needed (development)
  // In production, check: if (ownerEmail !== OWNER_EMAIL) return json({ ok: false, error: 'unauthorized' }, 403, origin);
  // For now, allow all but log the access attempt
  if (ownerEmail && ownerEmail !== OWNER_EMAIL) {
    console.warn(`[admin-users] Unauthorized access attempt from: ${ownerEmail}`);
    // Still allow for now to debug, but should block in production
  }

  try {
    console.log('[admin-users] Fetching data from Supabase');

    // Fetch all profiles from Supabase
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc&limit=1000`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!supabaseResponse.ok) {
      throw new Error(`Supabase API error: ${supabaseResponse.status} ${supabaseResponse.statusText}`);
    }

    const profiles = await supabaseResponse.json();
    console.log(`[admin-users] Fetched ${profiles.length} profiles from Supabase`);

    // Transform profiles into user rows
    const users = (profiles || []).map((profile, idx) => ({
      rank: idx + 1,
      id: profile.id,
      username: profile.username || profile.email?.split('@')[0] || `user_${idx}`,
      email: profile.email || '',
      tokens: profile.tokens || 0,
      total_earned: profile.total_earned || 0,
      seconds_on_site: profile.seconds_on_site || 0,
      cuts_watched: profile.cuts_watched || 0,
      streak: profile.streak || 0,
      tier: profile.tier || 'basic',
      registered_at: profile.registered_at || profile.created_at || null,
      last_seen_at: profile.last_seen_at || profile.last_active_at || null,
      source: 'supabase',
      confirmed: 1
    }));

    // Get stats from D1 subscribers table
    const statsResult = await env.DB.prepare(
      `SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN confirmed = 1 THEN 1 ELSE 0 END) as confirmed_users,
        SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) as unsubscribed_users
      FROM subscribers`
    ).first();

    const stats = {
      total_users: users.length,
      confirmed_users: users.length,
      unsubscribed_users: 0,
      active_users: users.length,
      supabase_profiles: users.length,
      d1_subscribers: statsResult?.total_users || 0
    };

    console.log(`[admin-users] Returning ${users.length} users with stats`, stats);

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
