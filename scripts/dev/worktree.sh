#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# worktree.sh — maak in één commando een geïsoleerde worktree voor één taak.
#
# Werkwijze-regel (CLAUDE.md): elke code-wijziging die je commit hoort in een
# eigen worktree, met precies één Claude-sessie erin. De main-worktree
# (branddock-app) is voor coördineren/reviewen/lezen. Dit script haalt de
# setup-frictie weg — dé reden dat worktrees anders gemeden worden.
#
# Doet: worktree aanmaken vanaf origin/main + .env.local kopiëren + npm ci +
# prisma generate (per worktree-build-gotcha: Turbopack wil een échte
# node_modules, geen symlink).
#
# Gebruik:
#   scripts/dev/worktree.sh <task-id> [base-branch] [branch-naam]
#   scripts/dev/worktree.sh pricing-credits
#   scripts/dev/worktree.sh e2e-fix origin/main fix/e2e-flow
#   scripts/dev/worktree.sh --done <task-id>   # opruimen ná merge (weigert dirty tree)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

# ── --done <task-id>: taak-worktree + gemergde branch opruimen ──────────────
if [ "${1:-}" = "--done" ]; then
  TASK="${2:-}"
  if [ -z "$TASK" ]; then
    echo "Gebruik: scripts/dev/worktree.sh --done <task-id>" >&2
    exit 1
  fi
  ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Niet in een git-repo." >&2; exit 1; }
  DIR="$(dirname "$ROOT")/branddock-$TASK"
  if [ "$ROOT" = "$DIR" ]; then
    # Vanuit de doel-worktree zelf: remove zou slagen maar de branch-delete
    # faalt daarna stil (cwd weg) — draai dit vanuit de main-worktree.
    echo "🚫 Je staat ín $DIR — draai --done vanuit de main-worktree (branddock-app)." >&2
    exit 1
  fi
  if [ ! -d "$DIR" ]; then
    echo "Geen worktree op $DIR" >&2
    exit 1
  fi
  if [ -n "$(git -C "$DIR" status --porcelain 2>/dev/null)" ]; then
    echo "🚫 Worktree is niet schoon ($DIR) — commit/stash eerst, of ruim handmatig op." >&2
    exit 1
  fi
  BRANCH=$(git -C "$DIR" branch --show-current)
  git -C "$ROOT" worktree remove "$DIR" || { echo "worktree remove faalde." >&2; exit 1; }
  echo "→ worktree verwijderd: $DIR"
  if [ -n "$BRANCH" ]; then
    # -d = safe delete: weigert zolang de branch niet gemerged is.
    if git -C "$ROOT" branch -d "$BRANCH" 2>/dev/null; then
      echo "→ branch verwijderd: $BRANCH"
    else
      echo "⚠️  Branch '$BRANCH' is niet (volledig) gemerged — laten staan. Verwijder bewust met: git branch -D $BRANCH"
    fi
  fi
  exit 0
fi

TASK="${1:-}"
BASE="${2:-origin/main}"
BRANCH="${3:-}"

if [ -z "$TASK" ]; then
  echo "Gebruik: scripts/dev/worktree.sh <task-id> [base-branch] [branch-naam]" >&2
  exit 1
fi

# Branch-default: feat/<task> tenzij expliciet meegegeven of de task al een prefix heeft.
if [ -z "$BRANCH" ]; then
  case "$TASK" in
    */*) BRANCH="$TASK" ;;      # bevat al een prefix (fix/…, chore/…)
    *)   BRANCH="feat/$TASK" ;;
  esac
fi

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Niet in een git-repo." >&2; exit 1; }
PARENT=$(dirname "$ROOT")
DIR="$PARENT/branddock-$TASK"

if [ -e "$DIR" ]; then
  echo "⚠️  Bestaat al: $DIR" >&2
  echo "    Open een nieuwe Claude-sessie daar:  cd \"$DIR\"" >&2
  exit 1
fi

echo "→ origin ophalen…"
git -C "$ROOT" fetch origin --quiet || { echo "git fetch faalde." >&2; exit 1; }

echo "→ worktree aanmaken: $DIR  (branch '$BRANCH' vanaf $BASE)"
git -C "$ROOT" worktree add "$DIR" -b "$BRANCH" "$BASE" || {
  echo "worktree add faalde (bestaat de branch al? kies dan een andere naam)." >&2
  exit 1
}

# .env.local is niet getrackt — kopieer 'm mee zodat de app draait.
if [ -f "$ROOT/.env.local" ]; then
  cp "$ROOT/.env.local" "$DIR/.env.local" && echo "→ .env.local gekopieerd"
else
  echo "⚠️  Geen .env.local in de main-worktree — kopieer 'm handmatig als de app 'm nodig heeft."
fi

echo "→ npm ci  (± 1-2 min; Turbopack heeft een echte node_modules per worktree nodig)…"
( cd "$DIR" && npm ci ) || { echo "npm ci faalde — draai 'm handmatig in $DIR." >&2; exit 1; }

echo "→ prisma generate…"
( cd "$DIR" && npx prisma generate >/dev/null 2>&1 ) || echo "⚠️  prisma generate faalde — draai 'm handmatig in $DIR."

echo ""
echo "✅ Worktree klaar: $DIR"
echo "   branch : $BRANCH  (vanaf $BASE)"
echo ""
echo "→ Open nu een NIEUWE Claude-sessie in deze map (niet in de main-worktree):"
echo "     cd \"$DIR\""
echo ""
echo "Als je klaar bent (branch gemerged): scripts/dev/worktree.sh --done <task-id>  óf  git worktree remove \"$DIR\""
