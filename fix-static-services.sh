#!/bin/bash
# Fix: services hebben static methods, dus properties moeten ook static zijn
set -e
echo "🔧 Fixing static services..."

# --- SmartSuggestionsService.ts ---
echo "  📝 SmartSuggestionsService.ts"
FILE="src/services/SmartSuggestionsService.ts"

# Remove the instance-based constructor we added
sed -i '' '/^  private brandAssets: BrandAsset\[\] = \[\];$/d' "$FILE"
sed -i '' '/^  private personas: Persona\[\] = \[\];$/d' "$FILE"
sed -i '' '/^  constructor(brandAssets: BrandAsset\[\] = \[\], personas: Persona\[\] = \[\]) {$/,/^  }$/d' "$FILE"
# Remove leftover blank lines from deletion
sed -i '' '/^$/N;/^\n$/d' "$FILE"

# Add static properties after class declaration
sed -i '' '/^export class SmartSuggestionsService {/a\
\  private static brandAssets: BrandAsset[] = [];\
\  private static personas: Persona[] = [];\
\
\  static setBrandAssets(assets: BrandAsset[]) { SmartSuggestionsService.brandAssets = assets; }\
\  static setPersonas(personas: Persona[]) { SmartSuggestionsService.personas = personas; }
' "$FILE"

# Fix this.brandAssets → SmartSuggestionsService.brandAssets
sed -i '' 's/this\.brandAssets/SmartSuggestionsService.brandAssets/g' "$FILE"
sed -i '' 's/this\.personas/SmartSuggestionsService.personas/g' "$FILE"

echo "     ✓ Done"

# --- RelationshipService.ts ---
echo "  📝 RelationshipService.ts"
FILE="src/services/RelationshipService.ts"

# Remove instance-based constructor
sed -i '' '/^  private brandAssets: BrandAsset\[\] = \[\];$/d' "$FILE"
sed -i '' '/^  private personas: Persona\[\] = \[\];$/d' "$FILE"
sed -i '' '/^  constructor(brandAssets: BrandAsset\[\] = \[\], personas: Persona\[\] = \[\]) {$/,/^  }$/d' "$FILE"
sed -i '' '/^$/N;/^\n$/d' "$FILE"

# Add static properties
sed -i '' '/^export class RelationshipService {/a\
\  private static brandAssets: BrandAsset[] = [];\
\  private static personas: Persona[] = [];\
\
\  static setBrandAssets(assets: BrandAsset[]) { RelationshipService.brandAssets = assets; }\
\  static setPersonas(personas: Persona[]) { RelationshipService.personas = personas; }
' "$FILE"

sed -i '' 's/this\.brandAssets/RelationshipService.brandAssets/g' "$FILE"
sed -i '' 's/this\.personas/RelationshipService.personas/g' "$FILE"

echo "     ✓ Done"

# --- Fix RelationshipsPage.tsx: revert to static call ---
echo "  📝 RelationshipsPage.tsx (revert to static)"
FILE="src/components/RelationshipsPage.tsx"

# Remove the useMemo instance creation line
sed -i '' '/const relationshipService = React.useMemo/d' "$FILE"

# Revert to static call
sed -i '' 's/relationshipService\.getStats()/RelationshipService.getStats()/g' "$FILE"

# Add useEffect to sync data to static service
if ! grep -q "RelationshipService.setBrandAssets" "$FILE"; then
  sed -i '' '/const { personas } = usePersonas();/a\
\
\  // Sync context data to static service\
\  React.useEffect(() => {\
\    RelationshipService.setBrandAssets(brandAssets);\
\    RelationshipService.setPersonas(personas);\
\  }, [brandAssets, personas]);
' "$FILE"
fi

echo "     ✓ Done"

# --- Fix CampaignStrategyGeneratorDetail: sync services ---
echo "  📝 CampaignStrategyGeneratorDetail.tsx (sync services)"
FILE="src/components/strategy-tools/CampaignStrategyGeneratorDetail.tsx"

if ! grep -q "SmartSuggestionsService.setBrandAssets" "$FILE"; then
  sed -i '' '/const { personas } = usePersonas();/a\
\
\  // Sync context data to static services\
\  React.useEffect(() => {\
\    SmartSuggestionsService.setBrandAssets(brandAssets);\
\    SmartSuggestionsService.setPersonas(personas);\
\    RelationshipService.setBrandAssets(brandAssets);\
\    RelationshipService.setPersonas(personas);\
\  }, [brandAssets, personas]);
' "$FILE"
fi

echo "     ✓ Done"
echo ""

echo "=== Verification ==="
# Count errors in these specific files
npx tsc --noEmit 2>&1 | grep -E "SmartSuggestion|RelationshipService" | grep -c "error TS" || echo "0"
echo " errors in services"

npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
echo " total errors"
