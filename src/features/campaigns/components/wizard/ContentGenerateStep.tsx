"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useCanvasStore } from "../../stores/useCanvasStore";
import { useCanvasOrchestration } from "../../hooks/useCanvasOrchestration";
import { useLaunchCampaign } from "../../hooks";
import { VariantCard } from "../canvas/VariantCard";
import type { CanvasVariant } from "../../types/canvas.types";

/**
 * Content Generation Step — final step in content mode wizard.
 *
 * Flow:
 * 1. Auto-create campaign + deliverable (via launch API)
 * 2. Auto-trigger content generation (via canvas orchestrator SSE)
 * 3. Show 3 text variants for selection + inline editing
 * 4. Continue button opens content canvas for further refinement
 */
export function ContentGenerateStep() {
  const contentGenPhase = useCampaignWizardStore((s) => s.contentGenPhase);
  const generatedDeliverableId = useCampaignWizardStore((s) => s.generatedDeliverableId);
  const setContentGenPhase = useCampaignWizardStore((s) => s.setContentGenPhase);
  const setGeneratedIds = useCampaignWizardStore((s) => s.setGeneratedIds);
  const setHasSelectedVariant = useCampaignWizardStore((s) => s.setHasSelectedVariant);
  const selectedContentType = useCampaignWizardStore((s) => s.selectedContentType);

  const launchCampaign = useLaunchCampaign();
  const { generate, isGenerating, abort } = useCanvasOrchestration(generatedDeliverableId);

  const launchStartedRef = useRef(false);
  const generateStartedRef = useRef(false);

  // ─── Canvas store subscriptions ────────────────────────────
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const selections = useCanvasStore((s) => s.selections);

  // Find the first text variant group
  const firstGroupKey = variantGroups.size > 0 ? Array.from(variantGroups.keys())[0] : null;
  const variants: CanvasVariant[] = firstGroupKey ? (variantGroups.get(firstGroupKey) ?? []) : [];
  const selectedIndex = firstGroupKey ? (selections.get(firstGroupKey) ?? 0) : 0;

  // Sync variant selection to wizard store for canProceed gating
  useEffect(() => {
    const hasVariants = variants.length > 0;
    setHasSelectedVariant(hasVariants);
  }, [variants.length, setHasSelectedVariant]);

  // ─── Phase 1: Auto-launch campaign + deliverable ───────────
  const handleLaunch = useCallback(() => {
    if (launchStartedRef.current) return;
    launchStartedRef.current = true;

    const store = useCampaignWizardStore.getState();
    setContentGenPhase('launching');

    // Reset canvas store for clean slate
    useCanvasStore.getState().reset();

    launchCampaign.mutate(
      {
        name: store.name || 'Untitled Content',
        description: store.description,
        type: 'CONTENT',
        goalType: store.campaignGoalType ?? 'CONTENT_MARKETING',
        startDate: store.startDate || undefined,
        endDate: store.endDate || undefined,
        knowledgeIds: store.selectedKnowledgeIds,
        strategy: store.blueprintResult ?? undefined,
        deliverables: [{ type: store.selectedContentType!, quantity: 1 }],
        saveAsTemplate: false,
      },
      {
        onSuccess: (result) => {
          if (result.firstDeliverableId) {
            setGeneratedIds(result.campaignId, result.firstDeliverableId);
          } else {
            console.error('[ContentGenerateStep] No deliverable ID returned');
            setContentGenPhase('error');
          }
        },
        onError: () => {
          setContentGenPhase('error');
          launchStartedRef.current = false;
        },
      },
    );
  }, [launchCampaign, setContentGenPhase, setGeneratedIds]);

  // Auto-launch on mount when idle
  useEffect(() => {
    if (contentGenPhase === 'idle') {
      handleLaunch();
    }
  }, [contentGenPhase, handleLaunch]);

  // ─── Phase 2: Auto-generate content when deliverable is ready ─
  useEffect(() => {
    if (!generatedDeliverableId || generateStartedRef.current) return;
    if (contentGenPhase === 'error' || contentGenPhase === 'complete') return;

    generateStartedRef.current = true;
    setContentGenPhase('generating');

    // Small delay to ensure hook has picked up the new deliverableId
    const timer = setTimeout(() => {
      generate();
    }, 100);

    return () => clearTimeout(timer);
  }, [generatedDeliverableId, contentGenPhase, setContentGenPhase, generate]);

  // Watch canvas globalStatus to update wizard phase
  useEffect(() => {
    if (globalStatus === 'complete' && contentGenPhase === 'generating') {
      setContentGenPhase('complete');
    }
    if (globalStatus === 'error' && contentGenPhase === 'generating') {
      setContentGenPhase('error');
    }
  }, [globalStatus, contentGenPhase, setContentGenPhase]);

  // Cleanup: abort generation on unmount (deferred for React 19 double-invoke)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    return () => {
      timer = setTimeout(() => {
        abort();
      }, 50);
      // Note: timer cleanup happens naturally when component re-mounts in dev strict mode
    };
  }, [abort]);

  // ─── Retry handler ──────────────────────────────────────────
  const handleRetry = () => {
    launchStartedRef.current = false;
    generateStartedRef.current = false;
    useCanvasStore.getState().reset();
    setContentGenPhase('idle');
  };

  // ─── Render: Launching state ───────────────────────────────
  if (contentGenPhase === 'idle' || contentGenPhase === 'launching') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-gray-500">Creating your content workspace...</p>
      </div>
    );
  }

  // ─── Render: Generating state ──────────────────────────────
  if (contentGenPhase === 'generating' && variants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <Sparkles className="h-8 w-8 text-primary" />
          <Loader2 className="h-4 w-4 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm text-gray-500">Generating {selectedContentType?.replace(/-/g, ' ') ?? 'content'} variants...</p>
        <p className="text-xs text-gray-400">This may take 15-30 seconds</p>
      </div>
    );
  }

  // ─── Render: Error state ───────────────────────────────────
  if (contentGenPhase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-gray-700">Content generation failed</p>
        <Button variant="secondary" icon={RefreshCw} onClick={handleRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  // ─── Render: Variants ready ────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Choose your {selectedContentType?.replace(/-/g, ' ') ?? 'content'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Select the variant you prefer. You can edit it inline, or continue to the Content Canvas to refine later.
        </p>
      </div>

      {/* Generating indicator while still streaming additional variants */}
      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating more variants...
        </div>
      )}

      {/* Variant cards */}
      <div className="space-y-4">
        {firstGroupKey && variants.map((variant, idx) => (
          <VariantCard
            key={`${firstGroupKey}-${idx}`}
            group={firstGroupKey}
            variant={variant}
            variantIndex={idx}
            isSelected={idx === selectedIndex}
            deliverableId={generatedDeliverableId ?? undefined}
          />
        ))}
      </div>

      {/* Image variants if any */}
      {useCanvasStore.getState().imageVariants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Generated Images</h3>
          <div className="grid grid-cols-3 gap-3">
            {useCanvasStore.getState().imageVariants.map((img, idx) => (
              <div
                key={idx}
                className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                  img.isSelected ? 'border-primary-500' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  const store = useCanvasStore.getState();
                  const updated = store.imageVariants.map((v, i) => ({
                    ...v,
                    isSelected: i === idx,
                  }));
                  store.setImageVariants(updated);
                }}
              >
                <img
                  src={img.url}
                  alt={`Generated image ${idx + 1}`}
                  className="w-full aspect-square object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
