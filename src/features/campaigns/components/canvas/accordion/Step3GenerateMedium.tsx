'use client';

import React, { useMemo, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { detectMediumCategory } from '../../../constants/medium-config-registry';
import { VideoConfigPanel } from '../medium/VideoConfigPanel';
import { GenericConfigPanel } from '../medium/GenericConfigPanel';
import { MediumConfigLayout } from '../medium/MediumConfigLayout';
import { VIDEO_ADJACENT_TYPES } from '../../../lib/deliverable-types';

interface Step3GenerateMediumProps {
  onAdvance: () => void;
  deliverableId?: string;
}

/**
 * Step 3 orchestrator: routes to VideoConfigPanel or GenericConfigPanel
 * based on detected category. When platform/format/category can't be
 * resolved (e.g. context stack missing the medium block), we still render
 * the preview + Confirm via an empty MediumConfigLayout so the user can
 * advance — most categories have empty Step 3 sections after the 9.0c
 * content-styling migration anyway.
 */
export function Step3GenerateMedium({ onAdvance, deliverableId }: Step3GenerateMediumProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const contentType = useCanvasStore((s) => s.contentType);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  const category = useMemo(() => {
    // 2026-05-19 — contentType fallback when MediumEnrichment row is
    // missing (e.g. linkedin/video-ad isn't seeded). Without this Step 3
    // for video-script types fell back to the empty-config branch and
    // VideoConfigPanel / VideoSceneEditor never mounted → auto-kick
    // didn't fire → no scene videos rendered.
    if (!platform || !format) {
      if (contentType && VIDEO_ADJACENT_TYPES.has(contentType)) return 'video';
      return null;
    }
    return detectMediumCategory(platform, format);
  }, [platform, format, contentType]);

  // Sync category to store
  useEffect(() => {
    useCanvasStore.getState().setMediumCategory(category);
  }, [category]);

  if (category === 'video') {
    return <VideoConfigPanel onAdvance={onAdvance} deliverableId={deliverableId} />;
  }

  if (!platform || !format || !category) {
    // Fallback: render preview + Confirm without any config fields.
    // No category match usually means this content type doesn't have
    // platform-rendering knobs (post-migration). The user just confirms.
    return (
      <MediumConfigLayout onAdvance={onAdvance} deliverableId={deliverableId}>
        {/* No config sections — Step 3 is a confirm step for this type.
            Empty fragment satisfies the required children prop. */}
        <></>
      </MediumConfigLayout>
    );
  }

  return <GenericConfigPanel category={category} onAdvance={onAdvance} deliverableId={deliverableId} />;
}
