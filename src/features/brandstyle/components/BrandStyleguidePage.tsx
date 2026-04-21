"use client";

import { useEffect, useCallback } from "react";
import { Skeleton } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { LockBanner, LockConfirmDialog, LockOverlay } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useQueryClient } from "@tanstack/react-query";
import { useStyleguide, brandstyleKeys } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { StyleguideTabNav } from "./StyleguideTabNav";
import { StyleguideHeader } from "./StyleguideHeader";
import { ReviewSummaryHeader } from "./review/ReviewSummaryHeader";
import { ReviewClosedProvider } from "./review/ReviewDraftPanel";
import { BrandAssetsSection } from "./BrandAssetsSection";
import { ColorsSection } from "./ColorsSection";
import { ColorDetailModal } from "./ColorDetailModal";
import { TypographySection } from "./TypographySection";
import { SpacingSection } from "./SpacingSection";
import { ComponentsSection } from "./ComponentsSection";
import { ToneOfVoiceSection } from "./ToneOfVoiceSection";
import { ImagerySection } from "./ImagerySection";
import { VisualSystemSection } from "./VisualSystemSection";

interface BrandStyleguidePageProps {
  onNavigateToAnalyzer: () => void;
}

export function BrandStyleguidePage({ onNavigateToAnalyzer }: BrandStyleguidePageProps) {
  const { data, isLoading, isError } = useStyleguide();
  const { activeTab, setActiveTab, selectedColorId, isColorModalOpen, closeColorModal } = useBrandstyleStore();
  const isEditing = useBrandstyleStore((s) => s.isEditing);
  const setIsEditing = useBrandstyleStore((s) => s.setIsEditing);
  const qc = useQueryClient();

  const styleguide = data?.styleguide ?? null;

  // Hook must be called unconditionally (Rules of Hooks).
  // Pass safe defaults when styleguide is not yet loaded.
  const lockState = useLockState({
    entityType: 'brandstyle',
    entityId: styleguide?.id ?? '',
    entityName: 'Brand Styleguide',
    initialState: {
      isLocked: styleguide?.isLocked ?? false,
      lockedAt: styleguide?.lockedAt ?? null,
      lockedBy: styleguide?.lockedBy ? { id: styleguide.lockedBy.id, name: styleguide.lockedBy.name ?? '' } : null,
    },
    onLockChange: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });

  // Force editing off when locked (matches Brand Asset Detail pattern)
  useEffect(() => {
    if (lockState.isLocked && isEditing) {
      setIsEditing(false);
    }
  }, [lockState.isLocked, isEditing, setIsEditing]);

  const handleNewAnalysis = useCallback(() => {
    setIsEditing(false);
    onNavigateToAnalyzer();
  }, [setIsEditing, onNavigateToAnalyzer]);

  useEffect(() => {
    if (!isLoading && !isError && !styleguide) {
      onNavigateToAnalyzer();
    }
  }, [isLoading, isError, styleguide, onNavigateToAnalyzer]);

  if (isLoading) {
    return (
      <PageShell maxWidth="7xl">
        <div data-testid="skeleton-loader" className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell maxWidth="7xl">
        <div data-testid="error-message" className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
          <p className="text-sm">Failed to load styleguide. Please try again.</p>
        </div>
      </PageShell>
    );
  }

  if (!styleguide) {
    return null;
  }

  const selectedColor = selectedColorId
    ? styleguide.colors.find((c) => c.id === selectedColorId) ?? null
    : null;

  const canEdit = !lockState.isLocked && isEditing;

  return (
    <PageShell maxWidth="7xl">
      <div data-testid="brandstyle-guide">
        <StyleguideHeader
          styleguide={styleguide}
          isEditing={isEditing}
          isLocked={lockState.isLocked}
          isTogglingLock={lockState.isToggling}
          lockedBy={lockState.lockedBy}
          lockedAt={lockState.lockedAt}
          onEditToggle={setIsEditing}
          onLockToggle={lockState.requestToggle}
          onNewAnalysis={handleNewAnalysis}
        />

        <LockBanner
          isLocked={lockState.isLocked}
          lockedBy={lockState.lockedBy}
          onUnlock={lockState.requestToggle}
          className="my-4"
        />

        <div className="mt-6" />

        {!styleguide.published && (
          <div className="mb-5">
            <ReviewSummaryHeader styleguide={styleguide} canEdit={!lockState.isLocked} />
          </div>
        )}

        <StyleguideTabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Active section — wrapped in LockOverlay. ReviewClosedProvider
            hides every ReviewDraftPanel in the tree when the user has
            finalized the review (published=true), without threading the
            flag through each section's props. */}
        <ReviewClosedProvider value={styleguide.published === true}>
          <LockOverlay isLocked={lockState.isLocked}>
            {activeTab === "brand_assets" && <BrandAssetsSection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "colors" && <ColorsSection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "typography" && <TypographySection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "spacing" && <SpacingSection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "components" && <ComponentsSection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "tone_of_voice" && <ToneOfVoiceSection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "imagery" && <ImagerySection styleguide={styleguide} canEdit={canEdit} />}
            {activeTab === "visual_system" && <VisualSystemSection styleguide={styleguide} canEdit={canEdit} />}
          </LockOverlay>
        </ReviewClosedProvider>

        {/* Color detail modal */}
        <ColorDetailModal
          isOpen={isColorModalOpen}
          onClose={closeColorModal}
          color={selectedColor}
        />

        <LockConfirmDialog
          isOpen={lockState.showConfirm}
          isLocking={!lockState.isLocked}
          entityName="Brand Styleguide"
          onConfirm={lockState.confirmToggle}
          onCancel={lockState.cancelToggle}
        />
      </div>
    </PageShell>
  );
}
