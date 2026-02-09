"use client";

import { useState, useEffect, useMemo } from "react";
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

// Placeholder data for when no API data is available
const placeholderAssets: BrandAssetWithRelations[] = [
  {
    id: "placeholder-mission",
    name: "Mission Statement",
    description:
      "Our mission is to empower brands with intelligent tools that bridge the gap between strategy and execution.",
    type: "MISSION" as AssetType,
    status: "ACTIVE" as AssetStatus,
    content: {
      statement:
        "To empower brands with intelligent tools that bridge the gap between strategy and execution, making professional brand management accessible to every team.",
      purpose: "Democratize brand strategy",
      impact: "10,000+ brands managed",
    },
    fileUrl: null,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-02-01"),
    workspaceId: "placeholder-ws",
    createdBy: "placeholder-user",
    lockedById: null,
    workspace: { id: "placeholder-ws", name: "My Workspace" },
    creator: { id: "placeholder-user", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "placeholder-vision",
    name: "Brand Vision",
    description:
      "Our vision for the future of brand management and where we see the industry heading.",
    type: "VISION" as AssetType,
    status: "ACTIVE" as AssetStatus,
    content: {
      statement:
        "A world where every brand, from startups to enterprises, has access to the strategic tools and insights that were once reserved for top agencies.",
      timeframe: "2030",
      aspirations: [
        "Global brand platform",
        "AI-powered insights",
        "Real-time brand health monitoring",
      ],
    },
    fileUrl: null,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-01-28"),
    workspaceId: "placeholder-ws",
    createdBy: "placeholder-user",
    lockedById: null,
    workspace: { id: "placeholder-ws", name: "My Workspace" },
    creator: { id: "placeholder-user", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "placeholder-values",
    name: "Core Values",
    description:
      "The fundamental beliefs and principles that guide our brand and team decisions.",
    type: "VALUES" as AssetType,
    status: "DRAFT" as AssetStatus,
    content: {
      values: [
        { name: "Innovation", description: "We push boundaries and embrace new ideas" },
        { name: "Transparency", description: "We are open and honest in everything we do" },
        { name: "Empowerment", description: "We give teams the tools to succeed independently" },
      ],
    },
    fileUrl: null,
    createdAt: new Date("2025-01-20"),
    updatedAt: new Date("2025-02-05"),
    workspaceId: "placeholder-ws",
    createdBy: "placeholder-user",
    lockedById: null,
    workspace: { id: "placeholder-ws", name: "My Workspace" },
    creator: { id: "placeholder-user", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "placeholder-positioning",
    name: "Brand Positioning",
    description:
      "How we position ourselves in the market relative to competitors and customer needs.",
    type: "POSITIONING" as AssetType,
    status: "ACTIVE" as AssetStatus,
    content: {
      statement:
        "For modern marketing teams who need to maintain brand consistency at scale, Branddock is the AI-powered brand platform that turns strategy into action.",
      targetAudience: "Marketing teams at mid-size to enterprise companies",
      differentiator: "AI-powered strategy-to-content pipeline",
      category: "Brand Management Platform",
    },
    fileUrl: null,
    createdAt: new Date("2025-01-18"),
    updatedAt: new Date("2025-01-30"),
    workspaceId: "placeholder-ws",
    createdBy: "placeholder-user",
    lockedById: null,
    workspace: { id: "placeholder-ws", name: "My Workspace" },
    creator: { id: "placeholder-user", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "placeholder-promise",
    name: "Brand Promise",
    description:
      "The commitment we make to our customers about the value and experience they can expect.",
    type: "PROMISE" as AssetType,
    status: "DRAFT" as AssetStatus,
    content: {
      statement:
        "We promise to make brand management intuitive, data-driven, and accessible — so your team can focus on creativity, not process.",
      proof_points: [
        "50% faster campaign launches",
        "99.9% brand consistency score",
        "24/7 AI-powered brand guardian",
      ],
    },
    fileUrl: null,
    createdAt: new Date("2025-01-22"),
    updatedAt: new Date("2025-02-03"),
    workspaceId: "placeholder-ws",
    createdBy: "placeholder-user",
    lockedById: null,
    workspace: { id: "placeholder-ws", name: "My Workspace" },
    creator: { id: "placeholder-user", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "placeholder-story",
    name: "Brand Story",
    description:
      "The narrative that communicates who we are, where we came from, and where we're going.",
    type: "STORY" as AssetType,
    status: "LOCKED" as AssetStatus,
    content: {
      narrative:
        "Born from the frustration of managing brand assets across dozens of tools and spreadsheets, Branddock was created by a team of brand strategists and engineers who believed there had to be a better way. What started as an internal tool at a creative agency has evolved into a platform used by thousands of brands worldwide.",
      origin: "Founded in 2024 by former agency strategists",
    },
    fileUrl: null,
    createdAt: new Date("2025-01-10"),
    updatedAt: new Date("2025-01-25"),
    workspaceId: "placeholder-ws",
    createdBy: "placeholder-user",
    lockedById: "placeholder-user",
    workspace: { id: "placeholder-ws", name: "My Workspace" },
    creator: { id: "placeholder-user", name: "Brand Manager", email: "manager@example.com" },
  },
];

export default function BrandFoundationPage() {
  const [apiAssets, setApiAssets] = useState<BrandAssetWithRelations[] | null>(null);
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
        setApiAssets(data.assets.length > 0 ? data.assets : null);
      }
    } catch {
      // API unavailable — will use placeholder data
      setApiAssets(null);
    } finally {
      setLoading(false);
    }
  };

  // Use API data if available, otherwise fall back to placeholders
  const assets = useMemo(() => {
    const source = apiAssets ?? placeholderAssets;
    let filtered = source;

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter(
        (a) => a.type === activeTab.toUpperCase()
      );
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [apiAssets, activeTab, searchQuery]);

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
          Define and manage your brand's strategic foundation — mission, vision,
          values, positioning, promise, and story
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
              {activeTab === "all"
                ? "No assets yet"
                : `No ${activeTab} assets yet`}
            </h3>
            <p className="text-text-dark/60 mb-4">
              {activeTab === "all"
                ? "Create your first brand asset to get started"
                : `Create your first ${activeTab} asset to define this part of your brand foundation`}
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
