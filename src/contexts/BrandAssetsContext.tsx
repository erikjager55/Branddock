/**
 * Brand Assets Context
 *
 * Global state management for brand assets data.
 * Provides CRUD operations and asset-related queries.
 *
 * DATA SOURCE STRATEGIE:
 * 1. Als workspace beschikbaar is (via sessie of env fallback) → laad via API + adapter
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
import { useWorkspace } from "../hooks/use-workspace";

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
  error: Error | null;

  /** Re-fetch brand assets from the API */
  refetch: () => void;

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

export function BrandAssetsProvider({ children }: { children: ReactNode }) {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
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
  const [error, setError] = useState<Error | null>(null);

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

  // Fetch from API when workspace is available (resolved via session)
  useEffect(() => {
    if (wsLoading) return;

    if (!workspaceId) {
      logger.info("No workspace available, using mock data");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchBrandAssets()
      .then((response) => {
        if (cancelled) return;

        const mapped = apiAssetsToMockFormat(response.assets);
        logger.info(
          `Loaded ${mapped.length} brand assets from API (workspace: ${workspaceId})`
        );

        setBrandAssets(mapped);
        setDataSource("api");
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;

        logger.warn("API fetch failed, keeping current data:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
        // Blijft op mock/localStorage data
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, wsLoading]);

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

  // Refetch brand assets from the API
  const refetch = useCallback(() => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    fetchBrandAssets()
      .then((response) => {
        const mapped = apiAssetsToMockFormat(response.assets);
        setBrandAssets(mapped);
        setDataSource("api");
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, [workspaceId]);

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
        error,
        refetch,
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
