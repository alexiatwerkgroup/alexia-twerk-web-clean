/**
 * Centralized rate limiting library
 * Stores state in D1 for distributed rate limiting.
 */

export async function checkRateLimit(
  env,
  key,
  window_sec = 60,
  limit = 10
) {
  if (!env.DB) {
    throw new Error('D1 binding not found')
  }

  const now = Math.floor(Date.now() / 1000)
  const window_start = now - window_sec

  try {
    const row = await env.DB.prepare(
      `SELECT count, window_start FROM rate_limits WHERE key = ? AND window_start > ?`
    )
      .bind(key, window_start)
      .first()

    if (row && row.window_start > window_start) {
      const new_count = row.count + 1
      await env.DB.prepare(`UPDATE rate_limits SET count = ? WHERE key = ?`)
        .bind(new_count, key)
        .run()
      return {
        allowed: new_count <= limit,
        count: new_count,
        limit,
        reset_in_seconds: row.window_start + window_sec - now,
      }
    } else {
      await env.DB.prepare(
        `INSERT INTO rate_limits (key, count, window_start) VALUES (?, ?, ?)`
      )
        .bind(key, 1, now)
        .run()
      return {
        allowed: true,
        count: 1,
        limit,
        reset_in_seconds: window_sec,
      }
    }
  } catch (error) {
    console.error(`Rate limit check failed for key ${key}:`, error)
    // Fail open on DB error
    return { allowed: true, count: 0, limit, error: error.message }
  }
}

export function makeUserKey(user_id, action) {
  return `user_${user_id}:${action}`
}

export function makeIpKey(ip, action) {
  return `ip_${ip}:${action}`
}
