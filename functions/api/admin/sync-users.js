// POST /api/admin/sync-users
// Admin endpoint to sync D1 profiles → Supabase profiles
// Idempotent: won't duplicate existing users
// Requires: Authorization header with owner email

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';
const SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vpZrp8cL12lpJ3MYWlne6Q_dDkW2NlI';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  if (!env.DB) {
    return json({ ok: false, error: 'd1_binding_missing' }, 500);
  }

  // Owner email validation
  const authHeader = request.headers.get('Authorization') || '';
  const ownerEmail = authHeader.replace('Bearer ', '').trim();

  if (ownerEmail !== OWNER_EMAIL) {
    console.warn(`[sync-users] Unauthorized access attempt from: ${ownerEmail}`);
    return json({ ok: false, error: 'unauthorized' }, 403);
  }

  try {
    console.log('[sync-users] Fetching D1 profiles...');

    // Get all profiles from D1
    const d1Profiles = await env.DB.prepare(
      'SELECT id, email, username, tokens, total_earned, seconds_on_site, cuts_watched, streak, tier, last_active_at, last_seen_at FROM profiles ORDER BY last_active_at DESC'
    ).all();

    console.log(`[sync-users] Found ${d1Profiles.results.length} profiles in D1`);

    if (!d1Profiles.results || d1Profiles.results.length === 0) {
      return json({ ok: true, message: 'No profiles to sync', synced: 0, skipped: 0, errors: 0 });
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    // Sync each profile to Supabase
    for (const profile of d1Profiles.results) {
      try {
        // Check if user already exists in Supabase by ID
        const checkResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}&select=id`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        );

        const existing = checkResponse.ok ? await checkResponse.json() : [];

        if (existing.length > 0) {
          console.log(`[sync-users] Skipping ${profile.email} (already in Supabase)`);
          skipped++;
          continue;
        }

        // Insert profile into Supabase
        const now = new Date().toISOString();
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              id: profile.id,
              email: profile.email,
              username: profile.username,
              tokens: profile.tokens || 0,
              total_earned: profile.total_earned || 0,
              seconds_on_site: profile.seconds_on_site || 0,
              cuts_watched: profile.cuts_watched || 0,
              streak: profile.streak || 0,
              tier: profile.tier || 'basic',
              created_at: now,
              last_active_at: profile.last_active_at || now,
              last_seen_at: profile.last_seen_at || now
            })
          }
        );

        if (insertResponse.ok) {
          console.log(`[sync-users] Synced ${profile.email}`);
          synced++;
        } else {
          console.error(`[sync-users] Failed to sync ${profile.email}: ${insertResponse.status}`);
          errors++;
        }
      } catch (e) {
        console.error(`[sync-users] Error syncing ${profile.email}:`, e && e.message);
        errors++;
      }
    }

    console.log(`[sync-users] Sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`);

    return json({
      ok: true,
      message: 'Sync complete',
      synced,
      skipped,
      errors,
      total: d1Profiles.results.length
    }, 200);

  } catch (err) {
    console.error('[sync-users] Fatal error:', err && err.message);
    return json(
      { ok: false, error: 'sync_failed', message: err?.message || 'unknown_error' },
      500
    );
  }
}
