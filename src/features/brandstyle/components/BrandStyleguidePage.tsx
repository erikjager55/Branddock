"use client";

import { useEffect, useCallback } from "react";
import { Download, Pencil, Palette, Save, X, RefreshCw } from "lucide-react";
import { Skeleton, Button } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { LockBanner, LockConfirmDialog, LockOverlay } from "@/components/lock";
import { LockShield, LockStatusPill } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useQueryClient } from "@tanstack/react-query";
import { useStyleguide, brandstyleKeys } from "../hooks/useBrandstyleHooks";
import { exportBrandstylePdf } from "../utils/exportBrandstylePdf";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { StyleguideTabNav } from "./StyleguideTabNav";
import { LogoSection } from "./LogoSection";
import { ColorsSection } from "./ColorsSection";
import { ColorDetailModal } from "./ColorDetailModal";
import { TypographySection } from "./TypographySection";
import { ToneOfVoiceSection } from "./ToneOfVoiceSection";
import { ImagerySection } from "./ImagerySection";
import { DesignLanguageSection } from "./DesignLanguageSection";

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

  const handleExportPdf = useCallback(() => {
    if (styleguide) exportBrandstylePdf(styleguide);
  }, [styleguide]);

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

  const canEdit = !lockState.isLocked && isEditing;

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="brandstyle-guide">
        {/* Card-style header — matches AssetDetailHeader pattern */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-6">
            {/* Module icon */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                <Palette className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Title + Lock badge */}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Brand Styleguide</h1>
                <LockStatusPill
                  isLocked={lockState.isLocked}
                  lockedBy={lockState.lockedBy}
                  lockedAt={lockState.lockedAt}
                />
              </div>

              {/* Subtitle */}
              <p className="text-base text-gray-500 mt-0.5">Your visual identity guidelines</p>

              {/* Metadata bar */}
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
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
                <span>·</span>
                <button
                  onClick={handleNewAnalysis}
                  disabled={lockState.isLocked}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-3 w-3" />
                  New Analysis
                </button>
                <span>·</span>
                <button
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Action buttons — Edit/Save/Cancel + LockShield */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  onClick={() => setIsEditing(true)}
                  disabled={lockState.isLocked}
                >
                  Edit
                </Button>
              )}

              <LockShield
                isLocked={lockState.isLocked}
                isToggling={lockState.isToggling}
                onClick={lockState.requestToggle}
                size="sm"
              />
            </div>
          </div>
        </div>

        <LockBanner
          isLocked={lockState.isLocked}
          lockedBy={lockState.lockedBy}
          onUnlock={lockState.requestToggle}
          className="my-4"
        />

        <div className="mt-6" />

        <StyleguideTabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Active section — wrapped in LockOverlay */}
        <LockOverlay isLocked={lockState.isLocked}>
          {activeTab === "logo" && <LogoSection styleguide={styleguide} canEdit={canEdit} />}
          {activeTab === "colors" && <ColorsSection styleguide={styleguide} canEdit={canEdit} />}
          {activeTab === "typography" && <TypographySection styleguide={styleguide} canEdit={canEdit} />}
          {activeTab === "tone_of_voice" && <ToneOfVoiceSection styleguide={styleguide} canEdit={canEdit} />}
          {activeTab === "imagery" && <ImagerySection styleguide={styleguide} canEdit={canEdit} />}
          {activeTab === "design_language" && <DesignLanguageSection styleguide={styleguide} canEdit={canEdit} />}
        </LockOverlay>

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
