#!/bin/bash
# =============================================================================
# Refactor: mockBrandAssets + mockPersonas in utils/services/hooks
#
# Strategie per categorie:
# - Utils: functies krijgen brandAssets + personas als parameters
# - Services (classes): constructor injection
# - Hooks: interne useBrandAssets()/usePersonas() hooks
#
# USAGE: cd ~/Projects/branddock-app && bash refactor-utils-services.sh
# =============================================================================

set -e
echo "🔧 Starting utils/services/hooks refactor..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. UTILS — Replace mock imports, add parameters
# ─────────────────────────────────────────────────────────────────────────────

echo "=== Utils ==="

# --- campaign-decision-gate.ts ---
echo "  📝 src/utils/campaign-decision-gate.ts"

# Remove mock imports
sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/utils/campaign-decision-gate.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/utils/campaign-decision-gate.ts

# Add BrandAsset + Persona type imports if not present
if ! grep -q "import { BrandAsset }" src/utils/campaign-decision-gate.ts && ! grep -q "import.*BrandAsset.*from" src/utils/campaign-decision-gate.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/utils/campaign-decision-gate.ts
fi

# Update function signature: add brandAssets + personas params
sed -i '' 's/export function calculateDecisionGate(/export function calculateDecisionGate(\n  brandAssets: BrandAsset[],\n  personas: Persona[],/' src/utils/campaign-decision-gate.ts

# Replace mockBrandAssets/mockPersonas usage
sed -i '' 's/mockBrandAssets/brandAssets/g' src/utils/campaign-decision-gate.ts
sed -i '' 's/mockPersonas/personas/g' src/utils/campaign-decision-gate.ts

echo "     ✓ Done"

# --- campaign-decision-calculator.ts ---
echo "  📝 src/utils/campaign-decision-calculator.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/utils/campaign-decision-calculator.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/utils/campaign-decision-calculator.ts

if ! grep -q "import.*BrandAsset.*from" src/utils/campaign-decision-calculator.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/utils/campaign-decision-calculator.ts
fi

# calculateCampaignDecision
sed -i '' 's/export function calculateCampaignDecision(/export function calculateCampaignDecision(\n  brandAssets: BrandAsset[],\n  personas: Persona[],/' src/utils/campaign-decision-calculator.ts

# calculateSectionDecision
sed -i '' 's/export function calculateSectionDecision(/export function calculateSectionDecision(\n  brandAssets: BrandAsset[],\n  personas: Persona[],/' src/utils/campaign-decision-calculator.ts

sed -i '' 's/mockBrandAssets/brandAssets/g' src/utils/campaign-decision-calculator.ts
sed -i '' 's/mockPersonas/personas/g' src/utils/campaign-decision-calculator.ts

echo "     ✓ Done"

# --- campaign-decision-calculator-v2.ts ---
echo "  📝 src/utils/campaign-decision-calculator-v2.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/utils/campaign-decision-calculator-v2.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/utils/campaign-decision-calculator-v2.ts

if ! grep -q "import.*BrandAsset.*from" src/utils/campaign-decision-calculator-v2.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/utils/campaign-decision-calculator-v2.ts
fi

sed -i '' 's/export function calculateCampaignDecision(/export function calculateCampaignDecision(\n  brandAssets: BrandAsset[],\n  personas: Persona[],/' src/utils/campaign-decision-calculator-v2.ts

sed -i '' 's/export function calculateSectionDecision(/export function calculateSectionDecision(\n  brandAssets: BrandAsset[],\n  personas: Persona[],/' src/utils/campaign-decision-calculator-v2.ts

sed -i '' 's/mockBrandAssets/brandAssets/g' src/utils/campaign-decision-calculator-v2.ts
sed -i '' 's/mockPersonas/personas/g' src/utils/campaign-decision-calculator-v2.ts

echo "     ✓ Done"

# --- platform-decision-aggregator.ts ---
echo "  📝 src/utils/platform-decision-aggregator.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/utils/platform-decision-aggregator.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/utils/platform-decision-aggregator.ts

if ! grep -q "import.*BrandAsset.*from" src/utils/platform-decision-aggregator.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/utils/platform-decision-aggregator.ts
fi

# All 6 exported functions need brandAssets + personas params
sed -i '' 's/export function calculateDashboardDecision():/export function calculateDashboardDecision(brandAssets: BrandAsset[], personas: Persona[]):/' src/utils/platform-decision-aggregator.ts
sed -i '' 's/export function calculateResearchHubDecision():/export function calculateResearchHubDecision(brandAssets: BrandAsset[], personas: Persona[]):/' src/utils/platform-decision-aggregator.ts
sed -i '' 's/export function calculateAssetDetailDecision(assetId: string):/export function calculateAssetDetailDecision(brandAssets: BrandAsset[], personas: Persona[], assetId: string):/' src/utils/platform-decision-aggregator.ts
sed -i '' 's/export function calculatePersonaDetailDecision(personaId: string):/export function calculatePersonaDetailDecision(brandAssets: BrandAsset[], personas: Persona[], personaId: string):/' src/utils/platform-decision-aggregator.ts
sed -i '' 's/export function calculateRelationshipsDecision():/export function calculateRelationshipsDecision(brandAssets: BrandAsset[], personas: Persona[]):/' src/utils/platform-decision-aggregator.ts

# calculateCampaignOutputDecision already has params, add brandAssets + personas before them
sed -i '' '/export function calculateCampaignOutputDecision(/,/)/ {
  s/export function calculateCampaignOutputDecision(/export function calculateCampaignOutputDecision(\n  brandAssets: BrandAsset[],\n  personas: Persona[],/
}' src/utils/platform-decision-aggregator.ts

# Fix internal calls: calculateDashboardDecision() → calculateDashboardDecision(brandAssets, personas)
sed -i '' 's/calculateDashboardDecision()/calculateDashboardDecision(brandAssets, personas)/g' src/utils/platform-decision-aggregator.ts

sed -i '' 's/mockBrandAssets/brandAssets/g' src/utils/platform-decision-aggregator.ts
sed -i '' 's/mockPersonas/personas/g' src/utils/platform-decision-aggregator.ts

echo "     ✓ Done"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 2. SERVICES — Constructor injection
# ─────────────────────────────────────────────────────────────────────────────

echo "=== Services ==="

# --- GlobalSearchService.ts ---
echo "  📝 src/services/GlobalSearchService.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/services/GlobalSearchService.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/services/GlobalSearchService.ts

if ! grep -q "import.*BrandAsset.*from" src/services/GlobalSearchService.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/services/GlobalSearchService.ts
fi

# Add private fields and constructor after class declaration
sed -i '' '/^class GlobalSearchService {/a\
\  private brandAssets: BrandAsset[] = [];\
\  private personas: Persona[] = [];\
\
\  setBrandAssets(assets: BrandAsset[]) { this.brandAssets = assets; }\
\  setPersonas(personas: Persona[]) { this.personas = personas; }
' src/services/GlobalSearchService.ts

sed -i '' 's/mockBrandAssets/this.brandAssets/g' src/services/GlobalSearchService.ts
sed -i '' 's/mockPersonas/this.personas/g' src/services/GlobalSearchService.ts

echo "     ✓ Done"

# --- SmartSuggestionsService.ts ---
echo "  📝 src/services/SmartSuggestionsService.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/services/SmartSuggestionsService.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/services/SmartSuggestionsService.ts

if ! grep -q "import.*BrandAsset.*from" src/services/SmartSuggestionsService.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/services/SmartSuggestionsService.ts
fi

sed -i '' '/^export class SmartSuggestionsService {/a\
\  private brandAssets: BrandAsset[] = [];\
\  private personas: Persona[] = [];\
\
\  constructor(brandAssets: BrandAsset[] = [], personas: Persona[] = []) {\
\    this.brandAssets = brandAssets;\
\    this.personas = personas;\
\  }
' src/services/SmartSuggestionsService.ts

sed -i '' 's/mockBrandAssets/this.brandAssets/g' src/services/SmartSuggestionsService.ts
sed -i '' 's/mockPersonas/this.personas/g' src/services/SmartSuggestionsService.ts

echo "     ✓ Done"

# --- RelationshipService.ts ---
echo "  📝 src/services/RelationshipService.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/services/RelationshipService.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/services/RelationshipService.ts

if ! grep -q "import.*BrandAsset.*from" src/services/RelationshipService.ts; then
  sed -i '' "1s/^/import { BrandAsset } from '..\/types\/brand-asset';\nimport { Persona } from '..\/types\/persona';\n/" src/services/RelationshipService.ts
fi

sed -i '' '/^export class RelationshipService {/a\
\  private brandAssets: BrandAsset[] = [];\
\  private personas: Persona[] = [];\
\
\  constructor(brandAssets: BrandAsset[] = [], personas: Persona[] = []) {\
\    this.brandAssets = brandAssets;\
\    this.personas = personas;\
\  }
' src/services/RelationshipService.ts

sed -i '' 's/mockBrandAssets/this.brandAssets/g' src/services/RelationshipService.ts
sed -i '' 's/mockPersonas/this.personas/g' src/services/RelationshipService.ts

echo "     ✓ Done"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 3. HOOKS — Use context hooks internally
# ─────────────────────────────────────────────────────────────────────────────

echo "=== Hooks ==="

# --- useBreadcrumbs.ts ---
echo "  📝 src/hooks/useBreadcrumbs.ts"

sed -i '' "/import { mockBrandAssets } from '..\/data\/mock-brand-assets';/d" src/hooks/useBreadcrumbs.ts
sed -i '' "/import { mockPersonas } from '..\/data\/mock-personas';/d" src/hooks/useBreadcrumbs.ts

# Add context imports
if ! grep -q "useBrandAssets" src/hooks/useBreadcrumbs.ts; then
  sed -i '' "1s/^/import { useBrandAssets } from '..\/contexts\/BrandAssetsContext';\nimport { usePersonas } from '..\/contexts\/PersonasContext';\n/" src/hooks/useBreadcrumbs.ts
fi

# Insert hook calls after function opening
# Find the line with "export function useBreadcrumbs("
line_num=$(grep -n "export function useBreadcrumbs(" src/hooks/useBreadcrumbs.ts | head -1 | cut -d: -f1)
if [ -n "$line_num" ]; then
  # Find the opening brace of the function body
  body_line=$(awk "NR>=$line_num && /\{/{print NR; exit}" src/hooks/useBreadcrumbs.ts)
  if [ -n "$body_line" ]; then
    sed -i '' "${body_line}a\\
\\  const { brandAssets } = useBrandAssets();\\
\\  const { personas } = usePersonas();
" src/hooks/useBreadcrumbs.ts
    echo "     ✓ Inserted context hooks"
  fi
fi

sed -i '' 's/mockBrandAssets/brandAssets/g' src/hooks/useBreadcrumbs.ts
sed -i '' 's/mockPersonas/personas/g' src/hooks/useBreadcrumbs.ts

echo "     ✓ Done"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

echo "=== Verification ==="

remaining_ba=$(grep -rn "mockBrandAssets" src/utils/ src/services/ src/hooks/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
remaining_p=$(grep -rn "mockPersonas" src/utils/ src/services/ src/hooks/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

echo "Remaining mockBrandAssets in utils/services/hooks: $remaining_ba"
echo "Remaining mockPersonas in utils/services/hooks: $remaining_p"

if [ "$remaining_ba" -gt 0 ] || [ "$remaining_p" -gt 0 ]; then
  echo ""
  echo "⚠️  Still referencing mocks:"
  grep -rn "mockBrandAssets\|mockPersonas" src/utils/ src/services/ src/hooks/ --include="*.ts" 2>/dev/null
fi

echo ""
echo "✅ Refactor complete!"
echo ""
echo "NEXT STEPS:"
echo "  1. Run: npx tsc --noEmit 2>&1 | head -40"
echo "  2. Fix any callers of these functions that need to pass brandAssets/personas"
echo "  3. git add -A && git commit -m 'refactor: utils/services/hooks — mock imports → parameters/context'"
echo ""
echo "CALLERS TO UPDATE (pass brandAssets, personas as first args):"
echo "  grep -rn 'calculateDecisionGate\|calculateCampaignDecision\|calculateSectionDecision' src/components/ --include='*.tsx'"
echo "  grep -rn 'calculateDashboardDecision\|calculateResearchHubDecision\|calculateAssetDetailDecision' src/components/ --include='*.tsx'"
echo "  grep -rn 'SmartSuggestionsService\|RelationshipService\|globalSearch' src/components/ --include='*.tsx'"
