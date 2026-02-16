#!/bin/bash
# =============================================================================
# Fix callers: pass brandAssets + personas to refactored functions/services
# =============================================================================
set -e
echo "🔧 Fixing callers..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. CampaignStrategyGeneratorDetail.tsx
#    - Already has useBrandAssets(), needs usePersonas()
#    - Prefix all calculate calls with brandAssets, personas
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 CampaignStrategyGeneratorDetail.tsx"
FILE="src/components/strategy-tools/CampaignStrategyGeneratorDetail.tsx"

# Add usePersonas import if not present
if ! grep -q "usePersonas" "$FILE"; then
  sed -i '' "/import { useBrandAssets }/a\\
import { usePersonas } from '../../contexts/PersonasContext';
" "$FILE"
fi

# Add usePersonas hook after useBrandAssets hook
if ! grep -q "const { personas }" "$FILE"; then
  sed -i '' "/const { brandAssets } = useBrandAssets();/a\\
\\  const { personas } = usePersonas();
" "$FILE"
fi

# Fix calculateCampaignDecision calls: add brandAssets, personas as first args
sed -i '' 's/calculateCampaignDecision(selectedBrandAssets, selectedPersonas)/calculateCampaignDecision(brandAssets, personas, selectedBrandAssets, selectedPersonas)/g' "$FILE"

# Fix calculateDecisionGate calls
sed -i '' 's/calculateDecisionGate(selectedBrandAssets, selectedPersonas)/calculateDecisionGate(brandAssets, personas, selectedBrandAssets, selectedPersonas)/g' "$FILE"

# Fix calculateSectionDecision calls - these have pattern: calculateSectionDecision('type', selectedBrandAssets, selectedPersonas, ...)
sed -i '' "s/calculateSectionDecision('template', selectedBrandAssets, selectedPersonas/calculateSectionDecision(brandAssets, personas, 'template', selectedBrandAssets, selectedPersonas/g" "$FILE"
sed -i '' "s/calculateSectionDecision('campaign-details', selectedBrandAssets, selectedPersonas/calculateSectionDecision(brandAssets, personas, 'campaign-details', selectedBrandAssets, selectedPersonas/g" "$FILE"
sed -i '' "s/calculateSectionDecision('brand-assets', selectedBrandAssets, selectedPersonas/calculateSectionDecision(brandAssets, personas, 'brand-assets', selectedBrandAssets, selectedPersonas/g" "$FILE"
sed -i '' "s/calculateSectionDecision('advanced', selectedBrandAssets, selectedPersonas/calculateSectionDecision(brandAssets, personas, 'advanced', selectedBrandAssets, selectedPersonas/g" "$FILE"
sed -i '' "s/calculateSectionDecision('channels', selectedBrandAssets, selectedPersonas/calculateSectionDecision(brandAssets, personas, 'channels', selectedBrandAssets, selectedPersonas/g" "$FILE"

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 2. UniversalStrategyGenerator.tsx
#    - Already has useBrandAssets(), needs usePersonas()
#    - Prefix calculate calls with brandAssets, personas
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 UniversalStrategyGenerator.tsx"
FILE="src/components/strategy-tools/UniversalStrategyGenerator.tsx"

if ! grep -q "usePersonas" "$FILE"; then
  sed -i '' "/import { useBrandAssets }/a\\
import { usePersonas } from '../../contexts/PersonasContext';
" "$FILE"
fi

if ! grep -q "const { personas }" "$FILE"; then
  sed -i '' "/const { brandAssets } = useBrandAssets();/a\\
\\  const { personas } = usePersonas();
" "$FILE"
fi

# Fix calculateCampaignDecision: currently (selectedBrandAssets, selectedPersonas, selectedProducts, selectedTrends, selectedKnowledge)
# Add brandAssets, personas before selectedBrandAssets
sed -i '' 's/return calculateCampaignDecision(/return calculateCampaignDecision(\n      brandAssets, personas,/' "$FILE"

# Fix calculateSectionDecision calls: ('type', selectedX) → (brandAssets, personas, 'type', selectedX)
sed -i '' "s/calculateSectionDecision('brand', /calculateSectionDecision(brandAssets, personas, 'brand', /g" "$FILE"
sed -i '' "s/calculateSectionDecision('persona', /calculateSectionDecision(brandAssets, personas, 'persona', /g" "$FILE"
sed -i '' "s/calculateSectionDecision('products', /calculateSectionDecision(brandAssets, personas, 'products', /g" "$FILE"
sed -i '' "s/calculateSectionDecision('trends', /calculateSectionDecision(brandAssets, personas, 'trends', /g" "$FILE"
sed -i '' "s/calculateSectionDecision('knowledge', /calculateSectionDecision(brandAssets, personas, 'knowledge', /g" "$FILE"

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 3. GlobalSearchModal.tsx
#    - Needs useBrandAssets() + usePersonas() hooks
#    - Call globalSearch.setBrandAssets() / setPersonas() in useEffect
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 GlobalSearchModal.tsx"
FILE="src/components/GlobalSearchModal.tsx"

# Add context imports after first import line
if ! grep -q "useBrandAssets" "$FILE"; then
  sed -i '' "/^import React/a\\
import { useBrandAssets } from '../contexts/BrandAssetsContext';\\
import { usePersonas } from '../contexts/PersonasContext';
" "$FILE"
fi

# Add hooks + data sync after component function opening
# Find the line with useState for query
if ! grep -q "const { brandAssets }" "$FILE"; then
  sed -i '' "/const \[query, setQuery\]/i\\
\\  const { brandAssets } = useBrandAssets();\\
\\  const { personas } = usePersonas();\\
\\
\\  // Sync context data to search service\\
\\  React.useEffect(() => {\\
\\    globalSearch.setBrandAssets(brandAssets);\\
\\    globalSearch.setPersonas(personas);\\
\\  }, [brandAssets, personas]);\\
" "$FILE"
fi

echo "     ✓ Done"

# ─────────────────────────────────────────────────────────────────────────────
# 4. RelationshipsPage.tsx
#    - RelationshipService.getStats() is static → needs instance
#    - Add hooks, create instance, fix call
# ─────────────────────────────────────────────────────────────────────────────
echo "  📝 RelationshipsPage.tsx"
FILE="src/components/RelationshipsPage.tsx"

# Add context imports
if ! grep -q "useBrandAssets" "$FILE"; then
  sed -i '' "/import { RelationshipService }/a\\
import { useBrandAssets } from '../contexts/BrandAssetsContext';\\
import { usePersonas } from '../contexts/PersonasContext';
" "$FILE"
fi

# Add hooks after component function opening - find the useState line
if ! grep -q "const { brandAssets }" "$FILE"; then
  sed -i '' "/const \[selectedTab, setSelectedTab\]/i\\
\\  const { brandAssets } = useBrandAssets();\\
\\  const { personas } = usePersonas();\\
\\  const relationshipService = React.useMemo(() => new RelationshipService(brandAssets, personas), [brandAssets, personas]);
" "$FILE"
fi

# Fix the static call: RelationshipService.getStats() → relationshipService.getStats()
sed -i '' 's/RelationshipService\.getStats()/relationshipService.getStats()/g' "$FILE"

echo "     ✓ Done"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────
echo "=== Verification ==="
echo ""

echo "New TS error count:"
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

echo ""
echo "✅ Callers fixed!"
echo ""
echo "Commit:"
echo "  git add -A && git commit -m 'refactor: update callers — pass brandAssets/personas to parametric functions'"
