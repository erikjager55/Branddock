"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Search, Check } from "lucide-react";
import { useCreateAsset } from "@/hooks/api/useAssets";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BRAND_ASSET_TYPES,
  BrandAssetTypeKey,
  UI_CATEGORIES,
} from "@/lib/constants/brand-assets";
import { BrandAssetWithRelations } from "@/types/brand-asset";

interface CreateBrandAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAssets?: BrandAssetWithRelations[];
}

const CATEGORY_FILTERS = UI_CATEGORIES.filter((c) => c !== "All Categories");

export function CreateBrandAssetModal({
  isOpen,
  onClose,
  existingAssets = [],
}: CreateBrandAssetModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<BrandAssetTypeKey | null>(null);

  const createAsset = useCreateAsset();
  const toast = useToast();
  const router = useRouter();

  // Check which assets already exist (by name match)
  const existingNames = useMemo(
    () => new Set(existingAssets.map((a) => a.name.toLowerCase())),
    [existingAssets]
  );

  // Filter asset types
  const filteredTypes = useMemo(() => {
    return Object.entries(BRAND_ASSET_TYPES).filter(([, info]) => {
      const matchesSearch =
        !search ||
        info.name.toLowerCase().includes(search.toLowerCase()) ||
        info.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !activeCategory || info.uiCategory === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const handleCreate = () => {
    if (!selectedKey) return;
    const info = BRAND_ASSET_TYPES[selectedKey];

    createAsset.mutate(
      {
        name: info.name,
        description: info.description,
        type: info.dbType,
        status: "DRAFT",
        content: { assetTypeKey: selectedKey },
        workspaceId: "",
      },
      {
        onSuccess: (data) => {
          toast.success("Asset created", `${info.name} has been created.`);
          onClose();
          setSelectedKey(null);
          setSearch("");
          setActiveCategory(null);
          if (data && typeof data === "object" && "id" in data) {
            router.push(
              `/knowledge/brand-foundation/${(data as { id: string }).id}`
            );
          }
        },
        onError: () => {
          toast.error("Failed to create asset", "Please try again.");
        },
      }
    );
  };

  const handleClose = () => {
    onClose();
    setSelectedKey(null);
    setSearch("");
    setActiveCategory(null);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Create Brand Asset"
      description="Select the type of brand asset you want to create"
      size="lg"
      footer={
        <>
          {selectedKey && (
            <span className="mr-auto text-sm text-text-dark/60">
              Selected: {BRAND_ASSET_TYPES[selectedKey].name}
            </span>
          )}
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!selectedKey || createAsset.isPending}
          >
            {createAsset.isPending ? "Creating..." : "Continue"}
          </Button>
        </>
      }
    >
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
        <Input
          type="text"
          placeholder="Search asset types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-3 py-1 text-xs rounded-full border transition-colors",
            !activeCategory
              ? "bg-primary text-white border-primary"
              : "bg-surface-dark text-text-dark/60 border-border-dark hover:border-text-dark/30"
          )}
        >
          All
        </button>
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setActiveCategory(activeCategory === cat ? null : cat)
            }
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-colors",
              activeCategory === cat
                ? "bg-primary text-white border-primary"
                : "bg-surface-dark text-text-dark/60 border-border-dark hover:border-text-dark/30"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Asset type grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
        {filteredTypes.map(([key, info]) => {
          const assetKey = key as BrandAssetTypeKey;
          const isSelected = selectedKey === assetKey;
          const alreadyExists = existingNames.has(info.name.toLowerCase());

          return (
            <button
              key={key}
              onClick={() => setSelectedKey(assetKey)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border-dark bg-surface-dark hover:border-text-dark/20",
                alreadyExists && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-dark">
                      {info.name}
                    </span>
                    {alreadyExists && (
                      <Badge variant="success" size="sm">
                        <Check className="w-3 h-3 mr-0.5" />
                        Created
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-dark/50 mt-0.5 line-clamp-2">
                    {info.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
