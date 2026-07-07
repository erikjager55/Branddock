#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Session-guard — borgt "één Claude-sessie per worktree".
#
# Achtergrond: twee Claude-sessies in dezelfde werkboom delen één .git
# (HEAD/index) én node_modules. Op 2026-07-07 leidde dat tot uren git-churn:
# de ene sessie reset main terwijl de ander cherry-pickte, AA-conflicten in de
# gedeelde index, en een verdwenen node_modules/eslint + ongegenereerde
# Prisma-client. Zie gotchas.md 2026-07-07.
#
# Mechanisme: een per-worktree lock (heartbeat, geen PID → zelfhelend). Elke
# worktree heeft z'n eigen root, dus de lock detecteert precies "twee sessies
# in dezelfde werkboom".
#   - SessionStart : detecteer een levende co-sessie → waarschuw. Anders: claim.
#   - PreToolUse(Bash): heartbeat verversen; blokkeer HEAD/branch/index-mutaties
#                       als er een levende co-sessie is (exit 2).
#
# Fail-open: als de guard zelf een fout raakt, exit 0 (nooit legitiem werk
# blokkeren door een bug in de guard). Alleen een bewuste co-sessie-botsing
# geeft exit 2.
# ─────────────────────────────────────────────────────────────────────────────

INPUT=$(cat 2>/dev/null)

# jq ontbreekt? → guard uit (fail-open), zodat we niks blokkeren.
command -v jq >/dev/null 2>&1 || exit 0

EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // ""' 2>/dev/null)
SID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)
[ -z "$SID" ] && SID="unknown-$$"

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
LOCK="$ROOT/.claude-session.lock"
NOW=$(date +%s)
STALE=900   # 15 min zonder heartbeat → lock is verlaten

BRANCH=$(git branch --show-current 2>/dev/null); [ -z "$BRANCH" ] && BRANCH="(detached)"

write_lock() { printf '%s\n%s\n%s\n' "$SID" "$NOW" "$BRANCH" > "$LOCK" 2>/dev/null; }

# Bestaande lock inlezen
O_SID=""; O_HB=0; O_BRANCH=""
if [ -f "$LOCK" ]; then
  O_SID=$(sed -n '1p' "$LOCK" 2>/dev/null)
  O_HB=$(sed -n '2p' "$LOCK" 2>/dev/null)
  O_BRANCH=$(sed -n '3p' "$LOCK" 2>/dev/null)
fi
case "$O_HB" in ''|*[!0-9]*) O_HB=0 ;; esac
AGE=$(( NOW - O_HB ))

# Co-sessie = een andere session_id met een verse heartbeat
CO_SESSION=false
if [ -n "$O_SID" ] && [ "$O_SID" != "$SID" ] && [ "$AGE" -lt "$STALE" ]; then
  CO_SESSION=true
fi

if [ "$EVENT" = "SessionStart" ]; then
  if $CO_SESSION; then
    echo "⚠️  LET OP — er draait al een Claude-sessie in DEZE worktree:"
    echo "    $ROOT"
    echo "    (sessie ${O_SID:0:8}, branch '${O_BRANCH}', ${AGE}s geleden actief)"
    echo ""
    echo "Twee sessies in één werkboom delen HEAD/index/node_modules — dat"
    echo "veroorzaakte de git-churn van 2026-07-07 (zie gotchas.md)."
    echo "→ Sluit die sessie, OF start deze taak in een eigen worktree:"
    echo "     scripts/dev/worktree.sh <task-id>"
    # De ander houdt de lock; wij claimen niet.
  else
    write_lock
  fi
  exit 0
fi

# ── PreToolUse(Bash) ──────────────────────────────────────────────────────────
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)

if $CO_SESSION; then
  # Blokkeer alleen HEAD/branch/index-muterende git-ops — dát is wat twee
  # sessies in één werkboom kapotmaakt. Edits, reads, npm, tsc, commit, push
  # blijven toegestaan.
  if printf '%s' "$COMMAND" | grep -qE 'git[[:space:]]+(checkout|switch|reset|rebase|cherry-pick|stash|worktree|merge)([[:space:]]|$)' \
     || printf '%s' "$COMMAND" | grep -qE 'git[[:space:]]+branch[[:space:]]+-(f|D|m|M)'; then
    echo "🚫 GEBLOKKEERD door session-guard: er draait een ANDERE Claude-sessie in deze worktree." >&2
    echo "   worktree : $ROOT" >&2
    echo "   co-sessie: ${O_SID:0:8} op branch '${O_BRANCH}' (${AGE}s geleden actief)" >&2
    echo "   commando : $COMMAND" >&2
    echo "" >&2
    echo "Branch-/HEAD-mutaties onder een co-sessie veroorzaakten de churn van 2026-07-07." >&2
    echo "→ Sluit die sessie, OF start deze taak in een eigen worktree: scripts/dev/worktree.sh <task-id>" >&2
    exit 2
  fi
  # Toegestane op onder co-sessie: niet onze lock overschrijven (de ander houdt 'm).
  exit 0
fi

# Geen co-sessie → wij zijn de houder: heartbeat verversen.
write_lock
exit 0
