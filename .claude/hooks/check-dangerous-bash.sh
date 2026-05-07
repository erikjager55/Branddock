#!/bin/bash
# PreToolUse hook voor Bash — checkt op gevaarlijke commando's en blokkeert ze.
# Werkt complementair aan permissions.deny (defense-in-depth).

set -e

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Lijst van patronen die altijd geblokkeerd worden
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \$HOME"
  "rm -rf \\*"
  "git push.*--force"
  "git push.*-f "
  "git push.*--force-with-lease"
  "git reset --hard origin"
  "git clean -fdx"
  "git branch -D main"
  "git branch -D master"
  "git filter-branch"
  "DROP DATABASE"
  "DROP TABLE"
  "TRUNCATE TABLE"
  "npm publish"
  "npx prisma migrate reset"
  "chmod -R 777"
  "chown -R"
  "kill -9 1"
  ">/dev/sda"
  "dd if="
  "mkfs"
  ":(){ :|:& };:"
)

# Check elk patroon
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "🚫 BLOCKED: gevaarlijk commando gedetecteerd:" >&2
    echo "   Patroon: $pattern" >&2
    echo "   Commando: $COMMAND" >&2
    echo "" >&2
    echo "Als dit echt nodig is, voeg expliciete user-confirmation toe via 'I know what I'm doing'." >&2
    # Exit 2 = block tool execution + send stderr to Claude
    exit 2
  fi
done

# Waarschuwing voor potentieel gevaarlijke patronen (niet blocking)
WARNING_PATTERNS=(
  "git reset --hard"
  "git checkout --"
  "git restore --staged"
  "rm -rf"
  "DELETE FROM"
  "UPDATE.*WHERE"
)

for pattern in "${WARNING_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qiE "$pattern"; then
    echo "⚠️  WARNING: potentieel destructief commando — verifieer scope:" >&2
    echo "   $COMMAND" >&2
    echo "" >&2
    break
  fi
done

exit 0
