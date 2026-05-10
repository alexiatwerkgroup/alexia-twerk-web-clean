# API Endpoint Refactoring Progress

**Goal:** Refactor all API endpoints to use centralized validation, error handling, rate limiting, and logging libraries.

**Libraries Created:**
- `functions/_lib/validate.js` — Input validation schemas
- `functions/_lib/errors.js` — Standardized API errors
- `functions/_lib/logger.js` — Structured logging
- `functions/_lib/rate-limit.js` — D1-backed rate limiting
- `functions/_lib/endpoint.js` — Standard endpoint wrapper (optional)

---

## ✅ Refactored Endpoints

### Auth (`functions/api/auth/`)
- ✅ **signup.js** — Uses validate.js, errors.js, logger.js; handles password 12+ chars (enforced)
- ✅ **signin.js** — Uses validate.js, errors.js, logger.js; validates email/username/password
- [ ] forgot-password.js
- [ ] reset-password.js
- [ ] verify-email.js
- [ ] send-verification.js
- [ ] session.js
- [ ] signout.js
- [ ] username-available.js
- [ ] google/start.js
- [ ] google/callback.js

### Comments (`functions/api/comments/`)
- ✅ **index.js** — Uses validate.js, errors.js, logger.js, rate-limit.js
- [ ] [id].js
- [ ] report.js

### Profile (`functions/api/profile/`)
- ✅ **me.js** — Uses validate.js, errors.js, logger.js
- [ ] [id].js

### Tokens (`functions/api/tokens/`)
- ✅ **grant.js** — Uses validate.js, errors.js, logger.js, clamp()
- [ ] claim-daily.js
- [ ] claim-welcome.js

### Other
- [ ] subscribe.js
- [ ] avatar/upload.js
- [ ] cb-top.js
- [ ] heatmap/record.js
- [ ] heatmap/[video_id].js
- [ ] session/bump.js
- [ ] admin/full-stats.js
- [ ] avatars/[[path]].js

---

## Patterns Applied

### Validation
```javascript
import { validate, validateObject, ValidationError } from '../../_lib/validate.js'

// Single value
try {
  validate(email, 'email')
} catch (e) {
  if (e instanceof ValidationError) {
    return json({ ok: false, error: e.code, detail: e.detail }, 400, origin)
  }
}

// Batch validation
const validated = validateObject(body, { email: 'email', password: 'password' })
```

### Error Handling
```javascript
import { Errors } from '../../_lib/errors.js'

// Use pre-defined errors
if (!profile) {
  return json(Errors.NOT_FOUND.toJSON(), 404, origin)
}

// Or create inline errors for custom messages
return json(Errors.MISSING_FIELD('field_name').toJSON(), 400, origin)
```

### Logging
```javascript
import { logger } from '../../_lib/logger.js'

logger.info('endpoint', 'Action completed', { userId, result })
logger.warn('endpoint', 'Validation failed', { errors })
logger.error('endpoint', 'Database error', { error: e.message })
```

### Rate Limiting
```javascript
import { checkRateLimit, makeUserKey } from '../../_lib/rate-limit.js'

const rl = await checkRateLimit(env, makeUserKey(userId, 'action'), 5, 1)
if (!rl.allowed) {
  return json(
    { ok: false, error: 'rate_limited', retry_after: rl.reset_in_seconds },
    429,
    origin
  )
}
```

---

## Next Steps

1. **Refactor remaining 20 endpoints** — Apply same pattern to each
2. **Update GitHub Actions** — Ensure validation passes with new patterns
3. **Test suite** — Run `npm test` to verify all endpoints work
4. **Deploy** — Push to main branch, verify Cloudflare deployment
5. **Monitor** — Check logs for any issues with new centralized libraries

---

## Checklist for Each Endpoint

- [ ] Replace inline regex validation with validate.js schemas
- [ ] Replace `json({error: '...'})` with `Errors.XXX.toJSON()`
- [ ] Add logger calls for info/warn/error events
- [ ] Add rate limiting if needed (comments, auth endpoints)
- [ ] Add CORS origin allowlist
- [ ] Ensure all error paths are logged
- [ ] Test happy path and error cases

