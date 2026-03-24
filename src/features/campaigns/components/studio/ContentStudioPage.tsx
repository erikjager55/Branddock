"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { Layers } from "lucide-react";
import { useStudioState, useAutoSave } from "../../hooks/studio.hooks";
import { useKnowledgeAssets, useCampaignDetail, useDeleteDeliverable } from "../../hooks";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { useComponentPipelineStore } from "@/lib/studio/stores/component-pipeline-store";
import { getDefaultModel } from "@/lib/studio/ai-model-config";
import { supportsPipelineMode } from "@/lib/studio/component-registry";
import { StudioHeader } from "./StudioHeader";
import { ContentTypeTabs } from "./ContentTypeTabs";
import { LeftPanel } from "./left-panel/LeftPanel";
import { CenterCanvas } from "./canvas/CenterCanvas";
import { RightPanel } from "./RightPanel";
import { BriefReviewScreen } from "./BriefReviewScreen";
import { PipelineNavigator } from "./left-panel/PipelineNavigator";
import { ComponentCanvas } from "./canvas/ComponentCanvas";
import { ComponentReviewPanel } from "./ComponentReviewPanel";
import { Modal, Button, Skeleton } from "@/components/shared";
import { STUDIO } from "@/lib/constants/design-tokens";
import type { ContentTab, DeliverableComponentState, PipelineStatusType } from "@/types/studio";

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

  // Pipeline store
  const pipelineStatus = useComponentPipelineStore((s) => s.pipelineStatus);
  const isInitializing = useComponentPipelineStore((s) => s.isInitializing);
  const initializePipeline = useComponentPipelineStore((s) => s.initializePipeline);
  const setPipelineStatus = useComponentPipelineStore((s) => s.setPipelineStatus);
  const setIsInitializing = useComponentPipelineStore((s) => s.setIsInitializing);
  const setError = useComponentPipelineStore((s) => s.setError);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if this deliverable type supports pipeline mode
  const canUsePipeline = studio ? supportsPipelineMode(studio.contentType || '') : false;

  // Sync pipeline status from server on initial load
  useEffect(() => {
    if (!studio) return;
    const serverPipelineStatus = (studio.pipelineStatus || 'LEGACY') as PipelineStatusType;
    if (serverPipelineStatus !== 'LEGACY') {
      setPipelineStatus(serverPipelineStatus);
    }
  }, [studio?.id, setPipelineStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle "Start Pipeline" → transition to BRIEF_REVIEW (persist to DB)
  const handleStartPipeline = useCallback(async () => {
    setPipelineStatus('BRIEF_REVIEW');
    try {
      await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStatus: 'BRIEF_REVIEW' }),
      });
    } catch {
      // Best-effort persistence — store already updated for immediate UX
    }
  }, [deliverableId, setPipelineStatus]);

  // Handle pipeline initialization from BriefReviewScreen
  const handleInitializePipeline = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/components/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additionalInstructions: useComponentPipelineStore.getState().additionalInstructions,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to initialize pipeline' }));
        throw new Error(err.error || 'Failed to initialize pipeline');
      }
      const data = await res.json();
      const components: DeliverableComponentState[] = (data.components ?? []).map(
        (c: Record<string, unknown>) => ({
          id: c.id as string,
          deliverableId: c.deliverableId as string,
          componentType: c.componentType as string,
          groupType: c.groupType as string,
          groupIndex: (c.groupIndex as number) ?? 0,
          order: (c.order as number) ?? 0,
          status: (c.status as string) ?? 'PENDING',
          generatedContent: (c.generatedContent as string) ?? null,
          imageUrl: (c.imageUrl as string) ?? null,
          imageSource: (c.imageSource as string) ?? null,
          videoUrl: (c.videoUrl as string) ?? null,
          visualBrief: (c.visualBrief as string) ?? null,
          aiModel: (c.aiModel as string) ?? null,
          promptUsed: (c.promptUsed as string) ?? null,
          cascadingContext: (c.cascadingContext as string) ?? null,
          rating: (c.rating as number) ?? null,
          feedbackText: (c.feedbackText as string) ?? null,
          personaReactions: null,
          generatedAt: (c.generatedAt as string) ?? null,
          approvedAt: (c.approvedAt as string) ?? null,
          version: (c.version as number) ?? 1,
          label: (c.label as string) ?? (c.componentType as string) ?? 'Component',
        }),
      );
      initializePipeline(deliverableId, components, 'INITIALIZED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize pipeline');
    } finally {
      setIsInitializing(false);
    }
  }, [deliverableId, initializePipeline, setIsInitializing, setError]);

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
      <div className={`flex flex-col h-screen ${STUDIO.canvas.bg}`}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton width={28} height={28} className="rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton width={180} height={18} />
              <Skeleton width={120} height={12} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton width={80} height={32} className="rounded-lg" />
            <Skeleton width={80} height={32} className="rounded-lg" />
          </div>
        </div>
        {/* 3-column skeleton */}
        <div className="flex flex-1 overflow-hidden">
          <div className={`${STUDIO.panel.left} flex-shrink-0 border-r border-gray-200 bg-white p-4 space-y-4`}>
            <Skeleton height={20} width={100} />
            <Skeleton height={80} />
            <Skeleton height={36} />
          </div>
          <div className="flex-1 p-8">
            <Skeleton height={400} className="rounded-lg" />
          </div>
          <div className={`${STUDIO.panel.right} flex-shrink-0 border-l border-gray-200 bg-white p-4 space-y-4`}>
            <Skeleton height={20} width={100} />
            <Skeleton height={120} className="rounded-lg" />
            <Skeleton height={80} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Brief Review Mode ──────────────────────────────────────
  if (pipelineStatus === 'BRIEF_REVIEW') {
    return (
      <BriefReviewScreen
        deliverableId={deliverableId}
        campaignId={campaignId}
        onStartPipeline={handleInitializePipeline}
        onBack={onBack}
      />
    );
  }

  // ─── Pipeline Mode (INITIALIZED / IN_PROGRESS / REVIEW / COMPLETE) ──
  if (pipelineStatus !== 'LEGACY') {
    return (
      <div data-testid="content-studio" className={`flex flex-col h-screen ${STUDIO.canvas.bg}`}>
        {/* Header */}
        <StudioHeader
          title={studio.title}
          contentType={studio.contentType}
          campaignTitle={studio.campaignTitle}
          contentTab={activeTab}
          deliverableId={deliverableId}
          lastSavedAt={lastSavedAt}
          isPreviewMode={false}
          onBack={onBack}
          onTogglePreview={() => {}}
          onDelete={() => setShowDeleteConfirm(true)}
        />

        {/* Pipeline 3-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Pipeline Navigator */}
          <div className={`${STUDIO.panel.left} flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto`}>
            <PipelineNavigator />
          </div>

          {/* Center: Component Canvas */}
          <div className="flex-1 overflow-hidden">
            <ComponentCanvas />
          </div>

          {/* Right: Component Review Panel */}
          <div className={`${STUDIO.panel.right} flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto`}>
            <ComponentReviewPanel />
          </div>
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

  // ─── Legacy Mode ──────────────────────────────────────────
  return (
    <div data-testid="content-studio" className={`flex flex-col h-screen ${STUDIO.canvas.bg}`}>
      {/* Header */}
      <StudioHeader
        title={studio.title}
        contentType={studio.contentType}
        campaignTitle={studio.campaignTitle}
        contentTab={activeTab}
        deliverableId={deliverableId}
        lastSavedAt={lastSavedAt}
        isPreviewMode={isPreviewMode}
        onBack={onBack}
        onTogglePreview={() => useContentStudioStore.getState().setIsPreviewMode(!isPreviewMode)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Content Type Tabs — with Start Pipeline button */}
      <div className="flex items-center justify-between bg-white">
        <ContentTypeTabs
          activeTab={activeTab}
          isTabLocked={isTabLocked}
          onTabChange={(tab) => {
            const s = useContentStudioStore.getState();
            s.setActiveTab(tab);
            s.setAiModel(getDefaultModel(tab));
          }}
        />
        {canUsePipeline && (
          <div className="pr-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartPipeline}
              disabled={isInitializing}
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Start Component Pipeline
            </Button>
          </div>
        )}
      </div>

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
