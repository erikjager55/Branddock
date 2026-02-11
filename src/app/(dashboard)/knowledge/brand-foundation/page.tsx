"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Search, Circle } from "lucide-react";
import { AssetCard } from "@/features/knowledge/brand-foundation/AssetCard";
import { CreateBrandAssetModal } from "@/features/knowledge/brand-foundation/CreateBrandAssetModal";
import { BrandAssetWithRelations } from "@/types/brand-asset";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/api/useAssets";
import { useDebounce } from "@/hooks/useDebounce";
import {
  UI_CATEGORIES,
  getBrandAssetTypeInfo,
} from "@/lib/constants/brand-assets";

type AssetWithCounts = BrandAssetWithRelations & {
  _count?: {
    newAiAnalyses: number;
    workshops: number;
    interviews: number;
    questionnaires: number;
  };
};

export default function BrandFoundationPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: apiData, isLoading } = useAssets({
    search: debouncedSearch || undefined,
  });

  const assets = (apiData?.data ?? []) as AssetWithCounts[];

  // Filter by UI category
  const filteredAssets = useMemo(() => {
    if (activeCategory === "All Categories") return assets;
    return assets.filter((asset) => {
      const info = getBrandAssetTypeInfo(asset);
      return info?.uiCategory === activeCategory;
    });
  }, [assets, activeCategory]);

  // Summary stats
  const stats = useMemo(() => {
    const validated = assets.filter(
      (a) => a.status === "VALIDATED" || a.status === "AI_ANALYSIS_COMPLETE"
    ).length;
    return {
      validated,
      needValidation: assets.length - validated,
      total: assets.length,
    };
  }, [assets]);

  return (
    <div className="max-w-[1200px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Circle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-text-dark">
                Your Brand
              </h1>
              <p className="text-sm text-text-dark/60">
                Define and manage your brand&apos;s strategic foundation
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Brand Asset
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5">
          <p className="text-3xl font-bold text-emerald-400">{stats.validated}</p>
          <p className="text-sm text-text-dark/60 mt-1">Ready to use</p>
        </div>
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5">
          <p className="text-3xl font-bold text-amber-400">{stats.needValidation}</p>
          <p className="text-sm text-text-dark/60 mt-1">Need validation</p>
        </div>
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5">
          <p className="text-3xl font-bold text-text-dark">{stats.total}</p>
          <p className="text-sm text-text-dark/60 mt-1">Total assets</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
          <Input
            type="text"
            placeholder="Search brand assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {UI_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={200} />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-8 h-8" />}
          title={
            activeCategory === "All Categories"
              ? "No assets yet"
              : `No ${activeCategory} assets yet`
          }
          description="Create your first brand asset to get started"
          action={
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Brand Asset
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Create Brand Asset Modal */}
      <CreateBrandAssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingAssets={assets}
      />
    </div>
  );
}
