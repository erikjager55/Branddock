#!/bin/bash
# =============================================================================
# Refactor: mockPersonas → usePersonas() in components
# =============================================================================
set -e
echo "🔧 Refactoring mockPersonas → usePersonas()..."
echo ""

# --- Files that ALREADY have usePersonas (just remove mock import + rename) ---
echo "=== Files with existing usePersonas ==="

for f in \
  src/components/strategy-tools/CampaignStrategyGeneratorDetail.tsx \
  src/components/strategy-tools/UniversalStrategyGenerator.tsx; do
  echo "  📝 $f"
  sed -i '' "/import { mockPersonas } from.*mock-personas/d" "$f"
  sed -i '' 's/mockPersonas/personas/g' "$f"
  echo "     ✓ Removed mock import, renamed to personas"
done
echo ""

# --- Files that need usePersonas added ---
echo "=== Files needing usePersonas hook ==="

# Helper function
add_personas_hook() {
  local file="$1"
  local ctx_import="$2"
  echo "  📝 $file"

  # Remove mock import
  sed -i '' "/import { mockPersonas } from.*mock-personas/d" "$file"

  # Add context import if not present
  if ! grep -q "usePersonas" "$file"; then
    # Try to add after useBrandAssets import, otherwise after last import
    if grep -q "useBrandAssets" "$file"; then
      sed -i '' "/import { useBrandAssets }/a\\
import { usePersonas } from '${ctx_import}/contexts/PersonasContext';
" "$file"
    else
      # Add after last import line
      last_import=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
      sed -i '' "${last_import}a\\
import { usePersonas } from '${ctx_import}/contexts/PersonasContext';
" "$file"
    fi
    echo "     ✓ Added usePersonas import"
  fi

  # Add hook call if not present
  if ! grep -q "const { personas }" "$file"; then
    # Try to add after useBrandAssets hook call
    if grep -q "const { brandAssets } = useBrandAssets();" "$file"; then
      sed -i '' "/const { brandAssets } = useBrandAssets();/a\\
\\  const { personas } = usePersonas();
" "$file"
    else
      # Add after the function opening brace
      body_line=$(awk '/^export (function|default function)/{found=1} found && /\) \{/{print NR; exit}' "$file")
      if [ -n "$body_line" ]; then
        sed -i '' "${body_line}a\\
\\  const { personas } = usePersonas();
" "$file"
      else
        echo "     ⚠️  Could not find insertion point — ADD MANUALLY"
      fi
    fi
    echo "     ✓ Added usePersonas() hook"
  fi

  # Rename all mockPersonas → personas
  sed -i '' 's/mockPersonas/personas/g' "$file"
  echo "     ✓ Renamed mockPersonas → personas"
  echo ""
}

add_personas_hook "src/components/ResearchHubEnhanced.tsx" ".."
add_personas_hook "src/components/StrategicResearchPlanner.tsx" ".."
add_personas_hook "src/components/ResearchTargetSelector.tsx" ".."
add_personas_hook "src/components/strategy-tools/campaign-output/StrategicReport.tsx" "../../.."

echo "=== Verification ==="
remaining=$(grep -rn "mockPersonas" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "Remaining mockPersonas in src/components/: $remaining"

if [ "$remaining" -gt 0 ]; then
  echo ""
  echo "⚠️  Still referencing mockPersonas:"
  grep -rn "mockPersonas" src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null
fi

echo ""
echo "TS error check:"
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

echo ""
echo "✅ Done!"
echo "  git add -A && git commit -m 'refactor: replace mockPersonas with usePersonas() context hook in components'"
