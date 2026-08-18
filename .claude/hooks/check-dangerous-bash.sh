#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse hook voor Bash — checkt op gevaarlijke commando's.
# Werkt complementair aan permissions.deny (defense-in-depth).
#
# 2026-08-18 (guard-hooks-hardening) — herzien op twee bevindingen:
#
#   1. DE MELDING LOOG. Er stond "voeg expliciete user-confirmation toe via
#      'I know what I'm doing'", maar geen enkel codepad honoreerde die zin. Erger:
#      zo'n escape is principieel onmogelijk. Een PreToolUse-hook kent alleen
#      `allow` en `deny` — er is géén `ask`, dus een hook kán niet om bevestiging
#      vragen. En een escape-zin ín het commando wordt door Claude getypt, niet
#      door de gebruiker; dat is geen confirmation maar een self-service bypass.
#
#   2. DE BLOKKADE WAS TEKSTUEEL, NIET OPERATIONEEL. `git reset --hard origin`
#      werd geblokkeerd, `git reset --hard <sha>` niet — exact even destructief.
#      Tegelijk was `git push --force-with-lease` op een eigen feature-branch
#      geblokkeerd terwijl dat routine is. De check keek naar de spelling van het
#      argument in plaats van naar de operatie en zijn doel.
#
# Nu drie lagen:
#   CRITICAL     — altijd blokkeren. Onherstelbaar of buiten de repo.
#   BRANCH-AWARE — blokkeren op main/master, doorlaten op een eigen branch.
#   WARNING      — melden, doorlaten.
#
# Fail-open bij twijfel (zelfde regel als session-guard): kan het doel niet
# bepaald worden, dan doorlaten. Een guard die legitiem werk blokkeert wordt
# omzeild, en dan bewaakt hij niets meer.
# ─────────────────────────────────────────────────────────────────────────────

# Bewust géén `set -e`: een functie die "nee" teruggeeft (exit 1) mag deze hook
# niet laten stoppen — dat zou stil fail-closed worden.

INPUT=$(cat 2>/dev/null)

command -v jq >/dev/null 2>&1 || exit 0

LIB="$(dirname "$0")/lib/guard-lib.sh"
[ -f "$LIB" ] || exit 0
# shellcheck source=lib/guard-lib.sh
. "$LIB" || exit 0

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null)

block() {
  echo "🚫 BLOCKED: $1" >&2
  echo "   Commando: $COMMAND" >&2
  echo "" >&2
  echo "Deze hook kan niet om bevestiging vragen — een PreToolUse-hook kent alleen" >&2
  echo "'allow' en 'deny', geen 'ask'. Moet dit écht:" >&2
  echo "  • draai het zelf in je terminal, of" >&2
  echo "  • pas de lijst aan in .claude/hooks/check-dangerous-bash.sh" >&2
  exit 2
}

# ── Laag 1: CRITICAL — altijd blokkeren ──────────────────────────────────────
CRITICAL_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \$HOME"
  "rm -rf \\*"
  "git clean -fdx"
  "git branch -D (main|master)([[:space:]]|$)"
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

for pattern in "${CRITICAL_PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -qE "$pattern"; then
    block "onherstelbaar commando gedetecteerd (patroon: $pattern)"
  fi
done

# ── Laag 2: BRANCH-AWARE — alleen blokkeren richting main/master ─────────────
TARGET_WT=$(resolve_target_worktree "$COMMAND" "$CWD")
# Zie guard-lib: zonder normalisatie glipt `git -C <pad> reset --hard` erlangs.
CMD_NORM=$(normalize_git_cmd "$COMMAND")

# Force-push: expliciete refspec naar main/master, anders de huidige branch.
if printf '%s' "$CMD_NORM" | grep -qE 'git[[:space:]]+push([[:space:]]|$)' \
   && printf '%s' "$CMD_NORM" | grep -qE '(--force-with-lease|--force|[[:space:]]-f([[:space:]]|$))'; then
  if printf '%s' "$COMMAND" | grep -qE '(^|[[:space:]:])(main|master)([[:space:]]|$)'; then
    block "force-push naar een beschermde branch (main/master)"
  fi
  CUR=$(current_branch_of "$TARGET_WT")
  if is_protected_branch "$CUR"; then
    block "force-push terwijl '$CUR' is uitgecheckt in $TARGET_WT"
  fi
  echo "⚠️  force-push op branch '${CUR:-onbekend}' — toegestaan, maar controleer de scope." >&2
fi

# reset --hard werkt altijd op de uitgecheckte branch; het argument is irrelevant.
if printf '%s' "$CMD_NORM" | grep -qE 'git[[:space:]]+reset[^|;]*--hard'; then
  CUR=$(current_branch_of "$TARGET_WT")
  if is_protected_branch "$CUR"; then
    block "'git reset --hard' terwijl '$CUR' is uitgecheckt in $TARGET_WT — dit gooit lokaal werk op een beschermde branch weg"
  fi
  echo "⚠️  'git reset --hard' op branch '${CUR:-onbekend}' — toegestaan, maar verifieer dat er niets ongecommit is." >&2
fi

# ── Laag 3: WARNING — melden, doorlaten ──────────────────────────────────────
WARNING_PATTERNS=(
  "git checkout --"
  "git restore --staged"
  "rm -rf"
  "DELETE FROM"
  "UPDATE.*WHERE"
)

for pattern in "${WARNING_PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -qiE "$pattern"; then
    echo "⚠️  WARNING: potentieel destructief commando — verifieer scope:" >&2
    echo "   $COMMAND" >&2
    echo "" >&2
    break
  fi
done

exit 0
