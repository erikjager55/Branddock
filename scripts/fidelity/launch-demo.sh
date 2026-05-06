#!/usr/bin/env bash
# scripts/fidelity/launch-demo.sh
#
# Pre-flight diagnostic + dev server launcher voor F-VAL demo QA.
# Verifieert dat de demo flow ready is voordat je de browser opent.
#
# Usage:
#   bash scripts/fidelity/launch-demo.sh

set -e

cd "$(dirname "$0")/../.."

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "F-VAL Demo Launch Diagnostic"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. API keys ──
echo "→ API keys check"
if grep -E "^ANTHROPIC_API_KEY=sk-ant" .env.local > /dev/null; then
  echo "  ✓ ANTHROPIC_API_KEY aanwezig (STRICT rewrite werkt)"
else
  echo "  ✗ ANTHROPIC_API_KEY ontbreekt — STRICT mode zal falen"
fi
if grep -E "^OPENAI_API_KEY=sk-" .env.local > /dev/null; then
  echo "  ✓ OPENAI_API_KEY aanwezig (G-Eval judge + vanille baseline werken)"
else
  echo "  ✗ OPENAI_API_KEY ontbreekt — pijler 2 + vanille comparison falen"
fi
echo ""

# ── 2. Pilot workspace check ──
echo "→ Pilot workspace status"
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql"
DB_URL="postgresql://erikjager:@localhost:5432/branddock"

$PSQL "$DB_URL" -t -c "
select
  rpad(w.name, 16) ||
  '  voice=' || rpad(coalesce(fc.\"humanVoiceMode\"::text, '-'), 8) ||
  '  BP=' || (
    case when ba.\"frameworkData\" is null then 'NULL'
    else jsonb_array_length(coalesce(ba.\"frameworkData\"->'wordsWeUse', '[]'::jsonb))::text || 'w/' || jsonb_array_length(coalesce(ba.\"frameworkData\"->'personalityTraits', '[]'::jsonb))::text || 't'
    end
  )
from \"Workspace\" w
left join \"FidelityConfig\" fc on fc.\"workspaceId\" = w.id
left join \"BrandAsset\" ba on ba.\"workspaceId\" = w.id and ba.\"frameworkType\" = 'BRAND_PERSONALITY'
where w.name ilike any(array['%better brands%','%linfi%','%nobox%','%wra%'])
order by w.name;
" | sed 's/^/  /'

echo ""

# ── 3. TypeScript ──
echo "→ TypeScript check (kan 30-60s duren)"
if npx tsc --noEmit 2>&1 | tail -5 | grep -q "error TS"; then
  echo "  ✗ TypeScript errors gevonden — los eerst op:"
  npx tsc --noEmit 2>&1 | tail -10 | sed 's/^/    /'
  exit 1
else
  echo "  ✓ TypeScript clean"
fi
echo ""

# ── 4. Recent commits ──
echo "→ Recent F-VAL commits (last 10)"
git log --oneline -10 | grep -i "f-val\|fidelity" | head -10 | sed 's/^/  /'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Klaar voor browser QA."
echo ""
echo "Open daarna in browser:"
echo "  http://localhost:3000"
echo ""
echo "Login:                    erik@branddock.com / Password123!"
echo "Pilot workspaces:         Better Brands / Linfi / Nobox / WRA Juristen (allen STRICT)"
echo "QA checklist:             docs/fidelity/F-VAL-demo-qa-checklist.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Druk Ctrl+C om dev server te stoppen."
echo ""

# ── 5. Launch dev server ──
exec npm run dev
