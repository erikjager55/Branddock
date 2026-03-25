'use client';

import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCampaignStore } from '../../stores/useCampaignStore';
import { useCanvasComponents } from '../../hooks/canvas.hooks';
import { useCanvasOrchestration } from '../../hooks/useCanvasOrchestration';
import { ContextPanel } from './ContextPanel';
import { VariantWorkspace } from './VariantWorkspace';
import { FeedbackBar } from './FeedbackBar';
import { PreviewPanel } from './PreviewPanel';
import { ApprovalActionBar } from './ApprovalActionBar';
import { DerivePlatformSelectorModal } from './DerivePlatformSelectorModal';
import { CanvasContextSelector } from './CanvasContextSelector';
import { Skeleton, SkeletonCard } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import { ArrowLeft } from 'lucide-react';
import type { ApprovalStatus } from '../../types/canvas.types';

interface CanvasPageProps {
  deliverableId: string;
  campaignId: string;
  onNavigate: (section: string) => void;
}

export function CanvasPage({ deliverableId, campaignId, onNavigate }: CanvasPageProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const globalStatus = useCanvasStore((s) => s.globalStatus);

  const [showDeriveModal, setShowDeriveModal] = useState(false);

  const { data: existingComponents, isLoading: componentsLoading } = useCanvasComponents(deliverableId);
  const { generate, regenerate, isGenerating, abort } = useCanvasOrchestration(deliverableId);

  // Set deliverable in store on mount + load approval state + load context
  useEffect(() => {
    useCanvasStore.getState().setDeliverable(deliverableId, 'canvas');

    const controller = new AbortController();

    // Fetch approval state from studio endpoint
    fetch(`/api/studio/${deliverableId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.deliverable) return;
        const d = data.deliverable;
        useCanvasStore.getState().setApprovalState({
          approvalStatus: (d.approvalStatus ?? 'DRAFT') as ApprovalStatus,
          approvalNote: d.approvalNote ?? null,
          approvedBy: d.approvedBy ?? null,
          approvedAt: d.approvedAt ?? null,
          publishedAt: d.publishedAt ?? null,
        });
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        // Non-critical — approval state defaults to DRAFT
      });

    // Load context stack immediately (without triggering content generation)
    fetch(`/api/studio/${deliverableId}/context`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.contextStack) return;
        // Only set if no context was loaded yet (orchestrator may have beaten us)
        if (!useCanvasStore.getState().contextStack) {
          useCanvasStore.getState().setContextStack(data.contextStack);
        }
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        // Non-critical — context will still load when Generate is clicked
      });

    return () => {
      controller.abort();
      useCanvasStore.getState().reset();
    };
  }, [deliverableId]);

  // Load existing components into variant groups on fetch (only if store is empty)
  useEffect(() => {
    if (!existingComponents || existingComponents.length === 0) return;
    const storeState = useCanvasStore.getState();
    if (storeState.variantGroups.size > 0) return;

    const groups = new Map<string, typeof existingComponents>();
    for (const comp of existingComponents) {
      if (!comp.variantGroup) continue;
      const existing = groups.get(comp.variantGroup) ?? [];
      existing.push(comp);
      groups.set(comp.variantGroup, existing);
    }

    for (const [group, components] of groups) {
      const variants = components.map((c, i) => ({
        index: c.variantIndex ?? i,
        content: c.generatedContent ?? '',
        tone: undefined,
        isSelected: c.isSelected,
      }));
      storeState.addVariantGroup(group, variants);
    }
  }, [existingComponents]);

  const handleBack = () => {
    onNavigate('campaign-detail');
  };

  if (componentsLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-5 w-48" />
        </div>
        {/* Skeleton 3-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          <div className={`${STUDIO.panel.left} flex-shrink-0 border-r border-gray-200 p-4`}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className={`flex-1 ${STUDIO.canvas.bg} p-6`}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className={`${STUDIO.panel.right} flex-shrink-0 border-l border-gray-200 p-4`}>
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
          aria-label="Back to campaign detail"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Content Canvas</h1>
        {isGenerating && (
          <span className="text-sm text-teal-600 animate-pulse">Generating...</span>
        )}
        {globalStatus === 'complete' && (
          <span className="text-sm text-emerald-600">Generation complete</span>
        )}
        {globalStatus === 'error' && (
          <span className="text-sm text-red-500">Generation failed</span>
        )}

        <div className="ml-auto">
          <ApprovalActionBar
            deliverableId={deliverableId}
            onDeriveClick={() => setShowDeriveModal(true)}
          />
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Context panel */}
        <ContextPanel />

        {/* Center: Variant workspace + feedback bar */}
        <div className={`flex-1 flex flex-col ${STUDIO.canvas.bg} overflow-hidden`}>
          <VariantWorkspace
            deliverableId={deliverableId}
            onGenerate={() => generate()}
          />
          <FeedbackBar onRegenerate={regenerate} onAbort={abort} />
        </div>

        {/* Right: Preview panel */}
        <PreviewPanel />
      </div>

      {/* Knowledge context selector modal */}
      <CanvasContextSelector />

      {/* Derive platform selector modal */}
      <DerivePlatformSelectorModal
        isOpen={showDeriveModal}
        onClose={() => setShowDeriveModal(false)}
        deliverableId={deliverableId}
        onDerived={(newId) => {
          // Navigate to the new derived deliverable's canvas
          useCanvasStore.getState().reset();
          useCanvasStore.getState().setDeliverable(newId, 'canvas');
          useCampaignStore.getState().setSelectedDeliverableId(newId);
          onNavigate('content-canvas');
        }}
      />
    </div>
  );
}
