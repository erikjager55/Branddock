'use client';

import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCampaignStore } from '../../stores/useCampaignStore';
import { useCanvasComponents } from '../../hooks/canvas.hooks';
import { ApprovalActionBar } from './ApprovalActionBar';
import { HorizontalAccordion } from './accordion/HorizontalAccordion';
import { DerivePlatformSelectorModal } from './DerivePlatformSelectorModal';
import { CanvasContextSelector } from './CanvasContextSelector';
import { InsertImageModal } from './InsertImageModal';
import { Skeleton } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import { ArrowLeft } from 'lucide-react';
import type { ApprovalStatus } from '../../types/canvas.types';

interface CanvasPageProps {
  deliverableId: string;
  campaignId: string;
  onNavigate: (section: string) => void;
}

export function CanvasPage({ deliverableId, campaignId, onNavigate }: CanvasPageProps) {
  const globalStatus = useCanvasStore((s) => s.globalStatus);

  const [showDeriveModal, setShowDeriveModal] = useState(false);

  const { data: existingComponents, isLoading: componentsLoading } = useCanvasComponents(deliverableId);

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

  // Load existing components into variant groups on fetch (only if store is empty).
  // If components exist, we also auto-advance to step 2 so the user lands on
  // the existing content review instead of the "Generate Content" button —
  // which would otherwise look like the generation still needs to happen.
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

    // Content already exists — jump straight to step 2 so the user sees
    // their variants instead of a regeneration prompt.
    if (groups.size > 0 && storeState.activeStep === 1) {
      storeState.advanceToStep(2);
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
        {/* Skeleton horizontal accordion */}
        <div className={`flex-1 ${STUDIO.canvas.bg} overflow-hidden flex`}>
          {/* Skeleton vertical tabs */}
          <div className="flex flex-shrink-0 border-r border-gray-200">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 flex flex-col items-center py-6 gap-4 bg-gray-100">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-20 w-3 rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton content panel */}
          <div className="flex-1 p-8">
            <div className="flex items-center gap-3 mb-8">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
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
        {globalStatus === 'generating' && (
          <span className="text-sm text-primary animate-pulse">Generating...</span>
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

      {/* Accordion layout */}
      <div className={`flex-1 ${STUDIO.canvas.bg} overflow-hidden`}>
        <HorizontalAccordion deliverableId={deliverableId} />
      </div>

      {/* Knowledge context selector modal */}
      <CanvasContextSelector />

      {/* Insert image modal (Step 3 hero image picker) */}
      <InsertImageModal />

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
