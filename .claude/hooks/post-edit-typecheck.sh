#!/bin/bash
# PostToolUse hook na Edit/Write — runt type-check + eslint op gewijzigde bestanden.
# Blocking: false (in settings.json) zodat type-errors de flow niet stoppen.
# Output gaat naar stderr zodat Claude het ziet als context.

set -e

# Read tool input from stdin (JSON)
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Skip als geen TS/TSX/JS bestand
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Skip als bestand in archive of node_modules zit
if [[ "$FILE_PATH" =~ /(node_modules|\.next|playwright-report|test-results|docs/archive)/ ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Type-check (project-wide — kan niet per-file in TS)
TS_OUTPUT=$(npx tsc --noEmit 2>&1 | head -30 || true)
TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || echo "0")

if [ "$TS_ERRORS" -gt "0" ]; then
  echo "⚠️  TypeScript errors after $TOOL_NAME on $FILE_PATH ($TS_ERRORS errors):" >&2
  echo "$TS_OUTPUT" >&2
  echo "" >&2
fi

# Eslint per-file (--fix waar mogelijk)
if [ -f "$FILE_PATH" ] && command -v npx >/dev/null 2>&1; then
  ESLINT_OUTPUT=$(npx eslint --fix "$FILE_PATH" 2>&1 || true)
  if echo "$ESLINT_OUTPUT" | grep -q "error\|warning"; then
    echo "⚠️  Lint issues on $FILE_PATH:" >&2
    echo "$ESLINT_OUTPUT" | head -15 >&2
  fi
fi

exit 0
