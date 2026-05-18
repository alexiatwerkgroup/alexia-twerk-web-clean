# Migration Guide: New Validation & Rate Limiting

**Purpose:** Consolidate scattered validation logic and add centralized rate limiting.

---

## Before: Inline Validation (Old)

```javascript
// functions/api/auth/signup.js (OLD)
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/i;

if (!email || !EMAIL_RE.test(email) || email.length > 200) {
  return json({ ok: false, error: 'invalid_email' }, 400, origin);
}
if (password.length < 6 || password.length > 256) {
  return json({ ok: false, error: 'invalid_password' }, 400, origin);
}
```

**Problems:**
- Validation regex duplicated across 10+ endpoints
- Password rule (min 6) ≠ policy (min 12 recommended)
- No centralized place to update rules
- Different error messages in each file
- No rate limiting on signup attempts

---

## After: Centralized Validation (New)

```javascript
// functions/api/auth/signup.js (NEW)
import { validateObject, sanitizeText, normalizeEmail } from '../../_lib/validate.js';
import { checkRateLimit, tooManyRequests } from '../../_lib/rate-limit.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  // 1. RATE LIMIT: Max 5 signup attempts per email per hour
  const email = normalizeEmail(body.email);
  const limit = await checkRateLimit(env, `signup:${email}`, 3600, 5);
  if (!limit.allowed) {
    return tooManyRequests(limit);
  }

  // 2. VALIDATE: Use centralized schema
  try {
    validateObject(body, {
      email: 'email',
      password: 'password',
      // username is optional but if present, must be valid
    });
  } catch (err) {
    return json(
      { ok: false, error: err.code, errors: err.errors },
      err.status,
      origin
    );
  }

  // 3. OPTIONAL VALIDATION: username if provided
  if (body.username) {
    try {
      validateObject({ username: body.username }, { username: 'username' });
    } catch (err) {
      return json({ ok: false, error: err.code, errors: err.errors }, 400, origin);
    }
  }

  // Rest of signup logic...
}
```

**Benefits:**
- ✓ One source of truth for email/password/username rules
- ✓ Rate limiting prevents brute force
- ✓ Consistent error responses across all endpoints
- ✓ Sanitization built in
- ✓ Easy to update rules globally

---

## Implementation Checklist

### Step 1: Apply Schema Validation

Update these endpoints first (highest priority):

- [ ] `functions/api/auth/signup.js` — validate email, password, username
- [ ] `functions/api/auth/signin.js` — validate email, password
- [ ] `functions/api/comments/index.js` — validate comment text
- [ ] `functions/api/profile/update.js` — validate username, bio

### Step 2: Add Rate Limiting

Add to database (one-time):
```bash
wrangler d1 execute twerkhub-subscribers --remote --file=functions/_d1/rate-limits.sql
```

Then update endpoints:

- [ ] `functions/api/auth/signup.js` — 5 per hour per email
- [ ] `functions/api/auth/signin.js` — 10 per minute per email (failed attempts)
- [ ] `functions/api/comments/index.js` — 1 per 5 seconds per user
- [ ] `functions/api/auth/forgot-password.js` — 2 per hour per email

### Step 3: Testing

```bash
# Test validation (bad email)
curl -X POST https://alexiatwerkgroup.com/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"invalid","password":"test123456"}'

# Expected: 400 with errors: { email: 'invalid_email' }

# Test rate limit (5 signups per hour per email)
for i in {1..6}; do
  curl -X POST https://alexiatwerkgroup.com/api/auth/signup \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"test123456"}'
done

# Expected: 6th attempt returns 429 Too Many Requests
```

---

## Validation Schemas Reference

| Schema | Example | Min | Max | Pattern |
|--------|---------|-----|-----|---------|
| `email` | user@example.com | 5 | 200 | RFC 5322 simplified |
| `password` | MySecret!@#123 | 12 | 256 | Any characters |
| `username` | john_doe | 3 | 24 | `/^[a-z0-9_.-]+$/i` |
| `comment` | Nice video! | 1 | 2000 | No nulls |
| `slug` | my-playlist | 3 | 64 | `/^[a-z0-9_-]+$/i` |
| `url` | https://... | – | – | Starts with http(s):// or data: |
| `jwt` | eyJ0eX... | – | – | 3 dot-separated parts |
| `positive_int` | 42 | 1 | 999999 | Integer > 0 |
| `locale` | en / ru / es | – | – | `/^[a-z]{2}(-[A-Z]{2})?$/` |
| `boolean` | true / 1 / yes | – | – | true/false/1/0/yes/no |

---

## Rate Limit Presets

Common configurations:

```javascript
// Auth signup: 5 per hour per email
checkRateLimit(env, `signup:${email}`, 3600, 5)

// Auth signin failures: 10 per minute per email
checkRateLimit(env, `signin_fail:${email}`, 60, 10)

// Comments: 1 per 5 seconds per user
checkRateLimit(env, `comment:${user_id}`, 5, 1)

// Password reset: 2 per hour per email
checkRateLimit(env, `forgot_pass:${email}`, 3600, 2)

// API calls (general): 100 per minute per user
checkRateLimit(env, `api:${user_id}`, 60, 100)
```

---

## Error Response Examples

### Invalid Input
```json
{
  "ok": false,
  "error": "validation_error",
  "errors": {
    "email": "invalid_email",
    "password": "invalid_password"
  }
}
```

### Rate Limited
```json
{
  "error": "rate_limit_exceeded",
  "retryAfter": 45,
  "resetAt": "2026-05-12T14:30:00Z"
}
```

---

## Next Phase: Tests

Write tests in `tests/validation.test.js`:

```javascript
describe('validateObject', () => {
  it('should accept valid email', () => {
    expect(() => validateObject(
      { email: 'user@example.com' },
      { email: 'email' }
    )).not.toThrow();
  });

  it('should reject invalid email', () => {
    expect(() => validateObject(
      { email: 'invalid' },
      { email: 'email' }
    )).toThrow();
  });

  it('should enforce password min length 12', () => {
    expect(() => validateObject(
      { password: 'short' },
      { password: 'password' }
    )).toThrow();
  });
});

describe('checkRateLimit', () => {
  it('should allow first request', async () => {
    const limit = await checkRateLimit(env, 'test-key', 60, 5);
    expect(limit.allowed).toBe(true);
  });

  it('should block after limit exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(env, 'test-key-2', 60, 5);
    }
    const limit = await checkRateLimit(env, 'test-key-2', 60, 5);
    expect(limit.allowed).toBe(false);
  });
});
```

---

**Version:** 20260511-v1  
**Maintained by:** Dev Team  
**Last updated:** 2026-05-11
