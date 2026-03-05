"use client";

import { Download } from "lucide-react";
import { Skeleton, Button } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { LockBanner, LockConfirmDialog } from "@/components/lock";
import { LockShield, LockStatusPill } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useQueryClient } from "@tanstack/react-query";
import { useStyleguide, useExportPdf, brandstyleKeys } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
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
  const exportPdf = useExportPdf();

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

  if (!styleguide) {
    onNavigateToAnalyzer();
    return null;
  }

  const createdDate = new Date(styleguide.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const selectedColor = selectedColorId
    ? styleguide.colors.find((c) => c.id === selectedColorId) ?? null
    : null;

  const canEdit = !lockState.isLocked;

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="brandstyle-guide">
      <PageHeader
        moduleKey="brandstyle"
        title="Brand Styleguide"
        subtitle="Your visual identity guidelines"
        className="border-b-0"
        actions={
          <div className="flex items-center gap-3">
            <LockShield
              isLocked={lockState.isLocked}
              isToggling={lockState.isToggling}
              onClick={lockState.requestToggle}
            />
            <LockStatusPill
              isLocked={lockState.isLocked}
              lockedBy={lockState.lockedBy}
              lockedAt={lockState.lockedAt}
            />
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => exportPdf.mutate()}
              isLoading={exportPdf.isPending}
            >
              Export PDF
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
          {styleguide.createdBy.name && (
            <>
              <span>Created by {styleguide.createdBy.name}</span>
              <span>·</span>
            </>
          )}
          <span>{createdDate}</span>
          {styleguide.sourceUrl && (
            <>
              <span>·</span>
              <span className="text-teal-600 truncate max-w-[200px]">
                {styleguide.sourceUrl}
              </span>
            </>
          )}
        </div>
      </PageHeader>

      <LockBanner
        isLocked={lockState.isLocked}
        lockedBy={lockState.lockedBy}
        onUnlock={lockState.requestToggle}
        className="my-4"
      />

      <StyleguideTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Active section */}
      {activeTab === "logo" && <LogoSection styleguide={styleguide} canEdit={canEdit} />}
      {activeTab === "colors" && <ColorsSection styleguide={styleguide} canEdit={canEdit} />}
      {activeTab === "typography" && <TypographySection styleguide={styleguide} canEdit={canEdit} />}
      {activeTab === "tone_of_voice" && <ToneOfVoiceSection styleguide={styleguide} canEdit={canEdit} />}
      {activeTab === "imagery" && <ImagerySection styleguide={styleguide} canEdit={canEdit} />}

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
