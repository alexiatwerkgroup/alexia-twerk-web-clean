# Twerkhub — Cloudflare Pages + Workers + D1

**Production-grade static site + serverless API + database on Cloudflare**

![Status: Stable](https://img.shields.io/badge/status-stable-green)
![Architecture: Cloudflare Pages](https://img.shields.io/badge/platform-Cloudflare%20Pages-orange)
![Tests: Vitest](https://img.shields.io/badge/tests-vitest-blue)
![Validation: Centralized](https://img.shields.io/badge/validation-centralized-green)

---

## Quick Start

### Prerequisites
- Node.js 18+ 
- Wrangler CLI: `npm install -g wrangler`
- Git

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/alexiatwerkgroup/alexia-twerk-web-clean.git
cd alexia-twerk-web-clean

# 2. Authenticate with Cloudflare
wrangler login

# 3. Start local dev server
wrangler pages dev
# Opens http://localhost:8788

# 4. Run tests
npm test                    # Run once
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# 5. (Optional) View test UI
npm run test:ui
```

---

## Architecture

### Static Pages (Cloudflare Pages)

```
/                           → index.html
/playlist/slug/             → Auto-generated from JSON data
/creators-taipei.html       → Creator showcase page
/creators.html              → Creator directory
...
```

**Cache Strategy:**
- HTML: Network-first (bypass browser cache with query params)
- CSS/JS: Cached with version bumpers (e.g., `?v=20260511-p1`)
- Images: Cached indefinitely

### API Layer (Cloudflare Workers)

```
POST /api/auth/signup           → Register user
POST /api/auth/signin           → Login + JWT
GET  /api/profile/me            → Fetch current user
POST /api/tokens/grant          → Award tokens
POST /api/comments              → Create comment
... 32 total endpoints
```

**Auth:** JWT-based, issued on signup/signin  
**Validation:** Centralized via `functions/_lib/validate.js`  
**Rate Limiting:** Distributed via D1 + `functions/_lib/rate-limit.js`

### Database (D1 SQLite)

```
users                   → uid, email, password_hash, created_at
profiles                → id, username, bio, balance, tier
comments                → id, user_id, text, created_at
rate_limits            → key, count, window_start (for API throttling)
```

**Connection:** `env.DB` in Worker functions

### Storage (R2)

User uploads (photos, videos) stored in `alexiatwerkgroup-media` bucket.

---

## Development Workflow

### Adding a New Playlist

```bash
# 1. Create data file
cat > _playlist_data/my-new-list.json << EOF
{
  "slug": "my-new-list",
  "title": "My Curated List",
  "description": "Best of the week...",
  "og_image": "https://i.ytimg.com/vi/.../hqdefault.jpg",
  "canonical_url": "https://alexiatwerkgroup.com/my-new-list/",
  "hero_video_id": "VIDEO_ID",
  "videos": [
    {"title": "Video 1", "video_id": "abc123", ...}
  ],
  "seo_content": "<p>Detailed description for SEO...</p>"
}
EOF

# 2. Generate HTML + bump cache
python scripts/workflow.py add-playlist --slug=my-new-list --title="My New List"

# 3. Done! Pushed automatically to Cloudflare
```

### Updating a Component (CSS/JS)

```bash
# 1. Edit file (e.g., /assets/theme.css)

# 2. Bump cache + commit
python scripts/bump-cache-unified.py --target=css --apply --commit

# 3. Push + deploy
git push origin main
```

### Deploying a Hotfix

```bash
# 1. Fix code

# 2. Deploy with auto-commit + auto-push
python scripts/workflow.py hotfix --message="fix: auth redirect" --push

# 3. Cloudflare Pages auto-deploys instantly
```

---

## Database Management

### Create D1 Database (First Time)

```bash
# Create the database
wrangler d1 create twerkhub-subscribers

# This outputs a database_id → add to wrangler.toml
```

### Apply Schema

```bash
# Auth + tokens
wrangler d1 execute twerkhub-subscribers --remote \
  --file=functions/_d1/schema-auth-tokens.sql

# Rate limits
wrangler d1 execute twerkhub-subscribers --remote \
  --file=functions/_d1/rate-limits.sql
```

### Query Database

```bash
# Interactive shell
wrangler d1 execute twerkhub-subscribers --remote --interactive

# Run query
wrangler d1 execute twerkhub-subscribers --remote \
  "SELECT COUNT(*) as user_count FROM users"

# Backup
wrangler d1 execute twerkhub-subscribers --remote \
  ".dump" > backup.sql
```

---

## Scripts & Tools

### Unified Cache Buster

```bash
# Preview changes (dry-run)
python scripts/bump-cache-unified.py --target=css --dry-run

# Apply changes
python scripts/bump-cache-unified.py --target=css --apply

# Apply + auto-commit
python scripts/bump-cache-unified.py --target=css --apply --commit

# Custom version label
python scripts/bump-cache-unified.py --target=tokens --version=20260511-hotfix-v1 --apply
```

**Available targets:** `css`, `tokens`, `pill`, `auth`, `guardian`, `all`

### Playlist Generator

```bash
# Generate all playlists (dry-run)
python scripts/generate-playlists-unified.py --dry-run

# Generate for Russian locale
python scripts/generate-playlists-unified.py --locale=ru --apply

# Generate + auto-commit
python scripts/generate-playlists-unified.py --apply --commit
```

### Workflow Orchestrator

```bash
# Add new playlist (generates HTML + bumps cache + commits)
python scripts/workflow.py add-playlist --slug=my-list --title="My List"

# Fix component (validates + bumps + commits)
python scripts/workflow.py fix-component --component=tokens --label=hotfix

# Deploy hotfix (stages + commits + optionally pushes)
python scripts/workflow.py hotfix --message="fix: auth bug" --push

# Run validation suite
python scripts/workflow.py validate
```

See `scripts/README.md` for detailed examples.

---

## Testing

### Run Tests

```bash
npm test                    # Run all tests once (CI mode)
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report (HTML in coverage/)
npm run test:ui            # Visual UI for tests
```

### Test Coverage

- **Validation:** 95%+ (80+ test cases)
- **Rate Limiting:** 90%+ (30+ test cases)
- **Auth:** Security + error handling (40+ test cases)

### Writing New Tests

```javascript
// tests/my-feature.test.js
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

Run: `npm run test:watch`

---

## Input Validation

All API endpoints use centralized validation via `functions/_lib/validate.js`:

```javascript
import { validateObject } from '../_lib/validate.js';

// Validate input
try {
  validateObject(req_body, {
    email: 'email',
    password: 'password',
    username: 'username',
  });
} catch (err) {
  return json({ error: err.code, errors: err.errors }, 400);
}
```

**Available schemas:** email, password, username, comment, url, slug, jwt, positive_int, locale, boolean

See `functions/_lib/MIGRATION_GUIDE.md` for implementation examples.

---

## Rate Limiting

All endpoints support distributed rate limiting via D1:

```javascript
import { checkRateLimit, tooManyRequests } from '../_lib/rate-limit.js';

// Check rate limit
const limit = await checkRateLimit(env, `comment:${user_id}`, 5, 1);
// Allow 1 comment per 5 seconds per user

if (!limit.allowed) {
  return tooManyRequests(limit);  // Returns 429
}
```

**Common presets:**
- Signup: 5 per hour per email
- Signin: 10 per minute per email
- Comments: 1 per 5 seconds per user
- Password reset: 2 per hour per email

---

## Deployment

### Automatic Deployment (Recommended)

```bash
git push origin main
# Cloudflare Pages detects push → builds → deploys instantly
```

**Build Settings:**
- Framework: None (static site)
- Build output directory: ` ` (root)
- Build script: (leave empty)

### Manual Deployment

```bash
# Deploy Pages
wrangler pages publish

# Deploy Workers (if modified functions/)
wrangler deploy
```

---

## Environment Variables

### Development (`.wrangler.toml`)

```toml
[env.development]
vars = { ENVIRONMENT = "development" }

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "alexiatwerkgroup-media-dev"

[[d1_databases]]
binding = "DB"
database_id = "dev-db-id"
```

### Production (Cloudflare Dashboard)

Set in **Settings → Variables:**
- `JWT_SECRET`: Secret for signing JWTs
- `DATABASE_ID`: D1 database binding
- `R2_BUCKET`: Media storage binding

---

## Troubleshooting

### Service Worker Issues

If pages are stuck on old version:
```bash
# Clear all caches + hard refresh
wrangler pages dev --clear-caches
# Or manually: DevTools → Application → Clear site data
```

### BOM in HTML Files

If commits are blocked:
```bash
# Remove UTF-8 BOM from all HTML
find . -name "*.html" -type f -exec sh -c 'tail -c +4 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;
```

### Tests Failing

```bash
# Check if Vitest is installed
npm install

# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- tests/validation.test.js
```

### Database Connection Error

```bash
# Verify database binding in wrangler.toml
wrangler d1 list

# Test connection
wrangler d1 execute twerkhub-subscribers --remote "SELECT 1"
```

---

## Performance

### Metrics (Lighthouse)

- Performance: **95+** (Pages cached globally)
- Accessibility: **92+** (Semantic HTML + ARIA labels)
- Best Practices: **93+** (No security warnings)
- SEO: **98+** (Structured data + meta tags)

### Optimization Tips

1. **Cache Headers:** CSS/JS use `?v=YYYYMMDD-label` to invalidate
2. **Images:** Lazy-loaded with fallback thumbnails (9 variants for YouTube)
3. **Compression:** Gzip + Brotli via Cloudflare
4. **Service Worker:** Network-first for HTML, cache-first for assets

---

## Contributing

### Code Style

- JavaScript: Vanilla ES6+ (no frameworks on static pages)
- Python: Black, 88-char line length
- Tests: Vitest + global describe/it/expect

### Pre-Commit Validation

```bash
# Checks: BOM, CRLF, JSON syntax, console.log
npm run validate

# Or manually:
python security-audit.py
```

### Branch Strategy

- `main`: Production (auto-deploys via Pages)
- `staging`: Staging environment
- `develop`: Development (feature branches off here)

---

## Security

### Password Policy

- **Min length:** 12 characters (enforced by validation)
- **Hashing:** PBKDF2-SHA256 (via `hashPassword()`)
- **Storage:** Never plain text

### Rate Limiting

- **Signup:** 5 attempts/hour per email (prevent account enumeration)
- **Signin:** 10 failures/minute per email (prevent brute force)
- **Comments:** 1 per 5 seconds per user (prevent spam)

### Input Validation

- **XSS Prevention:** All user input sanitized via `sanitizeText()`
- **SQL Injection:** Parameterized queries only
- **CSRF:** JWT tokens prevent replay attacks

---

## Maintenance

### Monthly Tasks

```bash
# Clean up old rate limit entries
wrangler d1 execute twerkhub-subscribers --remote \
  "DELETE FROM rate_limits WHERE window_start < datetime('now', '-7 days')"

# Check service worker health
wrangler tail https://alexiatwerkgroup.com --format json

# Monitor Google Search Console
# → Coverage → Fix any indexation issues
```

### Quarterly Tasks

- Review performance metrics (Lighthouse)
- Audit security (check for outdated dependencies)
- Update CRITICAL_INVARIANTS.md if needed

---

## Resources

- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **D1 Guide:** https://developers.cloudflare.com/d1/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **Vitest:** https://vitest.dev/

---

## Support

- **Issues:** Open a GitHub issue
- **Questions:** Start a discussion
- **Security:** Report to security@alexiatwerkgroup.com

---

**Maintained by:** Alexia Dev Team  
**Last updated:** 2026-05-11  
**Version:** 1.0.0 (Production)
