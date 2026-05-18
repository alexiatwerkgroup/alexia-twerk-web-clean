import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  getStats,
  cleanup,
  tooManyRequests,
} from '../functions/_lib/rate-limit.js';

// Mock Cloudflare D1 database
class MockD1 {
  constructor() {
    this.data = new Map();
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...params) {
        return {
          first: async () => {
            const key = params[0];
            const data = self.data.get(key);
            return data || null;
          },
          run: async () => {
            const key = params[0];
            const existingData = self.data.get(key);

            if (sql.includes('INSERT INTO rate_limits')) {
              if (existingData) {
                existingData.count++;
              } else {
                self.data.set(key, { count: 1, window_start: params[2] });
              }
            } else if (sql.includes('DELETE FROM rate_limits')) {
              self.data.delete(key);
            }

            return { meta: { changes: 1 } };
          },
        };
      },
    };
  }
}

describe('Rate Limiting', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = { DB: new MockD1() };
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const result = await checkRateLimit(mockEnv, 'test-user', 60, 5);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should allow requests within limit', async () => {
      const key = 'test-user-2';
      for (let i = 0; i < 4; i++) {
        const result = await checkRateLimit(mockEnv, key, 60, 5);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block after limit exceeded', async () => {
      const key = 'test-user-3';
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(mockEnv, key, 60, 5);
      }
      // Next request should be blocked
      const result = await checkRateLimit(mockEnv, key, 60, 5);
      expect(result.allowed).toBe(false);
    });

    it('should include retry information', async () => {
      const key = 'test-user-4';
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(mockEnv, key, 60, 5);
      }
      const result = await checkRateLimit(mockEnv, key, 60, 5);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
      expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return correct limit and count', async () => {
      const key = 'test-user-5';
      await checkRateLimit(mockEnv, key, 60, 10);
      const result = await checkRateLimit(mockEnv, key, 60, 10);
      expect(result.limit).toBe(10);
      expect(result.count).toBe(1);
    });

    it('should handle different window sizes', async () => {
      const result1 = await checkRateLimit(mockEnv, 'key-1', 3600, 100); // 1 hour
      const result2 = await checkRateLimit(mockEnv, 'key-2', 60, 10); // 1 minute
      expect(result1.limit).toBe(100);
      expect(result2.limit).toBe(10);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset a rate limit entry', async () => {
      const key = 'test-reset';
      await checkRateLimit(mockEnv, key, 60, 5);
      const resetResult = await resetRateLimit(mockEnv, key);
      expect(resetResult).toBe(true);
      const stats = await getStats(mockEnv, key);
      expect(stats.count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return stats for active key', async () => {
      const key = 'test-stats';
      await checkRateLimit(mockEnv, key, 60, 5);
      const stats = await getStats(mockEnv, key);
      expect(stats.key).toBe(key);
      expect(stats.count).toBeGreaterThanOrEqual(0);
    });

    it('should return zero for non-existent key', async () => {
      const stats = await getStats(mockEnv, 'non-existent-key');
      expect(stats.count).toBe(0);
      expect(stats.window_start).toBe(null);
    });
  });

  describe('cleanup', () => {
    it('should return number of deleted entries', async () => {
      const deleted = await cleanup(mockEnv, 7);
      // Mock implementation returns 0 for simplicity
      expect(typeof deleted).toBe('number');
    });
  });

  describe('tooManyRequests', () => {
    it('should return 429 status', () => {
      const limitData = {
        allowed: false,
        retryAfter: 30,
        resetAt: Math.floor(Date.now() / 1000) + 30,
        limit: 5,
      };
      const response = tooManyRequests(limitData);
      expect(response.status).toBe(429);
    });

    it('should include rate limit headers', () => {
      const limitData = {
        allowed: false,
        retryAfter: 45,
        resetAt: Math.floor(Date.now() / 1000) + 45,
        limit: 5,
      };
      const response = tooManyRequests(limitData);
      expect(response.headers.get('Retry-After')).toBe('45');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should include error JSON body', async () => {
      const limitData = {
        allowed: false,
        retryAfter: 30,
        resetAt: Math.floor(Date.now() / 1000) + 30,
        limit: 5,
      };
      const response = tooManyRequests(limitData);
      const json = await response.json();
      expect(json.error).toBe('rate_limit_exceeded');
      expect(json.retryAfter).toBe(30);
      expect(json.resetAt).toBeDefined();
    });
  });
});

describe('Rate Limit Use Cases', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = { DB: new MockD1() };
  });

  it('should rate limit signup: 5 per hour per email', async () => {
    const email = 'user@example.com';
    const key = `signup:${email}`;

    // Allow 5 signups
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(mockEnv, key, 3600, 5);
      expect(result.allowed).toBe(true);
    }

    // 6th should fail
    const result = await checkRateLimit(mockEnv, key, 3600, 5);
    expect(result.allowed).toBe(false);
  });

  it('should rate limit comments: 1 per 5 seconds per user', async () => {
    const userId = 'user-123';
    const key = `comment:${userId}`;

    // First comment allowed
    const result1 = await checkRateLimit(mockEnv, key, 5, 1);
    expect(result1.allowed).toBe(true);

    // Second comment blocked
    const result2 = await checkRateLimit(mockEnv, key, 5, 1);
    expect(result2.allowed).toBe(false);
  });

  it('should rate limit password reset: 2 per hour per email', async () => {
    const email = 'user@example.com';
    const key = `forgot_pass:${email}`;

    // Allow 2 resets
    const result1 = await checkRateLimit(mockEnv, key, 3600, 2);
    expect(result1.allowed).toBe(true);

    const result2 = await checkRateLimit(mockEnv, key, 3600, 2);
    expect(result2.allowed).toBe(true);

    // 3rd should fail
    const result3 = await checkRateLimit(mockEnv, key, 3600, 2);
    expect(result3.allowed).toBe(false);
  });
});
