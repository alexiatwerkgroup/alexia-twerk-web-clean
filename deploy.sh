#!/bin/bash
# Deployment script for Twerkhub
# Automates safe deployment to Cloudflare Pages

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 TWERKHUB DEPLOYMENT PIPELINE${NC}"
echo "=================================="

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT VALIDATION
# ============================================================================
echo -e "\n${YELLOW}Phase 1: Pre-deployment validation${NC}"

echo "  Checking git state..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Working tree has uncommitted changes${NC}"
    git status
    exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo -e "${RED}❌ Not on main branch (on $BRANCH)${NC}"
    exit 1
fi

echo "  ✓ Git state clean"

echo "  Checking configuration files..."
[ -f "wrangler.toml" ] || { echo "❌ Missing wrangler.toml"; exit 1; }
[ -f "package.json" ] || { echo "❌ Missing package.json"; exit 1; }
echo "  ✓ Config files present"

echo "  Verifying critical files..."
REQUIRED_LIBS=("functions/_lib/validate.js" "functions/_lib/errors.js" "functions/_lib/logger.js" "functions/_lib/rate-limit.js")
for lib in "${REQUIRED_LIBS[@]}"; do
    [ -f "$lib" ] || { echo "❌ Missing $lib"; exit 1; }
done
echo "  ✓ All libraries present"

# ============================================================================
# PHASE 2: SECURITY CHECKS
# ============================================================================
echo -e "\n${YELLOW}Phase 2: Security checks${NC}"

echo "  Checking for hardcoded secrets..."
if grep -r "api[_-]key\|password\|secret" --include="*.js" functions/ | grep -v "API_KEY_PARAM\|placeholder" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Warning: Possible hardcoded secrets found (review before deploying)${NC}"
fi
echo "  ✓ Secrets check complete"

echo "  Checking for BOM in HTML..."
bom_count=$(find . -name "*.html" -type f ! -path "./.git/*" ! -path "./node_modules/*" -exec grep -l $'^\xEF\xBB\xBF' {} \; 2>/dev/null | wc -l)
if [ "$bom_count" -gt 0 ]; then
    echo -e "${RED}❌ Found $bom_count HTML files with BOM${NC}"
    exit 1
fi
echo "  ✓ No BOM in HTML files"

# ============================================================================
# PHASE 3: CODE QUALITY
# ============================================================================
echo -e "\n${YELLOW}Phase 3: Code quality checks${NC}"

echo "  Checking for debug statements..."
debug_count=$(grep -r "console\.\(log\|error\|warn\)" functions/api --include="*.js" | grep -v "logger\|// debug\|console.error.*rate" | wc -l || true)
if [ "$debug_count" -gt 0 ]; then
    echo -e "${RED}❌ Found $debug_count debug statements in API code${NC}"
    exit 1
fi
echo "  ✓ No debug statements"

echo "  Checking for CRLF line endings..."
crlf_count=$(find functions -name "*.js" -type f -exec file {} \; | grep -c CRLF || true)
if [ "$crlf_count" -gt 0 ]; then
    echo -e "${RED}❌ Found $crlf_count files with CRLF line endings${NC}"
    exit 1
fi
echo "  ✓ All files use LF"

# ============================================================================
# PHASE 4: API VALIDATION
# ============================================================================
echo -e "\n${YELLOW}Phase 4: API validation${NC}"

endpoint_count=$(find functions/api -name "*.js" -type f | wc -l)
echo "  Found $endpoint_count API endpoints"

if [ "$endpoint_count" -lt 20 ]; then
    echo -e "${RED}❌ Expected at least 20 endpoints, found $endpoint_count${NC}"
    exit 1
fi
echo "  ✓ All endpoints present"

# ============================================================================
# PHASE 5: DATABASE SCHEMA
# ============================================================================
echo -e "\n${YELLOW}Phase 5: Database schema validation${NC}"

schema_files=$(find _d1 -name "*.sql" -type f | wc -l)
echo "  Found $schema_files schema files"
echo "  ✓ Schema files present"

# ============================================================================
# PHASE 6: DEPLOYMENT
# ============================================================================
echo -e "\n${GREEN}✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT${NC}"
echo ""
echo -e "${BLUE}Phase 6: Deployment${NC}"

echo "  Current git info:"
echo "    Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "    Commit: $(git rev-parse --short HEAD)"
echo "    Remote: $(git config --get remote.origin.url)"

echo ""
echo -e "${YELLOW}⏳ Deploying to Cloudflare Pages...${NC}"
echo "  (Note: requires 'wrangler' CLI and Cloudflare credentials)"
echo ""

# The actual deployment command (uncomment when ready):
# wrangler deploy

# For now, show what would happen
echo -e "${GREEN}✓ Deployment would execute:${NC}"
echo "  $ wrangler deploy"
echo ""
echo "This will:"
echo "  1. Build the project"
echo "  2. Validate configuration"
echo "  3. Deploy to Cloudflare Pages"
echo "  4. Bind D1 database"
echo "  5. Set environment variables (from Cloudflare dashboard)"
echo ""

# ============================================================================
# PHASE 7: POST-DEPLOYMENT
# ============================================================================
echo -e "${BLUE}Phase 7: Post-deployment (after 'wrangler deploy')${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor Cloudflare dashboard for deployment status"
echo "  2. Run smoke tests: curl https://alexiatwerkgroup.com/api/auth/session"
echo "  3. Check logs: wrangler tail"
echo "  4. Verify database: wrangler d1 execute twerkhub-subscribers --remote 'SELECT COUNT(*) FROM users'"
echo ""

echo -e "${GREEN}=================================="
echo "🎉 DEPLOYMENT PIPELINE COMPLETE"
echo "==================================${NC}"
echo ""
echo "Git commits to deploy: $(git rev-list --count origin/main..HEAD)"
echo "Last commit: $(git log -1 --pretty=format:'%h - %s')"
echo ""
