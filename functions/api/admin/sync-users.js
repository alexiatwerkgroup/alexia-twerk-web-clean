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
    console.log('[sync-users] Fetching D1 users and profiles...');

    // Get all users from D1
    const d1Users = await env.DB.prepare(
      'SELECT id, email, password_hash, created_at, email_verified FROM users'
    ).all();

    console.log(`[sync-users] Found ${d1Users.results.length} users in D1`);

    // Get all profiles from D1
    const d1Profiles = await env.DB.prepare(
      'SELECT id, email, username, tokens, total_earned, seconds_on_site, cuts_watched, streak, tier, last_active_at, last_seen_at FROM profiles ORDER BY last_active_at DESC'
    ).all();

    console.log(`[sync-users] Found ${d1Profiles.results.length} profiles in D1`);

    if (!d1Users.results || d1Users.results.length === 0) {
      return json({ ok: true, message: 'No users to sync', synced: 0, skipped: 0, errors: 0 });
    }

    let syncedUsers = 0;
    let syncedProfiles = 0;
    let skipped = 0;
    let errors = 0;

    // First, sync all users to Supabase users table
    console.log('[sync-users] Syncing users...');
    for (const user of d1Users.results) {
      try {
        const userData = {
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          created_at: user.created_at,
          email_verified: user.email_verified
        };

        const userResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/users?on_conflict=id`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(userData)
          }
        );

        if (userResponse.ok) {
          console.log(`[sync-users] Synced user ${user.email}`);
          syncedUsers++;
        } else {
          console.error(`[sync-users] Failed to sync user ${user.email}: ${userResponse.status}`);
          errors++;
        }
      } catch (e) {
        console.error(`[sync-users] Exception syncing user ${user.email}:`, e && e.message);
        errors++;
      }
    }

    // Now sync profiles to Supabase
    console.log('[sync-users] Syncing profiles...');
    for (const profile of d1Profiles.results) {
      try {
        console.log(`[sync-users] Processing ${profile.email} (${profile.id})`);

        // Check if user already exists in Supabase by ID
        const checkResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}&select=id`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        );

        let existing = [];
        if (checkResponse.ok) {
          existing = await checkResponse.json();
        } else {
          console.warn(`[sync-users] Check query failed for ${profile.email}: ${checkResponse.status}`);
        }

        if (existing.length > 0) {
          console.log(`[sync-users] Skipping ${profile.email} (already in Supabase)`);
          skipped++;
          continue;
        }

        // Insert profile into Supabase
        const now = new Date().toISOString();
        const profileData = {
          id: profile.id,
          email: profile.email,
          username: profile.username || null,
          tokens: profile.tokens || 0,
          total_earned: profile.total_earned || 0,
          seconds_on_site: profile.seconds_on_site || 0,
          cuts_watched: profile.cuts_watched || 0,
          streak: profile.streak || 0,
          tier: profile.tier || 'basic',
          last_active_at: profile.last_active_at || now,
          last_seen_at: profile.last_seen_at || now
        };

        // Use UPSERT (on_conflict=id) to handle duplicates
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(profileData)
          }
        );

        if (insertResponse.ok) {
          console.log(`[sync-users] Synced profile ${profile.email}`);
          syncedProfiles++;
        } else {
          let errText = '';
          try {
            errText = await insertResponse.text();
          } catch (_) {
            errText = 'Could not read error text';
          }
          console.error(`[sync-users] Profile insert failed for ${profile.email}: ${insertResponse.status} - ${errText}`);
          // Log the actual profile data being sent for debugging
          console.error(`[sync-users] Profile data:`, JSON.stringify(profileData));
          errors++;
        }
      } catch (e) {
        console.error(`[sync-users] Exception syncing ${profile.email}:`, e && e.message);
        errors++;
      }
    }

    console.log(`[sync-users] Sync complete: ${syncedUsers} users synced, ${syncedProfiles} profiles synced, ${skipped} skipped, ${errors} errors`);

    return json({
      ok: true,
      message: 'Sync complete',
      syncedUsers,
      syncedProfiles,
      totalProfiles: d1Profiles.results.length,
      totalUsers: d1Users.results.length,
      skipped,
      errors
    }, 200);

  } catch (err) {
    console.error('[sync-users] Fatal error:', err && err.message);
    return json(
      { ok: false, error: 'sync_failed', message: err?.message || 'unknown_error' },
      500
    );
  }
}
