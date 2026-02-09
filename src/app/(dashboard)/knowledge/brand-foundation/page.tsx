"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Plus, Grid3x3, List, Search } from "lucide-react";
import { AssetCard } from "@/features/knowledge/brand-foundation/AssetCard";
import { NewAssetModal } from "@/features/knowledge/brand-foundation/NewAssetModal";
import {
  BrandAssetWithRelations,
  AssetType,
  AssetStatus,
  ListAssetsResponse,
} from "@/types/brand-asset";
import { cn } from "@/lib/utils";

export default function BrandFoundationPage() {
  const [assets, setAssets] = useState<BrandAssetWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock workspaceId - in production, get this from context/session
  const workspaceId = "mock-workspace-id";

  useEffect(() => {
    fetchAssets();
  }, [activeTab, searchQuery]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId,
        ...(activeTab !== "all" && { type: activeTab.toUpperCase() }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/brand-assets?${params}`);
      if (response.ok) {
        const data: ListAssetsResponse = await response.json();
        setAssets(data.assets);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (data: {
    name: string;
    description: string;
    type: AssetType;
    status: AssetStatus;
  }) => {
    try {
      const response = await fetch("/api/brand-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          workspaceId,
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchAssets();
      }
    } catch (error) {
      console.error("Error creating asset:", error);
    }
  };

  const tabs = [
    { label: "All", value: "all" },
    { label: "Logos", value: "logo" },
    { label: "Colors", value: "color" },
    { label: "Typography", value: "typography" },
    { label: "Messaging", value: "messaging" },
    { label: "Guidelines", value: "guideline" },
  ];

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-text-dark">
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
          Manage your brand's core visual and messaging assets
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Search */}
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

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-surface-dark border border-border-dark rounded-lg p-1">
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

      {/* Assets Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-dark/60 mt-4">Loading assets...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-text-dark/40" />
            </div>
            <h3 className="text-lg font-semibold text-text-dark mb-2">
              No assets yet
            </h3>
            <p className="text-text-dark/60 mb-4">
              Create your first brand asset to get started
            </p>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Asset
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        onSubmit={handleCreateAsset}
      />
    </div>
  );
}
