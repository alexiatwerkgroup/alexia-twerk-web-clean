/**
 * Rate Limiter — Centralized rate limiting via D1
 * Prevents: auth brute force, comment spam, API abuse
 * v20260511-v1
 */

/**
 * Check if request exceeds rate limit
 * @param {object} env - Cloudflare env (DB, KVNS)
 * @param {string} key - Rate limit key (user_id, email, IP, etc.)
 * @param {number} windowSeconds - Time window (default: 60)
 * @param {number} maxRequests - Max requests per window (default: 10)
 * @returns {Promise<object>} { allowed: bool, count: int, resetAt: timestamp }
 */
async function checkRateLimit(env, key, windowSeconds = 60, maxRequests = 10) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  try {
    // Check if key has exceeded limit in current window
    const result = await env.DB.prepare(
      `SELECT count, window_start FROM rate_limits WHERE key = ? AND window_start > ?`
    ).bind(key, windowStart).first();

    const currentCount = result?.count || 0;
    const allowed = currentCount < maxRequests;
    const resetAt = (result?.window_start || now) + windowSeconds;

    // Increment or create
    if (allowed) {
      await incrementCounter(env, key, now);
    }

    return {
      allowed,
      count: currentCount,
      limit: maxRequests,
      resetAt,
      retryAfter: allowed ? null : Math.ceil(resetAt - now),
    };
  } catch (error) {
    // If DB fails, allow (fail-open to avoid lockouts)
    console.error('Rate limit check failed:', error.message);
    return {
      allowed: true,
      count: 0,
      limit: maxRequests,
      resetAt: now + windowSeconds,
      retryAfter: null,
      dbError: true,
    };
  }
}

/**
 * Increment counter in current window
 * @private
 */
async function incrementCounter(env, key, timestamp) {
  const windowStart = timestamp;

  try {
    await env.DB.prepare(
      `INSERT INTO rate_limits (key, count, window_start)
       VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1`
    ).bind(key, windowStart).run();
  } catch (error) {
    console.error('Counter increment failed:', error.message);
  }
}

/**
 * Reset rate limit counter for a key (admin use)
 * @param {object} env - Cloudflare env
 * @param {string} key - Rate limit key to reset
 * @returns {Promise<boolean>} True if reset
 */
async function resetRateLimit(env, key) {
  try {
    await env.DB.prepare(
      `DELETE FROM rate_limits WHERE key = ?`
    ).bind(key).run();
    return true;
  } catch (error) {
    console.error('Reset failed:', error.message);
    return false;
  }
}

/**
 * Get current rate limit stats for a key
 * @param {object} env - Cloudflare env
 * @param {string} key - Rate limit key
 * @returns {Promise<object>} { key, count, window_start, age_seconds }
 */
async function getStats(env, key) {
  try {
    const result = await env.DB.prepare(
      `SELECT count, window_start FROM rate_limits WHERE key = ?`
    ).bind(key).first();

    if (!result) {
      return { key, count: 0, window_start: null, age_seconds: null };
    }

    const now = Math.floor(Date.now() / 1000);
    return {
      key,
      count: result.count,
      window_start: result.window_start,
      age_seconds: now - result.window_start,
    };
  } catch (error) {
    console.error('Stats query failed:', error.message);
    return { key, error: error.message };
  }
}

/**
 * Cleanup expired entries (call periodically)
 * @param {object} env - Cloudflare env
 * @param {number} maxAgeDays - Delete entries older than this
 * @returns {Promise<number>} Number of deleted entries
 */
async function cleanup(env, maxAgeDays = 7) {
  const minTimestamp = Math.floor(Date.now() / 1000) - (maxAgeDays * 86400);

  try {
    const result = await env.DB.prepare(
      `DELETE FROM rate_limits WHERE window_start < ?`
    ).bind(minTimestamp).run();

    return result.meta.changes || 0;
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    return 0;
  }
}

/**
 * Response builder for rate limit exceeded
 * @param {object} limitData - From checkRateLimit()
 * @returns {Response} 429 Too Many Requests
 */
function tooManyRequests(limitData) {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      retryAfter: limitData.retryAfter,
      resetAt: new Date(limitData.resetAt * 1000).toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(limitData.retryAfter),
        'X-RateLimit-Limit': String(limitData.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(limitData.resetAt),
      },
    }
  );
}

module.exports = {
  checkRateLimit,
  resetRateLimit,
  getStats,
  cleanup,
  tooManyRequests,
};
