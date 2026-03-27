'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { resolvePreviewComponent } from '../previews/preview-map';
import { Badge, Skeleton } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import { Loader2, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';

interface Step3GenerateMediumProps {
  deliverableId: string;
  onAdvance: () => void;
}

export function Step3GenerateMedium({ deliverableId, onAdvance }: Step3GenerateMediumProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const mediumStatus = useCanvasStore((s) => s.mediumGenerationStatus);
  const mediumApproved = useCanvasStore((s) => s.mediumApproved);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  // Resolve the preview component for this platform
  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  // Build preview content from selected variants
  const previewContent = useMemo<PreviewContent>(() => {
    const content: PreviewContent = {};
    for (const [group, variants] of variantGroups) {
      const selectedIdx = selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (selected) {
        content[group] = {
          content: selected.content,
          type: 'text',
        };
      }
    }
    return content;
  }, [variantGroups, selections]);

  const isGenerating = mediumStatus === 'generating';

  const generationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = useRef(false);

  // Cleanup generation timer on unmount; reset store if still generating
  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
        generationTimerRef.current = null;
        useCanvasStore.getState().setMediumGenerationStatus('idle');
      }
    };
  }, []);

  const handleGenerateMedium = useCallback(() => {
    // Clear any previous timer to prevent orphaned callbacks
    if (generationTimerRef.current) {
      clearTimeout(generationTimerRef.current);
    }

    const store = useCanvasStore.getState();
    store.setMediumGenerationStatus('generating');

    // Simulate medium generation (in production this would call an API)
    generationTimerRef.current = setTimeout(() => {
      generationTimerRef.current = null;
      useCanvasStore.getState().setMediumGenerationStatus('complete');
    }, 1500);
  }, []);

  const handleApprove = useCallback(() => {
    const store = useCanvasStore.getState();
    store.setMediumApproved(true);

    const label = previewEntry.label ?? 'Medium';
    store.setStepSummary(3, {
      label: `${label} generated | Approved`,
    });

    onAdvance();
  }, [onAdvance, previewEntry.label]);

  const PreviewComponent = previewEntry.component;
  const hasContent = Object.keys(previewContent).length > 0;

  // Reset auto-start guard when status returns to idle (e.g. revisiting step)
  useEffect(() => {
    if (mediumStatus === 'idle') {
      autoStartedRef.current = false;
    }
  }, [mediumStatus]);

  // Auto-generate medium on mount if not yet generated
  useEffect(() => {
    if (mediumStatus === 'idle' && hasContent && !autoStartedRef.current) {
      autoStartedRef.current = true;
      handleGenerateMedium();
    }
  }, [mediumStatus, hasContent, handleGenerateMedium]);

  if (!hasContent) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          Select content variants in step 2 first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isGenerating && (
          <>
            <Loader2 className="h-4 w-4 text-teal-600 animate-spin" />
            <span className="text-sm text-teal-600">Generating {previewEntry.label}...</span>
          </>
        )}
        {mediumStatus === 'complete' && !mediumApproved && (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-600">{previewEntry.label} ready for review</span>
          </>
        )}
        {mediumApproved && (
          <Badge variant="success" size="sm">Approved</Badge>
        )}
      </div>

      {/* Preview rendering */}
      {isGenerating ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4 overflow-hidden">
          <PreviewComponent
            previewContent={previewContent}
            imageVariants={imageVariants}
            isGenerating={false}
          />
        </div>
      )}

      {/* Feedback + regenerate */}
      {mediumStatus === 'complete' && !mediumApproved && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateMedium}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve & Continue
          </button>
        </div>
      )}

      {/* Already approved — show advance */}
      {mediumApproved && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAdvance}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
          >
            <ArrowRight className="h-4 w-4" />
            Continue to Timeline
          </button>
        </div>
      )}
    </div>
  );
}
