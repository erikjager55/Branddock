"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { useStudioState, useAutoSave } from "../../hooks/studio.hooks";
import { useKnowledgeAssets, useCampaignDetail, useDeleteDeliverable } from "../../hooks";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { getDefaultModel } from "@/lib/studio/ai-model-config";
import { StudioHeader } from "./StudioHeader";
import { ContentTypeTabs } from "./ContentTypeTabs";
import { LeftPanel } from "./left-panel/LeftPanel";
import { CenterCanvas } from "./canvas/CenterCanvas";
import { RightPanel } from "./RightPanel";
import { Modal, Button } from "@/components/shared";
import type { ContentTab } from "@/types/studio";

interface ContentStudioPageProps {
  deliverableId: string;
  campaignId: string;
  onBack: () => void;
}

export function ContentStudioPage({ deliverableId, campaignId, onBack }: ContentStudioPageProps) {
  const { data: studio, isLoading } = useStudioState(deliverableId);
  const { data: campaign } = useCampaignDetail(campaignId);
  const { data: knowledgeAssets } = useKnowledgeAssets(campaignId);
  const autoSave = useAutoSave(deliverableId);
  const deleteMutation = useDeleteDeliverable(campaignId);

  // Use individual selectors to prevent full re-render on every store change
  const activeTab = useContentStudioStore((s) => s.activeTab);
  const isTabLocked = useContentStudioStore((s) => s.isTabLocked);
  const lastSavedAt = useContentStudioStore((s) => s.lastSavedAt);
  const isPreviewMode = useContentStudioStore((s) => s.isPreviewMode);
  const isDirty = useContentStudioStore((s) => s.isDirty);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Compute tab locking: locked if content exists for the active tab
  const hasContent = !!(
    studio?.generatedText ||
    (studio?.generatedImageUrls && studio.generatedImageUrls.length > 0) ||
    studio?.generatedVideoUrl ||
    (studio?.generatedSlides && studio.generatedSlides.length > 0)
  );

  // Sync server state → store on initial load (uses getState() for one-time setters)
  useEffect(() => {
    if (!studio) return;
    const s = useContentStudioStore.getState();
    const tab = (studio.contentTab || "text") as ContentTab;
    s.setActiveTab(tab);
    s.setIsTabLocked(hasContent);
    s.setPrompt(studio.prompt || "");
    s.setAiModel(studio.aiModel || getDefaultModel(tab));
    s.setSettings(studio.settings);
    s.setTextContent(studio.generatedText || "");
    s.setImageUrls(studio.generatedImageUrls || []);
    s.setVideoUrl(studio.generatedVideoUrl || null);
    s.setSlides(studio.generatedSlides || []);
    if (Array.isArray(studio.checklistItems)) {
      s.setChecklistItems(studio.checklistItems);
    }
    s.setLastSavedAt(studio.lastAutoSavedAt);
    s.setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio?.id]);

  // Clear campaign context when leaving the studio page
  useEffect(() => {
    return () => {
      useContentStudioStore.getState().clearCampaignContext();
    };
  }, []);

  // Auto-save: debounced 5 seconds after last change
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const s = useContentStudioStore.getState();
      if (!s.isDirty) return;
      autoSave.mutate(
        {
          prompt: s.prompt || undefined,
          generatedText: s.textContent || undefined,
          generatedImageUrls: s.imageUrls.length > 0 ? s.imageUrls : undefined,
          generatedVideoUrl: s.videoUrl || undefined,
          generatedSlides: s.slides.length > 0 ? s.slides : undefined,
          checklistItems: s.checklistItems.length > 0 ? s.checklistItems : undefined,
        },
        {
          onSuccess: () => {
            const st = useContentStudioStore.getState();
            st.setIsDirty(false);
            st.setLastSavedAt(new Date().toISOString());
          },
        },
      );
    }, 5000);
  }, [autoSave]);

  useEffect(() => {
    if (isDirty) triggerAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, triggerAutoSave]);

  if (isLoading || !studio) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="content-studio" className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <StudioHeader
        title={studio.title}
        contentType={studio.contentType}
        campaignTitle={studio.campaignTitle}
        contentTab={activeTab}
        lastSavedAt={lastSavedAt}
        isPreviewMode={isPreviewMode}
        onBack={onBack}
        onTogglePreview={() => useContentStudioStore.getState().setIsPreviewMode(!isPreviewMode)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Content Type Tabs */}
      <ContentTypeTabs
        activeTab={activeTab}
        isTabLocked={isTabLocked}
        onTabChange={(tab) => {
          const s = useContentStudioStore.getState();
          s.setActiveTab(tab);
          s.setAiModel(getDefaultModel(tab));
        }}
      />

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          deliverableId={deliverableId}
          activeTab={activeTab}
          contentType={studio.contentType || "blog-post"}
          knowledgeAssets={knowledgeAssets || []}
          knowledgeConfidence={campaign?.confidence ?? null}
        />

        {/* Center Canvas */}
        <CenterCanvas
          activeTab={activeTab}
          isPreviewMode={isPreviewMode}
        />

        {/* Right Panel */}
        <RightPanel deliverableId={deliverableId} />
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Deliverable"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete &ldquo;{studio.title}&rdquo;? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate(deliverableId, {
                  onSuccess: () => {
                    setShowDeleteConfirm(false);
                    onBack();
                  },
                });
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
