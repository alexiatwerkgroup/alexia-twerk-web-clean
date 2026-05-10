# API Endpoint Refactoring Guide

## Status: 19 of 26 Endpoints Refactored ✅

This guide provides a pattern for refactoring the remaining 7 endpoints.

---

## The Pattern (Simple)

Every refactored endpoint follows this structure:

1. **Imports** — Add Errors, logger, validate
2. **CORS** — Check origin against allowlist
3. **Method** — Use Errors.METHOD_NOT_ALLOWED
4. **Auth** — Check with logger.warn if needed
5. **Validation** — Use validate() or validateObject()
6. **Try/Catch** — Business logic with logging
7. **Errors** — Return Errors.xxx.toJSON()

---

## Remaining 7 Endpoints

### auth/send-verification.js
- Requires auth
- Sends verification email
- Task: Add logger, replace inline errors

### auth/google/start.js
- GET OAuth start
- Redirects to provider
- Task: Add logger for redirect, state generation

### auth/google/callback.js
- OAuth callback
- Token exchange
- Task: Add logger for each step

### avatar/upload.js
- Requires auth
- File upload to R2
- Task: Add file validation, logger

### cb-top.js
- Public GET endpoint
- Aggregated data
- Task: Add query validation, logger

### heatmap/[video_id].js
- Public GET endpoint
- Video heatmap data
- Task: Add video_id validation, logger

### admin/full-stats.js
- Requires admin auth
- System stats
- Task: Add admin check logging

---

## Error Quick Reference

```javascript
import { Errors } from '../../_lib/errors.js'

// Common errors to use
Errors.METHOD_NOT_ALLOWED       // 405
Errors.UNAUTHORIZED             // 401
Errors.FORBIDDEN                // 403
Errors.NOT_FOUND                // 404
Errors.INVALID_EMAIL            // 400
Errors.INVALID_PASSWORD         // 400
Errors.VALIDATION_FAILED        // 400
Errors.D1_BINDING_MISSING       // 500
Errors.INTERNAL_ERROR           // 500

// Usage
return json(Errors.NOT_FOUND.toJSON(), 404, allowedOrigin)
```

---

## Validation Schemas

```javascript
import { validate, ValidationError } from '../../_lib/validate.js'

validate(email, 'email')         // 6-200 chars
validate(username, 'username')   // 3-24 alphanumeric + _ . -
validate(password, 'password')   // 12-256 chars
validate(text, 'comment')        // 1-2000 chars
validate(url, 'url')             // http/https/data URI
validate(val, 'id')              // 1-36 char string
validate(num, 'positive_int')    // > 0
validate(num, 'int_0_100')       // 0-100
validate(val, 'boolean')         // true/false
```

---

## Logging Levels

```javascript
import { logger } from '../../_lib/logger.js'

logger.debug(endpoint, msg, context)    // Verbose
logger.info(endpoint, msg, context)     // Normal
logger.warn(endpoint, msg, context)     // Unusual
logger.error(endpoint, msg, context)    // Failures
```

---

## Effort: 35-70 minutes for 7 endpoints

Once you've done 2 endpoints, the rest follow the same pattern mechanically.

