#!/bin/bash
if [[ "$TOOL_NAME" == "edit" || "$TOOL_NAME" == "write" ]]; then
  FILE="$TOOL_FILE"
  if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
    pnpm eslint --fix "$FILE" 2>/dev/null
    pnpm prettier --write "$FILE" 2>/dev/null
  fi
fi
