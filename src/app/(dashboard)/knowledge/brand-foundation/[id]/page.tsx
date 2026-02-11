"use client";

import { useState, useEffect, use, useCallback } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  User,
  Edit,
  Sparkles,
  Lock,
  Unlock,
  Brain,
  Users,
  MessageSquare,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";
import { AssetTypeIcon } from "@/features/knowledge/brand-foundation/AssetTypeIcon";
import { AssetStatusBadge } from "@/features/knowledge/brand-foundation/AssetStatusBadge";
import { AssetContentViewer } from "@/features/knowledge/brand-foundation/AssetContentViewer";
import { AssetOverflowMenu } from "@/features/knowledge/brand-foundation/AssetOverflowMenu";
import { BrandAssetWithRelations, AssetStatus } from "@/types/brand-asset";
import {
  getBrandAssetTypeInfo,
  getValidationColor,
} from "@/lib/constants/brand-assets";
import { formatDate } from "@/lib/utils/date";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AssetWithCounts = BrandAssetWithRelations & {
  _count?: {
    newAiAnalyses: number;
    workshops: number;
    interviews: number;
    questionnaires: number;
  };
};

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<AssetWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockLoading, setLockLoading] = useState(false);

  useEffect(() => {
    if (id) fetchAsset();
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

  const handleToggleLock = async () => {
    if (!asset) return;
    setLockLoading(true);
    try {
      const isLocked = asset.isLocked;
      const response = await fetch(`/api/brand-assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isLocked ? "ACTIVE" : "LOCKED",
          lockedById: isLocked ? null : undefined,
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setAsset(updated);
      }
    } catch (error) {
      console.error("Error toggling lock:", error);
    } finally {
      setLockLoading(false);
    }
  };

  const handleStatusChange = async (status: AssetStatus) => {
    try {
      const response = await fetch(`/api/brand-assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const updated = await response.json();
        setAsset(updated);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSaveContent = useCallback(
    async (content: Record<string, unknown>) => {
      await fetch(`/api/brand-assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const response = await fetch(`/api/brand-assets/${id}`);
      if (response.ok) {
        const updated = await response.json();
        setAsset(updated);
      }
    },
    [id]
  );

  if (loading) {
    return (
      <div className="max-w-[1200px]">
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
      <div className="max-w-[1200px]">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Asset not found
          </h2>
          <p className="text-text-dark/60 mb-4">
            The asset you&apos;re looking for doesn&apos;t exist or has been deleted.
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

  const typeInfo = getBrandAssetTypeInfo(asset);
  const isLocked = asset.isLocked || asset.status === "LOCKED";
  const canEdit = !isLocked;

  const counts = asset._count ?? {
    newAiAnalyses: 0,
    workshops: 0,
    interviews: 0,
    questionnaires: 0,
  };
  const completedMethods =
    (counts.newAiAnalyses > 0 ? 1 : 0) +
    (counts.workshops > 0 ? 1 : 0) +
    (counts.interviews > 0 ? 1 : 0) +
    (counts.questionnaires > 0 ? 1 : 0);
  const validationPct = Math.round((completedMethods / 4) * 100);
  const validationColor = getValidationColor(validationPct);

  const breadcrumbItems = [
    { label: "Knowledge", href: "/knowledge" },
    { label: "Brand Foundation", href: "/knowledge/brand-foundation" },
    {
      label: asset.name,
      icon: <AssetTypeIcon type={asset.type} className="w-4 h-4" />,
    },
  ];

  const researchMethods = [
    {
      key: "ai",
      label: "AI Exploration",
      icon: Brain,
      count: counts.newAiAnalyses,
      status: counts.newAiAnalyses > 0 ? "completed" : "available",
      href: `/knowledge/brand-foundation/${id}/analysis`,
    },
    {
      key: "workshop",
      label: "Canvas Workshop",
      icon: Users,
      count: counts.workshops,
      status: counts.workshops > 0 ? "completed" : "available",
      href: "#",
    },
    {
      key: "interview",
      label: "Interviews",
      icon: MessageSquare,
      count: counts.interviews,
      status: counts.interviews > 0 ? "completed" : "available",
      href: "#",
    },
    {
      key: "questionnaire",
      label: "Questionnaire",
      icon: ClipboardList,
      count: counts.questionnaires,
      status: counts.questionnaires > 0 ? "completed" : "available",
      href: "#",
    },
  ];

  return (
    <div className="max-w-[1200px]">
      {/* Back link */}
      <Link
        href="/knowledge/brand-foundation"
        className="inline-flex items-center gap-1.5 text-sm text-text-dark/60 hover:text-text-dark mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Your Brand
      </Link>

      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{typeInfo?.icon ?? "📄"}</span>
            <div>
              <h1 className="text-2xl font-semibold text-text-dark">
                {asset.name}
              </h1>
              <p className="text-sm text-text-dark/60">
                {typeInfo?.description ?? asset.description ?? "Brand asset"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span
              className={cn(
                "text-sm font-semibold px-2.5 py-0.5 rounded-full",
                validationColor
              )}
            >
              {validationPct}% validated
            </span>
            <AssetStatusBadge status={asset.status} />
            <span className="text-xs text-text-dark/40 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {asset.creator.name || asset.creator.email}
            </span>
            <span className="text-xs text-text-dark/40 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Updated {formatDate(asset.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <AssetOverflowMenu
            assetId={id}
            assetName={asset.name}
            currentStatus={asset.status}
            isLocked={isLocked}
            onStatusChange={handleStatusChange}
            onLockToggle={handleToggleLock}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Content Editor Action Bar */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Edit className="w-4 h-4" />}
          disabled={!canEdit}
        >
          Edit Content
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Sparkles className="w-4 h-4" />}
          disabled
        >
          Regenerate with AI
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={
            isLocked ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )
          }
          onClick={handleToggleLock}
          loading={lockLoading}
        >
          {isLocked ? "Unlock" : "Lock for Editing"}
        </Button>
      </div>

      {/* Content Viewer */}
      <AssetContentViewer
        asset={asset}
        editable={canEdit}
        onSave={handleSaveContent}
      />

      {/* Research Methods Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">
              Research Methods
            </h2>
            <p className="text-sm text-text-dark/60">
              Validate this asset through multiple research approaches
            </p>
          </div>
          <span
            className={cn(
              "text-sm font-semibold px-3 py-1 rounded-full",
              validationColor
            )}
          >
            {validationPct}% — {completedMethods}/4 methods
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-surface-dark rounded-full overflow-hidden mb-6 border border-border-dark">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${validationPct}%` }}
          />
        </div>

        {/* Method cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {researchMethods.map((method) => (
            <Card key={method.key} padding="md" hoverable>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    method.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-surface-dark text-text-dark/40"
                  )}
                >
                  <method.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-dark">
                    {method.label}
                  </h4>
                  <p className="text-xs text-text-dark/50 mt-0.5">
                    {method.status === "completed"
                      ? `${method.count} session${method.count !== 1 ? "s" : ""}`
                      : "Not started"}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                {method.href !== "#" ? (
                  <Link
                    href={method.href}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {method.status === "completed"
                      ? "View Results"
                      : "Start Analysis"}
                    {" →"}
                  </Link>
                ) : (
                  <span className="text-xs text-text-dark/30">
                    Coming soon
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
