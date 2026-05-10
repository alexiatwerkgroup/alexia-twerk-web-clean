#!/bin/bash
# run-all-checks.sh - Master orchestrator for all validation and optimization tools
# Runs all checks, optimizations, and benchmarks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO=$(cd "$(dirname "$0")" && pwd)
RESULTS_DIR="$REPO/.quality-reports"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                     🏃 COMPREHENSIVE QUALITY CHECK                          ║"
echo "║                  (All validation and optimization tools)                    ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

start_time=$(date +%s)

# ============================================================================
# SECTION 1: SECURITY & DEPLOYMENT
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1️⃣  SECURITY & DEPLOYMENT VALIDATION${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n📋 Running deployment checks..."
if [ -f "$REPO/deploy.sh" ]; then
    bash "$REPO/deploy.sh" > "$RESULTS_DIR/deploy-check.log" 2>&1 && \
    echo -e "${GREEN}✓ Deployment checks passed${NC}" || \
    echo -e "${RED}✗ Deployment checks failed${NC}"
else
    echo -e "${YELLOW}⚠ deploy.sh not found${NC}"
fi

# ============================================================================
# SECTION 2: CODE QUALITY & SECURITY SCANNING
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2️⃣  CODE SECURITY SCANNING${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n🔐 Security audit (SQLi, XSS, secrets)..."
if command -v python3 &> /dev/null && [ -f "$REPO/security-audit.py" ]; then
    python3 "$REPO/security-audit.py" > "$RESULTS_DIR/security-audit.log" 2>&1 && \
    echo -e "${GREEN}✓ No critical security issues${NC}" || \
    echo -e "${YELLOW}⚠ Review security audit results${NC}"
fi

# ============================================================================
# SECTION 3: DATABASE OPTIMIZATION
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3️⃣  DATABASE OPTIMIZATION ANALYSIS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n📊 Query analysis (finding N+1, inefficiencies)..."
if command -v python3 &> /dev/null && [ -f "$REPO/analyze-queries.py" ]; then
    python3 "$REPO/analyze-queries.py" > "$RESULTS_DIR/query-analysis.log" 2>&1 && \
    echo -e "${GREEN}✓ Query analysis complete${NC}" || \
    echo -e "${YELLOW}⚠ Query analysis incomplete${NC}"
fi

# ============================================================================
# SECTION 4: FRONTEND OPTIMIZATION
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4️⃣  FRONTEND OPTIMIZATION${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n🎨 Frontend asset analysis (CSS, JS, images)..."
if command -v python3 &> /dev/null && [ -f "$REPO/optimize-frontend.py" ]; then
    python3 "$REPO/optimize-frontend.py" > "$RESULTS_DIR/frontend-optimization.log" 2>&1 && \
    echo -e "${GREEN}✓ Frontend analysis complete${NC}" || \
    echo -e "${YELLOW}⚠ Frontend analysis incomplete${NC}"
fi

# ============================================================================
# SECTION 5: API BENCHMARKING
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5️⃣  API PERFORMANCE BENCHMARKING${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n⚡ Endpoint response time measurement..."
if command -v node &> /dev/null && [ -f "$REPO/benchmark-endpoints.js" ]; then
    node "$REPO/benchmark-endpoints.js" > "$RESULTS_DIR/benchmark-results.log" 2>&1 && \
    echo -e "${GREEN}✓ Benchmarking complete${NC}" || \
    echo -e "${YELLOW}⚠ Benchmarking incomplete${NC}"
fi

# ============================================================================
# SECTION 6: SCRIPT AUDIT
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}6️⃣  SCRIPT INVENTORY & CLEANUP${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n📋 Script audit (identify obsolete, redundant scripts)..."
if command -v python3 &> /dev/null && [ -f "$REPO/cleanup-scripts.py" ]; then
    python3 "$REPO/cleanup-scripts.py" --stats > "$RESULTS_DIR/script-audit.log" 2>&1 && \
    echo -e "${GREEN}✓ Script audit complete${NC}" || \
    echo -e "${YELLOW}⚠ Script audit incomplete${NC}"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 QUALITY CHECK SUMMARY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

end_time=$(date +%s)
duration=$((end_time - start_time))

echo -e "\n✅ All checks completed in ${duration}s"
echo -e "\n📁 Results saved to: ${RESULTS_DIR}/"
echo -e "\n📄 Available reports:"
ls -lh "$RESULTS_DIR" | awk '{if(NR>1) print "   - " $NF}'

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                          🎉 QUALITY CHECK COMPLETE                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n💡 Next steps:"
echo "   1. Review results: cat $RESULTS_DIR/*.log"
echo "   2. Address high-priority items"
echo "   3. Deploy: ./deploy.sh"
echo ""
