#!/bin/bash
# =============================================================
# setup-api-adapter.sh
# Installeert de adapter laag: mock → API migratie voor BrandAssets
# Draai vanuit ~/Projects/branddock-app/
# =============================================================

set -e

echo "📦 Stap 1: Adapter bestand aanmaken..."
mkdir -p src/lib/api

cat > src/lib/api/brand-asset-adapter.ts << 'ADAPTER_EOF'
/**
 * Brand Asset Adapter
 *
 * Maps API/database BrandAssetWithMeta format → mock BrandAsset format.
 * Zodat alle bestaande UI componenten (EnhancedAssetCardUnified,
 * calculateDecisionStatus, etc.) blijven werken zonder wijzigingen.
 *
 * Dit is een tijdelijke adapter. Op termijn (Optie B) worden de
 * componenten herschreven om direct met het DB-model te werken.
 */

import type { BrandAsset } from "@/types/brand-asset";
import type { BrandAssetWithMeta } from "@/types/brand-asset";

// DB status → mock status mapping
const STATUS_MAP: Record<string, string> = {
  DRAFT: "awaiting-research",
  IN_PROGRESS: "in-development",
  NEEDS_ATTENTION: "ready-to-validate",
  READY: "validated",
};

// DB category → UI category label
const CATEGORY_LABEL_MAP: Record<string, string> = {
  PURPOSE: "Purpose",
  COMMUNICATION: "Communication",
  STRATEGY: "Strategy",
  NARRATIVE: "Narrative",
  CORE: "Core",
  PERSONALITY: "Personality",
  FOUNDATION: "Foundation",
  CULTURE: "Culture",
};

/**
 * Convert a single BrandAssetWithMeta (API response) to the
 * mock BrandAsset format used by UI components.
 */
export function apiAssetToMockFormat(asset: BrandAssetWithMeta): BrandAsset {
  // Build researchMethods array from boolean flags
  const researchMethods: BrandAsset["researchMethods"] = [
    {
      type: "ai-exploration",
      status: asset.validationMethods.ai ? "completed" : "not-started",
      ...(asset.validationMethods.ai ? { completedAt: asset.updatedAt } : {}),
      metadata: {},
    },
    {
      type: "canvas-workshop",
      status: asset.validationMethods.workshop ? "completed" : "not-started",
      ...(asset.validationMethods.workshop
        ? { completedAt: asset.updatedAt }
        : {}),
      metadata: {},
    },
    {
      type: "interviews",
      status: asset.validationMethods.interview ? "completed" : "not-started",
      ...(asset.validationMethods.interview
        ? { completedAt: asset.updatedAt }
        : {}),
      metadata: {},
    },
    {
      type: "questionnaire",
      status: asset.validationMethods.questionnaire
        ? "completed"
        : "not-started",
      ...(asset.validationMethods.questionnaire
        ? { completedAt: asset.updatedAt }
        : {}),
      metadata: {},
    },
  ];

  return {
    id: asset.id,
    type: asset.name,
    title: asset.name,
    content: "",
    category: CATEGORY_LABEL_MAP[asset.category] ?? asset.category,
    lastUpdated: asset.updatedAt,
    status: STATUS_MAP[asset.status] ?? "awaiting-research",
    description: asset.description,
    isCritical: asset.status === "READY" || asset.coveragePercentage >= 70,
    researchMethods,
    researchCoverage: asset.coveragePercentage,
    artifactsGenerated: asset.artifactCount,
    artifactsValidated: asset.validatedCount,
  };
}

/**
 * Convert an array of BrandAssetWithMeta to mock BrandAsset[].
 */
export function apiAssetsToMockFormat(
  assets: BrandAssetWithMeta[]
): BrandAsset[] {
  return assets.map(apiAssetToMockFormat);
}
ADAPTER_EOF

echo "📄 Stap 2: BrandAssetsContext updaten..."
cat > src/contexts/BrandAssetsContext.tsx << 'CONTEXT_EOF'
/**
 * Brand Assets Context
 *
 * Global state management for brand assets data.
 * Provides CRUD operations and asset-related queries.
 *
 * DATA SOURCE STRATEGIE:
 * 1. Als NEXT_PUBLIC_WORKSPACE_ID is gezet → laad via API + adapter
 * 2. Anders → fallback naar mock data + localStorage
 *
 * Alle downstream componenten ontvangen het bestaande BrandAsset formaat.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { BrandAsset } from "../types/brand-asset";
import { mockBrandAssets } from "../data/mock-brand-assets";
import { saveToStorage, loadFromStorage, StorageKeys } from "../utils/storage";
import { logger } from "../utils/logger";
import { ChangeType } from "../types/change-impact";
import { fetchBrandAssets } from "../lib/api/brand-assets";
import { apiAssetsToMockFormat } from "../lib/api/brand-asset-adapter";

interface BrandAssetsContextType {
  brandAssets: BrandAsset[];
  setBrandAssets: (assets: BrandAsset[]) => void;
  getBrandAsset: (id: string) => BrandAsset | undefined;
  updateBrandAsset: (
    id: string,
    updates: Partial<BrandAsset>,
    changeType?: ChangeType,
    changeDescription?: string
  ) => void;
  addBrandAsset: (asset: BrandAsset) => void;
  removeBrandAsset: (id: string) => void;

  // Data source info
  dataSource: "api" | "mock";
  isLoading: boolean;

  // Change tracking callback - set by ChangeImpactContext
  setOnAssetChange: (
    callback: (
      asset: BrandAsset,
      previous: BrandAsset | undefined,
      changeType: ChangeType,
      description: string
    ) => void
  ) => void;
}

const BrandAssetsContext = createContext<BrandAssetsContextType | undefined>(
  undefined
);

const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID;

export function BrandAssetsProvider({ children }: { children: ReactNode }) {
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>(() => {
    // Start met mock data of localStorage; API data wordt async geladen
    const stored = loadFromStorage<BrandAsset[]>(StorageKeys.BRAND_ASSETS, []);
    if (stored.length === 0) {
      return mockBrandAssets;
    }
    return stored;
  });

  const [dataSource, setDataSource] = useState<"api" | "mock">("mock");
  const [isLoading, setIsLoading] = useState(false);

  // Change tracking callback
  const onAssetChangeRef = useRef<
    | ((
        asset: BrandAsset,
        previous: BrandAsset | undefined,
        changeType: ChangeType,
        description: string
      ) => void)
    | undefined
  >(undefined);

  // Fetch from API if workspaceId is configured
  useEffect(() => {
    if (!WORKSPACE_ID) {
      logger.info("No WORKSPACE_ID configured, using mock data");
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchBrandAssets(WORKSPACE_ID)
      .then((response) => {
        if (cancelled) return;

        const mapped = apiAssetsToMockFormat(response.assets);
        logger.info(
          `Loaded ${mapped.length} brand assets from API (workspace: ${WORKSPACE_ID})`
        );

        setBrandAssets(mapped);
        setDataSource("api");
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;

        logger.warn("API fetch failed, keeping current data:", error);
        setIsLoading(false);
        // Blijft op mock/localStorage data
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to localStorage (alleen als we op mock data draaien)
  useEffect(() => {
    if (dataSource === "mock" && brandAssets && brandAssets.length > 0) {
      saveToStorage(StorageKeys.BRAND_ASSETS, brandAssets);
      logger.debug(`Persisted ${brandAssets.length} brand assets`);
    }
  }, [brandAssets, dataSource]);

  const getBrandAsset = (id: string): BrandAsset | undefined => {
    return brandAssets.find((asset) => asset.id === id);
  };

  const setOnAssetChange = useCallback(
    (
      callback: (
        asset: BrandAsset,
        previous: BrandAsset | undefined,
        changeType: ChangeType,
        description: string
      ) => void
    ) => {
      onAssetChangeRef.current = callback;
    },
    []
  );

  const updateBrandAsset = useCallback(
    (
      id: string,
      updates: Partial<BrandAsset>,
      changeType: ChangeType = "content-update",
      changeDescription?: string
    ) => {
      const previousAsset = brandAssets.find((asset) => asset.id === id);

      setBrandAssets((prev) =>
        prev.map((asset) => {
          if (asset.id === id) {
            const updatedAsset = { ...asset, ...updates };

            if (onAssetChangeRef.current) {
              const description =
                changeDescription ||
                generateChangeDescription(updates, changeType);
              setTimeout(() => {
                onAssetChangeRef.current?.(
                  updatedAsset,
                  previousAsset,
                  changeType,
                  description
                );
              }, 0);
            }

            return updatedAsset;
          }
          return asset;
        })
      );
    },
    [brandAssets]
  );

  const addBrandAsset = useCallback((asset: BrandAsset) => {
    setBrandAssets((prev) => [...prev, asset]);
  }, []);

  const removeBrandAsset = useCallback((id: string) => {
    setBrandAssets((prev) => prev.filter((asset) => asset.id !== id));
  }, []);

  return (
    <BrandAssetsContext.Provider
      value={{
        brandAssets,
        setBrandAssets,
        getBrandAsset,
        updateBrandAsset,
        addBrandAsset,
        removeBrandAsset,
        dataSource,
        isLoading,
        setOnAssetChange,
      }}
    >
      {children}
    </BrandAssetsContext.Provider>
  );
}

export function useBrandAssets() {
  const context = useContext(BrandAssetsContext);
  if (context === undefined) {
    throw new Error("useBrandAssets must be used within a BrandAssetsProvider");
  }
  return context;
}

/**
 * Genereert automatisch een beschrijving van de wijziging
 */
function generateChangeDescription(
  updates: Partial<BrandAsset>,
  changeType: ChangeType
): string {
  switch (changeType) {
    case "research-added":
      return "Nieuw onderzoek toegevoegd";
    case "validation":
      return "Asset gevalideerd";
    case "status-change":
      return `Status gewijzigd naar ${updates.status}`;
    case "content-update":
    default:
      if (updates.content) return "Content geüpdatet";
      if (updates.title) return "Titel gewijzigd";
      return "Asset geüpdatet";
  }
}
CONTEXT_EOF

echo "📄 Stap 3: .env.local aanmaken met workspace ID..."
# Haal workspace ID op uit database
WSID=$(/opt/homebrew/opt/postgresql@17/bin/psql postgresql://erikjager:@localhost:5432/branddock -t -A -c "SELECT id FROM \"Workspace\" WHERE slug = 'branddock-demo' LIMIT 1;" 2>/dev/null)

if [ -n "$WSID" ]; then
  # Voeg toe aan .env.local (of maak het aan)
  if [ -f .env.local ]; then
    # Verwijder bestaande NEXT_PUBLIC_WORKSPACE_ID als die er is
    grep -v "NEXT_PUBLIC_WORKSPACE_ID" .env.local > .env.local.tmp 2>/dev/null || true
    mv .env.local.tmp .env.local
  fi
  echo "NEXT_PUBLIC_WORKSPACE_ID=${WSID}" >> .env.local
  echo "✅ .env.local bijgewerkt met NEXT_PUBLIC_WORKSPACE_ID=${WSID}"
else
  echo "⚠️  Kon workspace ID niet ophalen uit database."
  echo "   Voeg handmatig toe aan .env.local:"
  echo '   NEXT_PUBLIC_WORKSPACE_ID=<jouw workspace id>'
fi

echo ""
echo "✅ Adapter geïnstalleerd:"
echo "   src/lib/api/brand-asset-adapter.ts  ← API → mock format mapper"
echo "   src/contexts/BrandAssetsContext.tsx  ← Bijgewerkt: API first, mock fallback"
echo "   .env.local                          ← NEXT_PUBLIC_WORKSPACE_ID"
echo ""
echo "🔄 Herstart de dev server om .env.local op te pikken:"
echo "   Ctrl+C in de dev server terminal, dan: npm run dev"
echo ""
echo "📊 Hoe het werkt:"
echo "   NEXT_PUBLIC_WORKSPACE_ID gezet → data komt uit PostgreSQL via API"
echo "   NEXT_PUBLIC_WORKSPACE_ID leeg  → fallback naar mock data"
echo "   API faalt                      → fallback naar mock data"
