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
# Mechanisme: een per-worktree lock (heartbeat, geen PID → zelfhelend).
#   - SessionStart : detecteer een levende co-sessie → waarschuw. Anders: claim.
#   - PreToolUse(Bash): heartbeat verversen; blokkeer HEAD/branch/index-mutaties
#                       die een worktree raken waar een ANDERE sessie in zit.
#
# 2026-08-18 (guard-hooks-hardening) — drie correcties, alle drie op empirie:
#   1. De worktree wordt nu afgeleid uit het COMMANDO (`cd`, `git -C`) i.p.v. uit
#      de cwd van het hook-proces. Daarvóór blokkeerde een sessie in branddock-app
#      élke git-mutatie in élke andere worktree. Zie guard-lib.sh.
#   2. `git worktree add` is vrijgegeven — dat mutéért geen HEAD of index van de
#      huidige worktree en was dus een pure fout-positieve. `remove|move|prune`
#      blijft bewaakt, inclusief het pad-argument.
#   3. `gh pr merge` WAARSCHUWT bij een co-sessie (Eriks keuze 18-08: niet
#      blokkeren — twee sessies die elk hun eigen PR mergen is legitiem). Zie de
#      melding voor wat er in beide incidenten écht misging.
#
# Fail-open: als de guard zelf een fout raakt of het doel niet kan bepalen,
# exit 0 (nooit legitiem werk blokkeren door een bug in de guard). Alleen een
# bewuste co-sessie-botsing geeft exit 2.
# ─────────────────────────────────────────────────────────────────────────────

INPUT=$(cat 2>/dev/null)

# jq ontbreekt? → guard uit (fail-open), zodat we niks blokkeren.
command -v jq >/dev/null 2>&1 || exit 0

LIB="$(dirname "$0")/lib/guard-lib.sh"
[ -f "$LIB" ] || exit 0
# shellcheck source=lib/guard-lib.sh
. "$LIB" || exit 0

EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // ""' 2>/dev/null)
SID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null)
[ -z "$SID" ] && SID="unknown-$$"

# De worktree van de SESSIE — hier woont onze eigen lock/heartbeat.
[ -n "$CWD" ] && [ -d "$CWD" ] && SESSION_ROOT=$(git -C "$CWD" rev-parse --show-toplevel 2>/dev/null)
[ -z "$SESSION_ROOT" ] && SESSION_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$SESSION_ROOT" ] && exit 0

NOW=$(date +%s)
STALE=900   # 15 min zonder heartbeat → lock is verlaten
BRANCH=$(git -C "$SESSION_ROOT" branch --show-current 2>/dev/null); [ -z "$BRANCH" ] && BRANCH="(detached)"

write_lock() {
  printf '%s\n%s\n%s\n' "$SID" "$NOW" "$BRANCH" > "$SESSION_ROOT/.claude-session.lock" 2>/dev/null
}

# ── SessionStart ──────────────────────────────────────────────────────────────
if [ "$EVENT" = "SessionStart" ]; then
  if has_live_cosession "$SESSION_ROOT" "$SID" "$STALE"; then
    echo "⚠️  LET OP — er draait al een Claude-sessie in DEZE worktree:"
    echo "    $SESSION_ROOT"
    echo "    (sessie ${GUARD_CO_SID:0:8}, branch '${GUARD_CO_BRANCH}', ${GUARD_CO_AGE}s geleden actief)"
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

# Heartbeat eerst: ook als we straks blokkeren of waarschuwen houden we onze
# eigen lock vers — zolang wij 'm daadwerkelijk houden.
has_live_cosession "$SESSION_ROOT" "$SID" "$STALE" || write_lock

# ── Gat 1: gh pr merge → waarschuwen, niet blokkeren ─────────────────────────
if printf '%s' "$COMMAND" | grep -qE 'gh[[:space:]]+pr[[:space:]]+merge|gh[[:space:]]+pr[[:space:]]+create[^|;]*--merge'; then
  CO=$(find_live_cosessions "$SESSION_ROOT" "$SID" "$STALE" | head -3)
  if [ -n "$CO" ]; then
    {
      echo "⚠️  WAARSCHUWING van session-guard: er draait een andere Claude-sessie in deze repo."
      printf '%s\n' "$CO" | while IFS='|' read -r c_sid c_br c_age c_wt; do
        echo "   sessie ${c_sid:0:8} op branch '${c_br}' (${c_age}s geleden actief) — ${c_wt}"
      done
      echo ""
      echo "Een merge naar main deployt naar PRODUCTIE. Dit wordt bewust niet geblokkeerd"
      echo "(twee sessies die elk hun eigen PR mergen is legitiem), maar controleer eerst"
      echo "waar het 18-07 én 18-08 misging: een VEROUDERDE branch-head."
      echo "   git ls-remote origin <branch>     # moet matchen met wat de PR toont"
      echo "   gh pr view <nr> --json headRefOid -q .headRefOid"
    } >&2
    # systemMessage is het kanaal dat de gebruiker gegarandeerd ziet bij exit 0.
    jq -n --arg m "session-guard: co-sessie actief tijdens 'gh pr merge' — verifieer de head-SHA met 'git ls-remote' vóór je merget (main = productie)." \
      '{systemMessage: $m}' 2>/dev/null
  fi
  exit 0
fi

# ── Gat 2: blokkeer alleen mutaties in de worktree die het commando RAAKT ────
# `git -C <pad> checkout` wegnormaliseren, anders staat het werkwoord niet achter
# `git` en glipt het commando ongezien langs elke verb-regex hieronder.
CMD_NORM=$(normalize_git_cmd "$COMMAND")

# De lijst dekt EFFECTEN, niet alleen de meest voor de hand liggende werkwoorden.
# `pull` stond er tot 18-08 niet op terwijl het een merge uitvoert en HEAD verzet —
# precies de klasse waar deze guard voor bestaat (memory `guard-hooks-gaps`, gat 1b).
# Idem `revert`/`am`/`apply`/`restore`: allemaal muteren ze HEAD, index of werkboom.
is_mutating=false
if printf '%s' "$CMD_NORM" | grep -qE 'git[[:space:]]+(checkout|switch|reset|rebase|cherry-pick|stash|merge|pull|revert|am|apply|restore)([[:space:]]|$)' \
   || printf '%s' "$CMD_NORM" | grep -qE 'git[[:space:]]+branch[[:space:]]+-(f|D|m|M)' \
   || printf '%s' "$CMD_NORM" | grep -qE 'git[[:space:]]+worktree[[:space:]]+(remove|move|prune)([[:space:]]|$)'; then
  is_mutating=true
fi
$is_mutating || exit 0

# Kandidaat-doelen: de worktree die het commando raakt, plus — bij
# `worktree remove|move` — het pad-argument (dat raakt een ándere werkboom).
TARGETS=$(resolve_target_worktree "$COMMAND" "$CWD")
if printf '%s' "$CMD_NORM" | grep -qE 'git[[:space:]]+worktree[[:space:]]+(remove|move)([[:space:]]|$)'; then
  WT_ARG=$(printf '%s' "$COMMAND" | sed -n 's/.*worktree[[:space:]][[:space:]]*\(remove\|move\)[[:space:]][[:space:]]*\(--[^[:space:]]*[[:space:]][[:space:]]*\)*\([^[:space:];|&]*\).*/\3/p' | head -1)
  if [ -n "$WT_ARG" ] && [ -d "$WT_ARG" ]; then
    WT_ROOT=$(git -C "$WT_ARG" rev-parse --show-toplevel 2>/dev/null)
    [ -n "$WT_ROOT" ] && TARGETS=$(printf '%s\n%s' "$TARGETS" "$WT_ROOT")
  fi
fi

# Leeg doel = onbepaalbaar = doorlaten (Eriks keuze 18-08: fail-open).
# Here-string i.p.v. een pipe: een `while` áchter een pipe draait in een subshell,
# waardoor zowel de GUARD_CO_*-variabelen als een exit-status verloren gaan.
while IFS= read -r T; do
  [ -n "$T" ] || continue
  if has_live_cosession "$T" "$SID" "$STALE"; then
    {
      echo "🚫 GEBLOKKEERD door session-guard: er draait een ANDERE Claude-sessie in de worktree die dit commando raakt."
      echo "   worktree : $T"
      echo "   co-sessie: ${GUARD_CO_SID:0:8} op branch '${GUARD_CO_BRANCH}' (${GUARD_CO_AGE}s geleden actief)"
      echo "   commando : $COMMAND"
      echo ""
      echo "Branch-/HEAD-mutaties onder een co-sessie veroorzaakten de churn van 2026-07-07."
      echo "→ Sluit die sessie, OF start deze taak in een eigen worktree: scripts/dev/worktree.sh <task-id>"
    } >&2
    exit 2
  fi
done <<< "$(printf '%s\n' "$TARGETS" | sort -u)"

exit 0
