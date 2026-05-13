#!/usr/bin/env bash
# =============================================================
# content-items-preflight.sh
#
# Pre-flight static-analysis voor content-items verification playbook
# (zie docs/playbooks/content-items-verification.md, phase 0).
#
# Detecteert vier F-klasse patterns gevonden in audit 2026-05-13:
#   F1 — observability-helpers gedefinieerd maar nooit gecalled
#   F2 — gate-functies zonder workspace-level fallback
#   F4 — field-precedence inconsistencies (taal/locale aliases)
#   F-derive-nav — window.location.href in SPA-components
#
# Run: bash scripts/audits/content-items-preflight.sh
# Exit codes: 0 = clean / 1 = warnings found
# =============================================================

set -u
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

WARN_COUNT=0
SECTION_SEP="\n────────────────────────────────────────────────────────"

echo "=== Content-items pre-flight scan ==="
echo "Repo: $REPO_ROOT"
date

# ─── F1 pattern: unused observability helpers ─────────────
echo -e "$SECTION_SEP"
echo "F1 — track-helper functions defined but not called from canvas-orchestrator:"
TRACK_HELPER="src/lib/learning-loop/track-helpers.ts"
ORCHESTRATOR="src/lib/ai/canvas-orchestrator.ts"
if [ -f "$TRACK_HELPER" ] && [ -f "$ORCHESTRATOR" ]; then
  # Verzamel exports in array (vermijd pipe-subshell variable-scope issue)
  TRACK_FNS=()
  while IFS= read -r line; do
    TRACK_FNS+=("$line")
  done < <(grep -E "^export async function tryTrack" "$TRACK_HELPER" \
            | sed 's/.*function \(tryTrack[A-Za-z]*\).*/\1/')
  for fn in "${TRACK_FNS[@]}"; do
    # Sommige helpers (tryTrackStart/Complete) worden niet vanuit canvas-orchestrator
    # gecalled maar uit de AI-call wrappers (createStructuredCompletion etc.). Check
    # daarom over de hele src/ tree, niet alleen orchestrator.
    if grep -rq "\\b$fn\\b" src/lib/ai/ src/lib/learning-loop/ 2>/dev/null; then
      # Filter: alleen tonen als ALLEEN in track-helpers.ts zelf voorkomt (= dead code)
      CALL_SITES=$(grep -rl "\\b$fn\\b" src/lib/ src/app/ 2>/dev/null | grep -v "track-helpers.ts" | head -3)
      if [ -z "$CALL_SITES" ]; then
        echo "  ⚠️  $fn — defined but never imported/called outside track-helpers.ts"
        echo "WARN" >> /tmp/.preflight-warns
      else
        echo "  ✓ $fn — wired ($(echo "$CALL_SITES" | wc -l | tr -d ' ') callsite[s])"
      fi
    else
      echo "  ⚠️  $fn — completely unused"
      echo "WARN" >> /tmp/.preflight-warns
    fi
  done
fi

# ─── F4 pattern: language/locale field aliases ─────────────
echo -e "$SECTION_SEP"
echo "F4 — language/locale field aliases in Prisma schema:"
if [ -f "prisma/schema.prisma" ]; then
  LANG_FIELDS=$(grep -nE "^\s+(contentLanguage|contentLocale|locale)\s+" prisma/schema.prisma \
    | grep -v "^//")
  if [ -n "$LANG_FIELDS" ]; then
    echo "$LANG_FIELDS" | head -10 | sed 's/^/  /'
    echo ""
    echo "  Precedence check — brand-context.ts should resolve via:"
    if grep -q "voiceguide.*contentLocale" src/lib/ai/brand-context.ts 2>/dev/null; then
      echo "  ✓ voiceguide.contentLocale referenced in brand-context.ts"
    else
      echo "  ⚠️  brand-context.ts does NOT reference voiceguide.contentLocale — workspace.contentLanguage wint mogelijk"
      echo "WARN" >> /tmp/.preflight-warns
    fi
  fi
fi

# ─── F2 pattern: gate strictness ─────────────────────────
echo -e "$SECTION_SEP"
echo "F2 — checkpoint-gate functies (controleer dat ze meerdere input-shapes accepteren):"
GATES_FILE="src/lib/content-test/checkpoint-gates.ts"
if [ -f "$GATES_FILE" ]; then
  grep -nE "^export function (validate[A-Z][A-Za-z]+)" "$GATES_FILE" \
    | sed 's/.*function \([a-zA-Z]*\).*/  validate-fn: \1/'
  echo ""
  echo "  Manual review: open $GATES_FILE en check dat elke validate-fn:"
  echo "  1. Een workspace-level fallback heeft, of"
  echo "  2. Brief.audience-substitute accepteert, of"
  echo "  3. Block alleen op echt-blokkerende afwezigheid (geen brandName) niet op niet-essentieel detail"
fi

# ─── F-derive-nav: SPA-anti-pattern ──────────────────────
echo -e "$SECTION_SEP"
echo "F-derive-nav — window.location.href in src/features (hybride SPA navigeert via state):"
# OAuth-redirects via /api/social-connect/ zijn legitiem (externe redirect verplicht);
# alleen flaggen wanneer href naar interne route wijst (/?deliverableId, /dashboard, etc.)
HARDNAV=$(grep -rn "window\.location\.href\s*=" src/features/ 2>/dev/null \
  | grep -v "\.test\.\|\.spec\." \
  | grep -v "/api/\|http\|https" \
  | grep -v "^\s*//")
if [ -n "$HARDNAV" ]; then
  echo "$HARDNAV" | sed 's/^/  ⚠️  /'
  echo "  → gebruik useUIState.setActiveSection + relevante store-setter ipv URL"
  echo "WARN" >> /tmp/.preflight-warns
else
  echo "  ✓ Geen interne hard-navigation gevonden (OAuth-redirects in IntegrationsTab zijn legitiem)"
fi

# ─── F-property-eval-coverage check (extra) ──────────────
echo -e "$SECTION_SEP"
echo "Property-eval coverage check:"
PROP_EVAL="src/lib/content-test/property-evals.ts"
if [ -f "$PROP_EVAL" ]; then
  CHECK_COUNT=$(grep -cE "^export function check" "$PROP_EVAL")
  ID_COUNT=$(grep -cE "^\s+\|\s+'[a-z-]+'" "src/lib/content-test/types.ts" 2>/dev/null || echo 0)
  echo "  Aantal check-functies: $CHECK_COUNT"
  echo "  Aantal PropertyEvalCheckId union-members: $ID_COUNT"
  if [ "$CHECK_COUNT" != "$ID_COUNT" ]; then
    echo "  ⚠️  Mismatch — voeg ontbrekende check of update union-type"
    echo "WARN" >> /tmp/.preflight-warns
  else
    echo "  ✓ Match"
  fi
fi

# ─── Summary ─────────────────────────────────────────────
echo -e "$SECTION_SEP"
if [ -f /tmp/.preflight-warns ]; then
  W=$(wc -l < /tmp/.preflight-warns | tr -d ' ')
  echo "RESULT: $W warning(s) — review hierboven voor details"
  rm /tmp/.preflight-warns
  exit 1
else
  echo "RESULT: clean — no F-class anti-patterns gedetecteerd"
  exit 0
fi
