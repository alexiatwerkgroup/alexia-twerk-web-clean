#!/bin/bash
# Install git hooks for Twerkhub development

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "Installing git hooks..."

# Make sure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook for Twerkhub
set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

exit_code=0

error() { echo -e "${RED}❌ $1${NC}"; exit_code=1; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }

echo "🔍 Running pre-commit checks..."

# Check for BOM in staged HTML files
html_files=$(git diff --cached --name-only --diff-filter=A,M | grep '\.html$' || true)
if [ -n "$html_files" ]; then
  echo "  Checking for UTF-8 BOM in HTML files..."
  while IFS= read -r file; do
    if [ -f "$file" ] && file "$file" 2>/dev/null | grep -q "UTF-8 (with BOM)"; then
      error "BOM found in $file"
    fi
  done <<< "$html_files"
  [ $exit_code -eq 0 ] && success "No BOM in HTML files"
fi

# Check for CRLF line endings
code_files=$(git diff --cached --name-only | grep -E '\.(js|json|html|md)$' || true)
if [ -n "$code_files" ]; then
  echo "  Checking for CRLF line endings..."
  while IFS= read -r file; do
    if [ -f "$file" ] && file "$file" 2>/dev/null | grep -q CRLF; then
      error "CRLF line endings in $file (use LF)"
    fi
  done <<< "$code_files"
  [ $exit_code -eq 0 ] && success "All files use LF"
fi

# Check for debug statements in API
api_files=$(git diff --cached --name-only | grep 'functions/api.*\.js$' || true)
if [ -n "$api_files" ]; then
  echo "  Checking for debug statements in API..."
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      # Skip if it's logger.js or has debug comments
      if grep "console\.\(log\|error\|warn\)" "$file" | grep -v "logger\|// debug" > /dev/null 2>&1; then
        error "Console statement in $file (use logger)"
      fi
    fi
  done <<< "$api_files"
  [ $exit_code -eq 0 ] && success "No debug in API code"
fi

echo ""
if [ $exit_code -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed${NC}"
  exit 0
else
  echo -e "${RED}❌ Pre-commit checks failed${NC}"
  exit 1
fi
EOF

chmod +x "$HOOKS_DIR/pre-commit"

# Create commit-msg hook for message format
cat > "$HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash
# Commit message format validator

msg_file=$1
msg=$(head -n 1 "$msg_file")

# Allow various commit formats
if echo "$msg" | grep -qE '^(feat|fix|chore|refactor|perf|docs|style|test|ci)(\(.+\))?:|^Merge |^Refactor |^Add |^Remove |^Update |^Fix ' ; then
  exit 0
fi

# Warn about non-conventional messages
echo "⚠ Consider using conventional commits (feat:, fix:, chore:, etc.)"
exit 0
EOF

chmod +x "$HOOKS_DIR/commit-msg"

echo "✓ Git hooks installed:"
echo "  - pre-commit: Validates code quality, BOM, line endings"
echo "  - commit-msg: Suggests conventional commits"
echo ""
echo "To run checks manually:"
echo "  bash $HOOKS_DIR/pre-commit"
