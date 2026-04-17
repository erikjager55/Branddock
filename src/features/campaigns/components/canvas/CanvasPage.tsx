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
import { getDefaultVideoConfig, VIDEO_ADJACENT_TYPES } from '../../lib/deliverable-types';
import { detectMediumCategory } from '../../constants/medium-config-registry';

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

    // Fetch deliverable detail — approval state + real contentType
    fetch(`/api/studio/${deliverableId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.deliverable) return;
        const d = data.deliverable;
        // Update store with the real contentType (initial 'canvas' is a placeholder)
        if (d.contentType) {
          useCanvasStore.getState().setDeliverable(deliverableId, d.contentType);
          // Auto-set video provider config defaults for video-adjacent types
          if (VIDEO_ADJACENT_TYPES.has(d.contentType)) {
            useCanvasStore.getState().setVideoProviderConfig(getDefaultVideoConfig(d.contentType));
          }
        }
        useCanvasStore.getState().setApprovalState({
          approvalStatus: (d.approvalStatus ?? 'DRAFT') as ApprovalStatus,
          approvalNote: d.approvalNote ?? null,
          approvedBy: d.approvedBy ?? null,
          approvedAt: d.approvedAt ?? null,
          publishedAt: d.publishedAt ?? null,
        });
        // Sync scheduledPublishDate from DB → Canvas store (calendar may have set it)
        if (d.scheduledPublishDate) {
          const sd = new Date(d.scheduledPublishDate);
          const yyyy = sd.getFullYear();
          const mm = String(sd.getMonth() + 1).padStart(2, '0');
          const dd = String(sd.getDate()).padStart(2, '0');
          const hh = String(sd.getHours()).padStart(2, '0');
          const min = String(sd.getMinutes()).padStart(2, '0');
          useCanvasStore.getState().setScheduledDate(`${yyyy}-${mm}-${dd}`);
          useCanvasStore.getState().setScheduledTime(`${hh}:${min}`);
        }
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
  //
  // Hero image (variantGroup === 'hero-image') is treated separately and
  // populates canvasStore.heroImage instead of variantGroups, since it's
  // a single image not a text variant group.
  useEffect(() => {
    if (!existingComponents || existingComponents.length === 0) return;
    const storeState = useCanvasStore.getState();

    // Hero image — always reload (even if heroImage is already set, the
    // server is the source of truth on mount).
    const heroComp = existingComponents.find(
      (c) => c.variantGroup === 'hero-image' && c.imageUrl,
    );
    if (heroComp?.imageUrl) {
      // imageSource is stored as "<source>:<mediaAssetId>" or just "<source>"
      const sourceTag = heroComp.imageSource ?? '';
      const colonIdx = sourceTag.indexOf(':');
      const mediaAssetId = colonIdx >= 0 ? sourceTag.slice(colonIdx + 1) : null;
      storeState.setHeroImage({
        url: heroComp.imageUrl,
        mediaAssetId: mediaAssetId || null,
        alt: heroComp.visualBrief ?? undefined,
      });
    } else if (storeState.heroImage) {
      // Server has no hero image — clear any stale local state from a
      // previous deliverable in the same canvas store.
      storeState.setHeroImage(null);
    }

    // Text variants — only load if store is empty (avoid clobbering an
    // in-flight orchestration).
    if (storeState.variantGroups.size > 0) return;

    const groups = new Map<string, typeof existingComponents>();
    for (const comp of existingComponents) {
      // Skip the hero image — handled above
      if (!comp.variantGroup || comp.variantGroup === 'hero-image') continue;
      const existing = groups.get(comp.variantGroup) ?? [];
      existing.push(comp);
      groups.set(comp.variantGroup, existing);
    }

    for (const [group, components] of groups) {
      const variants = components.map((c, i) => {
        let cta: string | undefined;
        if (c.visualBrief) {
          try { cta = JSON.parse(c.visualBrief)?.cta; } catch { /* ignore */ }
        }
        return {
          index: c.variantIndex ?? i,
          content: c.generatedContent ?? '',
          tone: undefined,
          cta,
          isSelected: c.isSelected,
          componentId: c.id,
        };
      });
      storeState.addVariantGroup(group, variants);
    }

    // Hydrate composed video from existing component
    const videoComp = existingComponents.find(
      (c) => c.variantGroup === 'final-video' && c.videoUrl,
    );
    if (videoComp?.videoUrl) {
      storeState.setComposedVideo(videoComp.videoUrl);
    }

    // Content already exists — jump straight to step 2 so the user sees
    // their variants instead of a regeneration prompt.
    if (groups.size > 0 && storeState.activeStep === 'context') {
      // Auto-advance past context if content already exists
      const nextStep = storeState.mediumCategory === 'video' ? 'script' : 'variants';
      storeState.advanceToStep(nextStep);
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
