"use client";

import { useCallback, useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAssetDetail, useUpdateFramework } from "../hooks/useBrandAssetDetail";
import { useBrandAssetDetailStore } from "../store/useBrandAssetDetailStore";
import { AssetDetailHeader } from "./AssetDetailHeader";
import { PurposeWheelSection } from "./PurposeWheelSection";
import { BrandEssenceSection } from "./BrandEssenceSection";
import { BrandPromiseSection } from "./BrandPromiseSection";
import { TransformativeGoalsSection } from "./TransformativeGoalsSection";
import { BrandArchetypeSection } from "./BrandArchetypeSection";
import { BrandPersonalitySection } from "./BrandPersonalitySection";
import { BrandStorySection } from "./BrandStorySection";
import { GoldenCircleSection } from "./GoldenCircleSection";
import { MissionVisionSection } from "./MissionVisionSection";
import { SocialRelevancySection } from "./SocialRelevancySection";
import { BrandHouseValuesSection } from "./BrandHouseValuesSection";
import { FrameworkSection } from "./FrameworkSection";
import type { PurposeWheelFrameworkData, BrandEssenceFrameworkData, BrandPromiseFrameworkData, TransformativeGoalsFrameworkData, BrandArchetypeFrameworkData, BrandPersonalityFrameworkData, BrandStoryFrameworkData, GoldenCircleFrameworkData, MissionVisionFrameworkData, SocialRelevancyFrameworkData, BrandHouseValuesFrameworkData } from "../types/framework.types";
import { AssetQuickActionsCard } from "./sidebar/AssetQuickActionsCard";
import { AssetCompletenessCard } from "./sidebar/AssetCompletenessCard";
import { AssetResearchSidebarCard } from "./sidebar/AssetResearchSidebarCard";
import { Skeleton, SkeletonCard } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import type { BrandAssetDetail } from "../types/brand-asset-detail.types";
import { useLockState } from "@/hooks/useLockState";
import { LockBanner, LockOverlay, LockConfirmDialog } from "@/components/lock";
import { useQueryClient } from "@tanstack/react-query";

/** Map framework type → canvas component. Replaces 11 booleans + conditional JSX. */
function renderFrameworkCanvas(
  asset: BrandAssetDetail,
  canEdit: boolean,
  onUpdate: (fd: unknown) => void,
): React.ReactNode {
  const fd = asset.frameworkData;

  switch (asset.frameworkType) {
    case 'PURPOSE_WHEEL':
      return <PurposeWheelSection data={fd as PurposeWheelFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: PurposeWheelFrameworkData) => void} />;
    case 'GOLDEN_CIRCLE':
      return <GoldenCircleSection data={fd as GoldenCircleFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: GoldenCircleFrameworkData) => void} />;
    case 'BRAND_ESSENCE':
      return <BrandEssenceSection data={fd as BrandEssenceFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: BrandEssenceFrameworkData) => void} />;
    case 'BRAND_PROMISE':
      return <BrandPromiseSection data={fd as BrandPromiseFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: BrandPromiseFrameworkData) => void} />;
    case 'TRANSFORMATIVE_GOALS':
      return <TransformativeGoalsSection data={fd as TransformativeGoalsFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: TransformativeGoalsFrameworkData) => void} />;
    case 'BRAND_ARCHETYPE':
      return <BrandArchetypeSection data={fd as BrandArchetypeFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: BrandArchetypeFrameworkData) => void} />;
    case 'BRAND_PERSONALITY':
      return <BrandPersonalitySection data={fd as BrandPersonalityFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: BrandPersonalityFrameworkData) => void} />;
    case 'BRAND_STORY':
      return <BrandStorySection data={fd as BrandStoryFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: BrandStoryFrameworkData) => void} />;
    case 'MISSION_STATEMENT':
      return <MissionVisionSection data={fd as MissionVisionFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: MissionVisionFrameworkData) => void} />;
    case 'ESG':
      return <SocialRelevancySection data={fd as SocialRelevancyFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: SocialRelevancyFrameworkData) => void} />;
    case 'BRANDHOUSE_VALUES':
      return <BrandHouseValuesSection data={fd as BrandHouseValuesFrameworkData | null} isEditing={canEdit} onUpdate={onUpdate as (d: BrandHouseValuesFrameworkData) => void} />;
    default:
      // Legacy types (SWOT, PURPOSE_KOMPAS) — read-only fallback
      return <FrameworkSection frameworkType={asset.frameworkType!} frameworkData={fd} />;
  }
}

interface BrandAssetDetailPageProps {
  assetId: string | null;
  onNavigateBack?: () => void;
  onNavigateToAnalysis?: (assetId: string) => void;
  onNavigateToInterviews?: (assetId: string) => void;
  onNavigateToWorkshop?: (assetId: string) => void;
}

export function BrandAssetDetailPage({
  assetId,
  onNavigateBack,
  onNavigateToAnalysis,
  onNavigateToInterviews,
  onNavigateToWorkshop,
}: BrandAssetDetailPageProps) {
  const { data: asset, isLoading, error } = useAssetDetail(assetId);
  const isEditing = useBrandAssetDetailStore((s) => s.isEditing);
  const setIsEditing = useBrandAssetDetailStore((s) => s.setIsEditing);
  const qc = useQueryClient();

  const handleLockChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['brand-asset-detail', assetId] });
    qc.invalidateQueries({ queryKey: ['brand-assets'] });
  }, [qc, assetId]);

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
    onLockChange: handleLockChange,
  });

  const updateFramework = useUpdateFramework(assetId ?? '');

  // Force editing off when locked
  useEffect(() => {
    if (lockState.isLocked && isEditing) {
      setIsEditing(false);
    }
  }, [lockState.isLocked, isEditing, setIsEditing]);

  if (!assetId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No asset selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="7xl">
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

  const handleSave = () => {
    setIsEditing(false);
    toast.success('Brand asset saved successfully');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <PageShell maxWidth="7xl">
      <div data-testid="brand-asset-detail-page" className="space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Your Brand
        </button>

        {/* Hero Header */}
        <AssetDetailHeader
          asset={asset}
          lockState={lockState}
          isEditing={isEditing}
          onEditToggle={() => setIsEditing(true)}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
          onVersionRestore={() => {
            qc.invalidateQueries({ queryKey: ['brand-asset-detail', assetId] });
            qc.invalidateQueries({ queryKey: ['brand-assets'] });
          }}
        />

        {/* Lock Banner */}
        <LockBanner
          isLocked={lockState.isLocked}
          onUnlock={lockState.requestToggle}
          lockedBy={lockState.lockedBy}
        />

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content — left column (2/3) */}
          <div className="md:col-span-2 min-w-0 space-y-6">
            {/* Framework canvas — dynamically selected by framework type */}
            {asset.frameworkType && (
              <LockOverlay isLocked={lockState.isLocked}>
                {renderFrameworkCanvas(asset, isEditing && !lockState.isLocked, (fd) => updateFramework.mutate({ frameworkData: fd as Record<string, unknown> }))}
              </LockOverlay>
            )}
          </div>

          {/* Sidebar — right column (1/3), sticky */}
          <div className="min-w-0">
            <div className="md:sticky md:top-6 space-y-4">
              {/* Quick Actions */}
              <AssetQuickActionsCard asset={asset} />

              {/* Asset Completeness */}
              <AssetCompletenessCard asset={asset} />

              {/* Validation Methods */}
              <AssetResearchSidebarCard
                asset={asset}
                onStartAnalysis={() => onNavigateToAnalysis?.(asset.id)}
                onStartInterviews={() => onNavigateToInterviews?.(asset.id)}
                onStartWorkshop={() => onNavigateToWorkshop?.(asset.id)}
                isLocked={lockState.isLocked}
              />

            </div>
          </div>
        </div>

        {/* Lock Confirm Dialog */}
        <LockConfirmDialog
          isOpen={lockState.showConfirm}
          isLocking={!lockState.isLocked}
          entityName={asset.name}
          entityType="brand-asset"
          onConfirm={lockState.confirmToggle}
          onCancel={lockState.cancelToggle}
        />
      </div>
    </PageShell>
  );
}
