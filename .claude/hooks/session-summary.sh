#!/bin/bash
# Stop hook — draait wanneer Claude Code sessie eindigt.
# Logt sessie-summary naar ~/.claude/sessions/<datum>.md voor latere retro.

set -e

INPUT=$(cat)

# Sessie-data
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""')
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M:%S)
SESSION_DIR="$HOME/.claude/sessions"
SESSION_FILE="$SESSION_DIR/$DATE.md"

mkdir -p "$SESSION_DIR"

# Append entry
{
  echo ""
  echo "## $TIME — sessie $SESSION_ID"
  echo ""
  echo "**Working directory:** $CLAUDE_PROJECT_DIR"

  # Git state
  if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
    cd "$CLAUDE_PROJECT_DIR" || exit 0
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    LAST_COMMIT=$(git log -1 --pretty=format:"%h %s" 2>/dev/null || echo "no commits")
    echo "**Git branch:** $BRANCH"
    echo "**Uncommitted changes:** $DIRTY files"
    echo "**Last commit:** $LAST_COMMIT"
  fi

  # Active task (search task-files with status: in-progress)
  if [ -d "$CLAUDE_PROJECT_DIR/tasks" ]; then
    ACTIVE=$(grep -l "^status: in-progress" "$CLAUDE_PROJECT_DIR"/tasks/*.md 2>/dev/null | xargs -I{} basename {} .md | tr '\n' ', ' | sed 's/,$//')
    if [ -n "$ACTIVE" ]; then
      echo "**Active tasks:** $ACTIVE"
    fi
  fi

  echo ""
} >> "$SESSION_FILE"

# Header for new file
if [ ! -s "$SESSION_FILE" ] || ! grep -q "^# Sessions" "$SESSION_FILE"; then
  TEMP=$(mktemp)
  echo "# Sessions $DATE" > "$TEMP"
  cat "$SESSION_FILE" >> "$TEMP"
  mv "$TEMP" "$SESSION_FILE"
fi

exit 0
