"use client";

import { Skeleton } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { LockBanner, LockConfirmDialog } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useQueryClient } from "@tanstack/react-query";
import { useStyleguide, brandstyleKeys } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { StyleguideHeader } from "./StyleguideHeader";
import { StyleguideTabNav } from "./StyleguideTabNav";
import { LogoSection } from "./LogoSection";
import { ColorsSection } from "./ColorsSection";
import { ColorDetailModal } from "./ColorDetailModal";
import { TypographySection } from "./TypographySection";
import { ToneOfVoiceSection } from "./ToneOfVoiceSection";
import { ImagerySection } from "./ImagerySection";

interface BrandStyleguidePageProps {
  onNavigateToAnalyzer: () => void;
}

export function BrandStyleguidePage({ onNavigateToAnalyzer }: BrandStyleguidePageProps) {
  const { data, isLoading, isError } = useStyleguide();
  const { activeTab, setActiveTab, selectedColorId, isColorModalOpen, closeColorModal } = useBrandstyleStore();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
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
      <PageShell maxWidth="5xl">
        <div data-testid="error-message" className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
          <p className="text-sm">Failed to load styleguide. Please try again.</p>
        </div>
      </PageShell>
    );
  }

  const styleguide = data?.styleguide;

  if (!styleguide) {
    onNavigateToAnalyzer();
    return null;
  }

  const lockState = useLockState({
    entityType: 'brandstyle',
    entityId: styleguide.id,
    entityName: 'Brand Styleguide',
    initialState: {
      isLocked: styleguide.isLocked,
      lockedAt: styleguide.lockedAt,
      lockedBy: styleguide.lockedBy ? { id: styleguide.lockedBy.id, name: styleguide.lockedBy.name ?? '' } : null,
    },
    onLockChange: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });

  const selectedColor = selectedColorId
    ? styleguide.colors.find((c) => c.id === selectedColorId) ?? null
    : null;

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="brandstyle-guide">
      <PageHeader
        moduleKey="brandstyle"
        title="Brand Styleguide"
        subtitle="Your visual identity guidelines"
      />

      <StyleguideHeader
        styleguide={styleguide}
        onAnalyzeNext={onNavigateToAnalyzer}
        lockState={lockState}
      />

      <LockBanner
        isLocked={lockState.isLocked}
        lockedBy={lockState.lockedBy}
        onUnlock={lockState.requestToggle}
      />

      <StyleguideTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Active section */}
      {activeTab === "logo" && <LogoSection styleguide={styleguide} />}
      {activeTab === "colors" && <ColorsSection styleguide={styleguide} />}
      {activeTab === "typography" && <TypographySection styleguide={styleguide} />}
      {activeTab === "tone_of_voice" && <ToneOfVoiceSection styleguide={styleguide} />}
      {activeTab === "imagery" && <ImagerySection styleguide={styleguide} />}

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
