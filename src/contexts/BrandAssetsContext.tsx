/**
 * Brand Assets Context
 *
 * Global state management for brand assets data.
 * Provides CRUD operations and asset-related queries.
 *
 * DATA SOURCE: API only — no mock data fallback.
 * Mock fallback caused "Asset not found" errors because mock IDs ('1'-'13')
 * did not match database CUIDs. Removed as of March 2026.
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
import { BrandAsset, SummaryStats } from "../types/brand-asset";
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

  /** API-computed summary stats (total, ready, needValidation, avgCoverage) */
  stats: SummaryStats | null;

  // Data source info
  dataSource: "api" | "loading";
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
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "loading">("loading");
  const [isLoading, setIsLoading] = useState(true);
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
      logger.info("No workspace available, showing empty state");
      setBrandAssets([]);
      setDataSource("loading");
      setIsLoading(false);
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
        setStats(response.stats);
        setDataSource("api");
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;

        logger.warn("Brand assets API fetch failed:", err);
        setBrandAssets([]);
        setStats(null);
        setDataSource("loading");
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, wsLoading]);

  // localStorage persistence removed — caused stale mock IDs
  // that did not match database IDs, leading to "asset not found" errors

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
        setStats(response.stats);
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
        stats,
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
 * Automatically generates a description of the change
 */
function generateChangeDescription(
  updates: Partial<BrandAsset>,
  changeType: ChangeType
): string {
  switch (changeType) {
    case "research-added":
      return "New research added";
    case "validation":
      return "Asset validated";
    case "status-change":
      return `Status changed to ${updates.status}`;
    case "content-update":
    default:
      if (updates.content) return "Content updated";
      if (updates.title) return "Title changed";
      return "Asset updated";
  }
}
