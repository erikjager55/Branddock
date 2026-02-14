#!/bin/bash
# =============================================================
# Branddock — Fix BrandAsset errors (deel 2)
#
# Fixes:
#   1. Voeg ontbrekende optionele velden toe aan BrandAsset interface
#   2. Export ResearchItem uit decision-status-calculator.ts + voeg 'locked' toe
#   3. Voeg BrandAssetOption toe aan types/brand-asset.ts
# =============================================================

set -e
echo "🔧 Branddock — BrandAsset fix deel 2"
echo "==================================="

# ----- STAP 1: Voeg ontbrekende velden toe aan BrandAsset -----
echo ""
echo "📝 Stap 1: Ontbrekende optionele velden toevoegen aan BrandAsset..."

# Voeg validatedAt, contentSections, version toe vóór de sluitende }
sed -i '' '/^export interface BrandAsset {/,/^}/ {
  /^}/ i\
\  validatedAt?: string;\
\  contentSections?: { title: string; content: string; completed: boolean }[];\
\  version?: string;
}' src/types/brand-asset.ts

echo "   ✅ validatedAt, contentSections, version toegevoegd aan BrandAsset"

# ----- STAP 2: Voeg BrandAssetOption toe aan types -----
echo ""
echo "📝 Stap 2: BrandAssetOption toevoegen aan types/brand-asset.ts..."

cat >> src/types/brand-asset.ts << 'EOF'

// --- BrandAssetOption (gebruikt in BrandAssetsViewSimple) ---
export interface BrandAssetOption {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
}
EOF

echo "   ✅ BrandAssetOption toegevoegd"

# ----- STAP 3: Fix ResearchItem in decision-status-calculator.ts -----
echo ""
echo "📝 Stap 3: ResearchItem exporteren + 'locked' status toevoegen..."

# Voeg 'locked' toe aan de lokale ResearchMethod status
sed -i '' "s/status: 'not-started' | 'in-progress' | 'completed';/status: 'not-started' | 'in-progress' | 'completed' | 'locked';/" src/utils/decision-status-calculator.ts

# Export de interfaces
sed -i '' 's/^interface ResearchMethod {/export interface ResearchMethod {/' src/utils/decision-status-calculator.ts
sed -i '' 's/^interface ResearchItem {/export interface ResearchItem {/' src/utils/decision-status-calculator.ts

echo "   ✅ ResearchItem + ResearchMethod geëxporteerd met 'locked' status"

# ----- STAP 4: Verificatie -----
echo ""
echo "==================================="
echo "🔍 Verificatie — BrandAsset errors checken..."
echo ""

BRAND_ERRORS=$(npx tsc --noEmit 2>&1 | grep "BrandAsset\|ResearchItem" | wc -l | tr -d ' ')
echo "   BrandAsset/ResearchItem errors: $BRAND_ERRORS"

if [ "$BRAND_ERRORS" -eq "0" ]; then
  echo "   ✅ Alle BrandAsset/ResearchItem errors opgelost!"
else
  echo "   ⚠️  Er zijn nog $BRAND_ERRORS errors over. Details:"
  npx tsc --noEmit 2>&1 | grep "BrandAsset\|ResearchItem"
fi

echo ""
echo "📊 Totaal TypeScript errors:"
TOTAL=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
echo "   Totaal: $TOTAL errors (was 738)"
echo ""
echo "✅ Fix script deel 2 klaar. Commit:"
echo "   git add -A && git commit -m 'fix: complete BrandAsset type + export ResearchItem'"
