#!/bin/bash
# =============================================================
# Branddock — Fix BrandAsset type (urgent blokkeerder #1)
# 
# Probleem: BrandAsset interface ontbreekt in src/types/brand-asset.ts
#           7+ bestanden importeren dit type → TypeScript errors
#
# Fix: 
#   1. Voeg BrandAsset + gerelateerde types toe aan brand-asset.ts
#   2. Fix import in App.tsx (→ types/brand-asset ipv data/mock-brand-assets)
#   3. Fix import in ShareableBrandReport.tsx (zelfde probleem)
# =============================================================

set -e
echo "🔧 Branddock — BrandAsset type fix"
echo "==================================="

# ----- STAP 1: Voeg BrandAsset interface toe aan src/types/brand-asset.ts -----
echo ""
echo "📝 Stap 1: BrandAsset interface toevoegen aan src/types/brand-asset.ts..."

# Voeg de types toe NA de bestaande AssetStatus export (regel 7)
# We voegen toe na de AssetStatus type definitie
sed -i '' '/^export type AssetStatus/a\
\
// --- Research method types (gebruikt door mock data) ---\
export type ResearchMethodType =\
  | "ai-exploration"\
  | "canvas-workshop"\
  | "interviews"\
  | "questionnaire"\
  | "survey"\
  | "focus-group"\
  | "desk-research";\
\
export type ResearchMethodStatus = "completed" | "in-progress" | "locked" | "not-started";\
\
export interface ResearchMethod {\
  type: ResearchMethodType;\
  status: ResearchMethodStatus;\
  completedAt?: string;\
  metadata?: Record<string, unknown>;\
}\
\
// --- Core BrandAsset type (bron: mock-brand-assets.ts) ---\
export interface BrandAsset {\
  id: string;\
  type: string;\
  title: string;\
  content: string;\
  category: string;\
  lastUpdated: string;\
  status: string;\
  description: string;\
  isCritical?: boolean;\
  priority?: string;\
  researchMethods: ResearchMethod[];\
  researchCoverage: number;\
  artifactsGenerated: number;\
  artifactsValidated: number;\
}
' src/types/brand-asset.ts

echo "   ✅ BrandAsset, ResearchMethod, en gerelateerde types toegevoegd"

# ----- STAP 2: Fix import in App.tsx -----
echo ""
echo "📝 Stap 2: Import in App.tsx fixen..."

# Vervang de broken import: data/mock-brand-assets → types/brand-asset
sed -i '' "s|import { BrandAsset } from './data/mock-brand-assets';|import { BrandAsset } from './types/brand-asset';|" src/App.tsx

echo "   ✅ App.tsx import gefixt → './types/brand-asset'"

# ----- STAP 3: Fix import in ShareableBrandReport.tsx -----
echo ""
echo "📝 Stap 3: Import in ShareableBrandReport.tsx fixen..."

sed -i '' "s|import { BrandAsset } from '../../data/mock-brand-assets';|import { BrandAsset } from '../../types/brand-asset';|" src/components/stakeholder/ShareableBrandReport.tsx 2>/dev/null || echo "   ⚠️  ShareableBrandReport.tsx niet gevonden of import anders — handmatig checken"

echo "   ✅ ShareableBrandReport.tsx import gefixt"

# ----- STAP 4: Verificatie -----
echo ""
echo "==================================="
echo "🔍 Verificatie — BrandAsset errors checken..."
echo ""

ERRORS=$(npx tsc --noEmit 2>&1 | grep "BrandAsset" | wc -l | tr -d ' ')
echo "   BrandAsset-gerelateerde TypeScript errors: $ERRORS"

if [ "$ERRORS" -eq "0" ]; then
  echo "   ✅ Alle BrandAsset errors opgelost!"
else
  echo "   ⚠️  Er zijn nog $ERRORS BrandAsset errors over. Details:"
  npx tsc --noEmit 2>&1 | grep "BrandAsset"
fi

echo ""
echo "==================================="
echo "📊 Totaal TypeScript errors (ter referentie):"
TOTAL=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
echo "   Totaal: $TOTAL errors"
echo ""
echo "✅ Fix script klaar. Vergeet niet te committen:"
echo "   git add -A && git commit -m 'fix: add BrandAsset type export + fix imports'"
