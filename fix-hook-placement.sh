#!/bin/bash
# Fix: verplaats useBrandAssets() hook van props-destructuring naar function body
set -e

echo "🔧 Fixing hook placement in 7 files..."
echo ""

fix_file() {
  local file="$1"
  echo "  📝 $file"

  # 1. Verwijder de fout-geplaatste regel
  sed -i '' '/^  const { brandAssets } = useBrandAssets();$/d' "$file"

  # 2. Zoek de eerste regel NA de props-closing `) {` of `}: ...Props) {`
  #    en voeg de hook daar in
  #    We zoeken het patroon: een regel die eindigt op `) {` of `}) {`
  #    NA de export function declaratie
  
  # Vind regelnummer van de function body opening
  local body_line
  body_line=$(awk '/^export function /{found=1} found && /\) \{/{print NR; exit}' "$file")

  if [ -n "$body_line" ]; then
    sed -i '' "${body_line}a\\
\\  const { brandAssets } = useBrandAssets();
" "$file"
    echo "     ✓ Hook moved to line $((body_line + 1))"
  else
    echo "     ⚠️  Could not find function body — FIX MANUALLY"
  fi
  echo ""
}

fix_file "src/components/canvases/InterviewWorkflowStep.tsx"
fix_file "src/components/canvases/QuestionnaireWorkflowStep.tsx"
fix_file "src/components/EnhancedSidebarSimple.tsx"
fix_file "src/components/ResearchDashboard.tsx"
fix_file "src/components/strategy-tools/campaign-output/StrategicReport.tsx"
fix_file "src/components/strategy-tools/CampaignStrategyGeneratorDetail.tsx"
fix_file "src/components/strategy-tools/UniversalStrategyGenerator.tsx"

echo "=== Verification ==="
errors=$(npx tsc --noEmit 2>&1 | grep "useBrandAssets" | wc -l | tr -d ' ')
echo "TypeScript errors mentioning useBrandAssets: $errors"
echo ""
echo "✅ Done! Run: npx tsc --noEmit"
