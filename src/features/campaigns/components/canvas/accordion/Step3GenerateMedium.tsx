'use client';

import React, { useMemo, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { detectMediumCategory } from '../../../constants/medium-config-registry';
import { VideoConfigPanel } from '../medium/VideoConfigPanel';
import { GenericConfigPanel } from '../medium/GenericConfigPanel';
import { MediumConfigLayout } from '../medium/MediumConfigLayout';

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

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  const category = useMemo(
    () => (platform && format) ? detectMediumCategory(platform, format) : null,
    [platform, format],
  );

  // Sync category to store
  useEffect(() => {
    useCanvasStore.getState().setMediumCategory(category);
  }, [category]);

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

  if (category === 'video') {
    return <VideoConfigPanel onAdvance={onAdvance} deliverableId={deliverableId} />;
  }

  return <GenericConfigPanel category={category} onAdvance={onAdvance} deliverableId={deliverableId} />;
}
