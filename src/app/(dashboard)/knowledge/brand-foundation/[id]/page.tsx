"use client";

import { useState, useEffect, use } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Layers, Edit, Trash2, Clock, User } from "lucide-react";
import { AssetTypeIcon } from "@/features/knowledge/brand-foundation/AssetTypeIcon";
import { AssetStatusBadge } from "@/features/knowledge/brand-foundation/AssetStatusBadge";
import { AssetContentViewer } from "@/features/knowledge/brand-foundation/AssetContentViewer";
import { AIAnalysisSidebar } from "@/features/knowledge/brand-foundation/AIAnalysisSidebar";
import { RelatedAssetsCarousel } from "@/features/knowledge/brand-foundation/RelatedAssetsCarousel";
import { BrandAssetWithRelations } from "@/types/brand-asset";
import { formatDate } from "@/lib/utils/date";
import { useRouter } from "next/navigation";

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<BrandAssetWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedAssets, setRelatedAssets] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchAsset();
      fetchRelatedAssets();
    }
  }, [id]);

  const fetchAsset = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/brand-assets/${id}`);
      if (response.ok) {
        const data = await response.json();
        setAsset(data);
      }
    } catch (error) {
      console.error("Error fetching asset:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedAssets = async () => {
    try {
      const response = await fetch(`/api/brand-assets/${id}/related`);
      if (response.ok) {
        const data = await response.json();
        setRelatedAssets(data);
      }
    } catch (error) {
      console.error("Error fetching related assets:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const response = await fetch(`/api/brand-assets/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/knowledge/brand-foundation");
      }
    } catch (error) {
      console.error("Error deleting asset:", error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px]">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-surface-dark rounded w-1/3"></div>
          <div className="h-12 bg-surface-dark rounded w-1/2"></div>
          <div className="h-64 bg-surface-dark rounded"></div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="max-w-[1600px]">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Asset not found
          </h2>
          <p className="text-text-dark/60 mb-4">
            The asset you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/knowledge/brand-foundation")}
          >
            Back to Brand Foundation
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Knowledge", href: "/knowledge" },
    { label: "Brand Foundation", href: "/knowledge/brand-foundation" },
    {
      label: asset.name,
      icon: <AssetTypeIcon type={asset.type} className="w-4 h-4" />,
    },
  ];

  return (
    <div className="max-w-[1600px]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center">
                  <AssetTypeIcon
                    type={asset.type}
                    className="w-5 h-5 text-text-dark/60"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-dark">
                    {asset.name}
                  </h1>
                  <p className="text-sm text-text-dark/60 capitalize">
                    {asset.type.toLowerCase()} Asset
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <AssetStatusBadge status={asset.status} />
                <span className="text-sm text-text-dark/60 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {asset.creator.name || asset.creator.email}
                </span>
                <span className="text-sm text-text-dark/60 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Updated {formatDate(asset.updatedAt)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                leftIcon={<Edit className="w-4 h-4" />}
                onClick={() => alert("Edit functionality to be implemented")}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleDelete}
                className="text-error hover:bg-error/10"
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Description */}
          {asset.description && (
            <div className="bg-surface-dark border border-border-dark rounded-lg p-4">
              <p className="text-text-dark/80">{asset.description}</p>
            </div>
          )}

          {/* Content Viewer */}
          <AssetContentViewer asset={asset} />

          {/* Related Assets */}
          <div className="pt-6 border-t border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-dark flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Related Assets
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  alert("Add relationship functionality to be implemented")
                }
              >
                Add Relationship
              </Button>
            </div>
            <RelatedAssetsCarousel
              assets={relatedAssets.map((r) => r.asset)}
            />
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <AIAnalysisSidebar
          analyses={asset.aiAnalyses}
          loading={false}
        />
      </div>
    </div>
  );
}
