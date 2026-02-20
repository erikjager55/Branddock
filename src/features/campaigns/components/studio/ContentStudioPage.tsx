"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { useStudioState, useAutoSave } from "../../hooks/studio.hooks";
import { useKnowledgeAssets, useCampaignDetail } from "../../hooks";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { getDefaultModel } from "@/lib/studio/ai-model-config";
import { StudioHeader } from "./StudioHeader";
import { ContentTypeTabs } from "./ContentTypeTabs";
import { LeftPanel } from "./left-panel/LeftPanel";
import { CenterCanvas } from "./canvas/CenterCanvas";
import { RightPanel } from "./RightPanel";
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
  const store = useContentStudioStore();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute tab locking: locked if content exists for the active tab
  const hasContent = !!(
    studio?.generatedText ||
    (studio?.generatedImageUrls && studio.generatedImageUrls.length > 0) ||
    studio?.generatedVideoUrl ||
    (studio?.generatedSlides && studio.generatedSlides.length > 0)
  );

  // Sync server state → store on initial load
  useEffect(() => {
    if (!studio) return;
    const tab = (studio.contentTab || "text") as ContentTab;
    store.setActiveTab(tab);
    store.setIsTabLocked(hasContent);
    store.setPrompt(studio.prompt || "");
    store.setAiModel(studio.aiModel || getDefaultModel(tab));
    store.setSettings(studio.settings);
    store.setTextContent(studio.generatedText || "");
    store.setImageUrls(studio.generatedImageUrls || []);
    store.setVideoUrl(studio.generatedVideoUrl || null);
    store.setSlides(studio.generatedSlides || []);
    store.setLastSavedAt(studio.lastAutoSavedAt);
    store.setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio?.id]);

  // Auto-save: debounced 5 seconds after last change
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const s = useContentStudioStore.getState();
      if (!s.isDirty) return;
      autoSave.mutate({
        prompt: s.prompt || undefined,
        generatedText: s.textContent || undefined,
        generatedImageUrls: s.imageUrls.length > 0 ? s.imageUrls : undefined,
        generatedVideoUrl: s.videoUrl || undefined,
        generatedSlides: s.slides.length > 0 ? s.slides : undefined,
      });
      s.setIsDirty(false);
      s.setLastSavedAt(new Date().toISOString());
    }, 5000);
  }, [autoSave]);

  useEffect(() => {
    if (store.isDirty) triggerAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [store.isDirty, triggerAutoSave]);

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
        lastSavedAt={store.lastSavedAt}
        isPreviewMode={store.isPreviewMode}
        onBack={onBack}
        onTogglePreview={() => store.setIsPreviewMode(!store.isPreviewMode)}
      />

      {/* Content Type Tabs */}
      <ContentTypeTabs
        activeTab={store.activeTab}
        isTabLocked={store.isTabLocked}
        onTabChange={(tab) => {
          store.setActiveTab(tab);
          store.setAiModel(getDefaultModel(tab));
        }}
      />

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          deliverableId={deliverableId}
          activeTab={store.activeTab}
          knowledgeAssets={knowledgeAssets || []}
          knowledgeConfidence={campaign?.confidence ?? null}
        />

        {/* Center Canvas */}
        <CenterCanvas
          activeTab={store.activeTab}
          isPreviewMode={store.isPreviewMode}
        />

        {/* Right Panel */}
        <RightPanel deliverableId={deliverableId} contentTab={store.activeTab} />
      </div>
    </div>
  );
}
