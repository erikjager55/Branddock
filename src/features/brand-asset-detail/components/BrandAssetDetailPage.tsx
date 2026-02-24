"use client";

import { useAssetDetail } from "../hooks/useBrandAssetDetail";
import { useBrandAssetDetailStore } from "../store/useBrandAssetDetailStore";
import { AssetDetailHeader } from "./AssetDetailHeader";
import { ContentEditorSection } from "./ContentEditorSection";
import { FrameworkSection } from "./FrameworkSection";
import { ResearchMethodsSection } from "./ResearchMethodsSection";
import { VersionHistoryTimeline } from "./VersionHistoryTimeline";
import { DeleteAssetDialog } from "./DeleteAssetDialog";
import { Skeleton, SkeletonCard } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { AlertTriangle } from "lucide-react";
import { useLockState } from "@/hooks/useLockState";
import { useLockVisibility } from "@/hooks/useLockVisibility";
import { LockBanner, LockConfirmDialog } from "@/components/lock";
import { useQueryClient } from "@tanstack/react-query";

interface BrandAssetDetailPageProps {
  assetId: string | null;
  onNavigateBack?: () => void;
  onNavigateToAnalysis?: (assetId: string) => void;
  onNavigateToInterviews?: (assetId: string) => void;
  onNavigateToWorkshop?: (assetId: string) => void;
  onNavigateToGoldenCircle?: (assetId: string) => void;
}

export function BrandAssetDetailPage({
  assetId,
  onNavigateBack,
  onNavigateToAnalysis,
  onNavigateToInterviews,
  onNavigateToWorkshop,
  onNavigateToGoldenCircle,
}: BrandAssetDetailPageProps) {
  const { data: asset, isLoading, error } = useAssetDetail(assetId);
  const showDeleteDialog = useBrandAssetDetailStore((s) => s.showDeleteDialog);
  const setShowDeleteDialog = useBrandAssetDetailStore(
    (s) => s.setShowDeleteDialog
  );
  const qc = useQueryClient();

  const lockState = useLockState({
    entityType: 'brand-assets',
    entityId: assetId ?? '',
    entityName: asset?.name ?? '',
    initialState: {
      isLocked: asset?.isLocked ?? false,
      lockedAt: asset?.lockedAt ?? null,
      lockedBy: asset?.lockedBy
        ? { id: asset.lockedBy.id, name: asset.lockedBy.name ?? '' }
        : null,
    },
    onLockChange: () => {
      qc.invalidateQueries({ queryKey: ['brand-asset-detail', assetId] });
      qc.invalidateQueries({ queryKey: ['brand-assets'] });
    },
  });

  const visibility = useLockVisibility(lockState.isLocked);

  if (!assetId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No asset selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div data-testid="skeleton-loader" className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  if (error || !asset) {
    return (
      <div data-testid="error-message" className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p>{error?.message ?? "Asset not found"}</p>
      </div>
    );
  }

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="brand-asset-detail-page" className="space-y-6">
        <AssetDetailHeader
          asset={asset}
          onNavigateBack={onNavigateBack}
          lockState={lockState}
          onVersionRestore={() => {
            qc.invalidateQueries({ queryKey: ['brand-asset-detail', assetId] });
            qc.invalidateQueries({ queryKey: ['brand-assets'] });
          }}
        />

        <LockBanner
          isLocked={lockState.isLocked}
          onUnlock={lockState.requestToggle}
          lockedBy={lockState.lockedBy}
        />

        <ContentEditorSection
          asset={asset}
          isLocked={lockState.isLocked}
          showRegenerate={visibility.showRegenerateButton}
        />

        {asset.frameworkType && (
          <FrameworkSection
            frameworkType={asset.frameworkType}
            frameworkData={asset.frameworkData}
            onNavigateToGoldenCircle={
              asset.frameworkType === "GOLDEN_CIRCLE"
                ? () => onNavigateToGoldenCircle?.(asset.id)
                : undefined
            }
          />
        )}

        <ResearchMethodsSection
          methods={asset.researchMethods}
          validationPercentage={asset.validationPercentage}
          completedMethods={asset.completedMethods}
          totalMethods={asset.totalMethods}
          isLocked={lockState.isLocked}
          onStartAnalysis={() => onNavigateToAnalysis?.(asset.id)}
          onStartInterviews={() => onNavigateToInterviews?.(asset.id)}
          onStartWorkshop={() => onNavigateToWorkshop?.(asset.id)}
        />

        <VersionHistoryTimeline assetId={asset.id} />

        <DeleteAssetDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          assetId={asset.id}
          assetName={asset.name}
          onDeleted={onNavigateBack}
        />

        <LockConfirmDialog
          isOpen={lockState.showConfirm}
          isLocking={!lockState.isLocked}
          entityName={asset.name}
          onConfirm={lockState.confirmToggle}
          onCancel={lockState.cancelToggle}
        />
      </div>
    </PageShell>
  );
}
