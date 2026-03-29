'use client';

import React, { useMemo, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { detectMediumCategory } from '../../../constants/medium-config-registry';
import { VideoConfigPanel } from '../medium/VideoConfigPanel';
import { GenericConfigPanel } from '../medium/GenericConfigPanel';

interface Step3GenerateMediumProps {
  onAdvance: () => void;
  deliverableId?: string;
}

/** Step 3 orchestrator: routes to VideoConfigPanel or GenericConfigPanel based on detected category */
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
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          No medium configured for this deliverable.
        </p>
      </div>
    );
  }

  if (category === 'video') {
    return <VideoConfigPanel onAdvance={onAdvance} deliverableId={deliverableId} />;
  }

  return <GenericConfigPanel category={category} onAdvance={onAdvance} deliverableId={deliverableId} />;
}
