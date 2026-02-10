"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Grid3x3, List, Search } from "lucide-react";
import { AssetCard } from "@/features/knowledge/brand-foundation/AssetCard";
import { NewAssetModal } from "@/features/knowledge/brand-foundation/NewAssetModal";
import { BrandAssetWithRelations } from "@/types/brand-asset";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/api/useAssets";
import { useDebounce } from "@/hooks/useDebounce";

export default function BrandFoundationPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: apiData, isLoading } = useAssets({
    type: activeTab !== "all" ? activeTab.toUpperCase() : undefined,
    search: debouncedSearch || undefined,
  });

  const assets = apiData?.data ?? [];

  const tabs = [
    { label: "All", value: "all" },
    { label: "Mission", value: "mission" },
    { label: "Vision", value: "vision" },
    { label: "Values", value: "values" },
    { label: "Positioning", value: "positioning" },
    { label: "Promise", value: "promise" },
    { label: "Story", value: "story" },
  ];

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Brand Foundation
          </h1>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Asset
          </Button>
        </div>
        <p className="text-text-dark/60">
          Define and manage your brand's strategic foundation — mission, vision,
          values, positioning, promise, and story
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-dark border border-border-dark rounded-xl p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "text-text-dark/60 hover:text-text-dark"
            )}
            aria-label="Grid view"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === "list"
                ? "bg-primary text-white"
                : "text-text-dark/60 hover:text-text-dark"
            )}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={200} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-8 h-8" />}
          title={activeTab === "all" ? "No assets yet" : `No ${activeTab} assets yet`}
          description={
            activeTab === "all"
              ? "Create your first brand asset to get started"
              : `Create your first ${activeTab} asset to define this part of your brand foundation`
          }
          action={
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Asset
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} view="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} view="list" />
          ))}
        </div>
      )}

      {/* New Asset Modal */}
      <NewAssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId=""
      />
    </div>
  );
}
