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
  const { generate, isGenerating } = useCanvasOrchestration(generatedDeliverableId);

  const launchStartedRef = useRef(false);
  const generateStartedRef = useRef(false);

  // ─── Canvas store subscriptions ────────────────────────────
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const globalErrorMessage = useCanvasStore((s) => s.globalErrorMessage);
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
  //
  // Uses `mutateAsync()` + await so success/error handling runs inline
  // with the promise resolution, NOT via React Query mutation state
  // propagation or per-call callbacks. This is the only path that's
  // resilient to React 19 StrictMode double-invoke: the awaited promise
  // chain continues on the event loop regardless of which component
  // instance is mounted, and all state updates go through Zustand
  // (getState()) which is global and not tied to any React lifecycle.
  const handleLaunch = useCallback(async () => {
    if (launchStartedRef.current) return;
    launchStartedRef.current = true;

    const store = useCampaignWizardStore.getState();
    store.setContentGenPhase('launching');

    // Reset canvas store for clean slate
    useCanvasStore.getState().reset();

    // Content mode sends a MINIMAL launch body:
    // - No strategy/blueprint (server would try to create N deliverables
    //   from assetPlan.deliverables, but we want exactly ONE).
    // - deliverables: [{ type: selectedContentType }] forces the server
    //   fallback path to create a single deliverable of the right type.
    // - draftCampaignId promotes the existing DRAFT in place so no
    //   orphaned draft is left behind.
    const draftCampaignId = store.draftCampaignId ?? undefined;

    try {
      const result = await launchCampaign.mutateAsync({
        name: store.name || 'Untitled Content',
        description: store.description,
        type: 'CONTENT',
        goalType: store.campaignGoalType ?? 'CONTENT_MARKETING',
        startDate: store.startDate || undefined,
        endDate: store.endDate || undefined,
        knowledgeIds: store.selectedKnowledgeIds,
        deliverables: [{ type: store.selectedContentType!, quantity: 1 }],
        saveAsTemplate: false,
        briefing: {
          occasion: store.briefingOccasion || undefined,
          audienceObjective: store.briefingAudienceObjective || undefined,
          coreMessage: store.briefingCoreMessage || undefined,
          tonePreference: store.briefingTonePreference || undefined,
          constraints: store.briefingConstraints || undefined,
        },
        draftCampaignId,
      });

      // Write results directly to Zustand store. getState() works even
      // if the originating component has unmounted — the store is global.
      const s = useCampaignWizardStore.getState();
      if (result.firstDeliverableId) {
        s.setGeneratedIds(result.campaignId, result.firstDeliverableId);
        // Draft has been promoted to an ACTIVE campaign; clear the local
        // draft link so the auto-save loop won't PATCH a row that's no
        // longer in DRAFT status.
        s.setDraftCampaignId(null);
      } else {
        console.error('[ContentGenerateStep] Launch returned no deliverable ID', result);
        s.setContentGenPhase('error');
        useCanvasStore.getState().setGlobalStatus(
          'error',
          'Launch succeeded but no deliverable was created. Please try again.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown launch error';
      console.error('[ContentGenerateStep] Launch failed:', error);
      useCampaignWizardStore.getState().setContentGenPhase('error');
      useCanvasStore.getState().setGlobalStatus('error', message);
      launchStartedRef.current = false;
    }
  }, [launchCampaign]);

  // Auto-launch on mount when idle.
  //
  // Defensive reset: generatedCampaignId/generatedDeliverableId are persisted
  // to localStorage, so a previous content session can leave stale values
  // around. If we enter the step in 'idle' phase, we're starting fresh — wipe
  // them before the launch so Phase 2's auto-generate doesn't fire against
  // a dead deliverable.
  useEffect(() => {
    if (contentGenPhase === 'idle') {
      const store = useCampaignWizardStore.getState();
      if (store.generatedCampaignId || store.generatedDeliverableId) {
        store.setGeneratedIds('', '');
        // setGeneratedIds sets both fields; using '' is equivalent to clearing
        // for our null-check gates in Phase 2. Follow up with a true null set
        // via direct state for cleanliness.
        useCampaignWizardStore.setState({
          generatedCampaignId: null,
          generatedDeliverableId: null,
        });
      }
      handleLaunch();
    }
  }, [contentGenPhase, handleLaunch]);

  // ─── Phase 2: Auto-generate content when deliverable is ready ─
  //
  // Fires exactly once when generatedDeliverableId transitions from null
  // to a real id. Deliberately does NOT depend on contentGenPhase or
  // generate — including either would re-run the effect when they change
  // and the previous run's cleanup would clear any pending timer. The
  // ref guard handles the re-run protection.
  //
  // The 100ms setTimeout is gone for the same reason: it was getting
  // cancelled by the effect's own cleanup before it could fire. Instead,
  // we read `generate` fresh off a ref that's always up to date with the
  // latest useCanvasOrchestration callback and call it synchronously.
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  useEffect(() => {
    if (!generatedDeliverableId || generateStartedRef.current) return;
    generateStartedRef.current = true;
    setContentGenPhase('generating');
    // Call via ref so we get the freshest generate callback (bound to
    // the latest deliverableId) without adding `generate` to the deps.
    generateRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedDeliverableId]);

  // Watch canvas globalStatus to update wizard phase
  useEffect(() => {
    if (globalStatus === 'complete' && contentGenPhase === 'generating') {
      setContentGenPhase('complete');
    }
    if (globalStatus === 'error' && contentGenPhase === 'generating') {
      setContentGenPhase('error');
    }
  }, [globalStatus, contentGenPhase, setContentGenPhase]);

  // NOTE: Unmount abort intentionally removed.
  //
  // Previous versions of this component aborted the canvas orchestration
  // on unmount to free the SSE connection. In React 19 dev StrictMode the
  // synthetic mount → unmount → remount cycle caused the deferred abort
  // scheduled by mount A's cleanup to fire AFTER mount B had already
  // started a fresh orchestration — cancelling B's in-flight fetch and
  // surfacing as "Content generation failed — Request was aborted" on the
  // server (Claude SDK throws AbortError when the HTTP connection closes).
  //
  // The cost of NOT aborting on unmount: if the user navigates away
  // mid-generation, the SSE stream continues server-side until it
  // completes naturally. That's a few extra seconds of server work in an
  // edge case, which is acceptable. The user's selected variant still
  // lands in the deliverable row, so no work is lost.

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
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Generating {selectedContentType?.replace(/-/g, ' ') ?? 'content'} variants...</p>
          <p className="text-xs text-gray-400 mt-1">This may take 15-30 seconds</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error state ───────────────────────────────────
  if (contentGenPhase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-gray-900">Content generation failed</p>
        {globalErrorMessage && (
          <p className="text-sm text-red-600 max-w-md text-center">{globalErrorMessage}</p>
        )}
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

      {/* Note: image generation is no longer part of the content wizard.
          Users select or generate images explicitly in Step 3 (Medium) of
          the Content Canvas after opening it via "Open in Canvas". */}
    </div>
  );
}
