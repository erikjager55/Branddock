"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useCanvasStore } from "../../stores/useCanvasStore";
import { useLaunchCampaign } from "../../hooks";

/**
 * Content Launch Step — final step in content mode wizard.
 *
 * Creates the campaign + deliverable via the launch API, then shows a
 * success state with an "Open in Canvas" CTA. Content generation itself
 * happens in the Canvas (Step 1 → "Generate Content" button) so the user
 * can review context and briefing sources before committing to an AI call.
 */
export function ContentGenerateStep() {
  const contentGenPhase = useCampaignWizardStore((s) => s.contentGenPhase);
  const setContentGenPhase = useCampaignWizardStore((s) => s.setContentGenPhase);
  const selectedContentType = useCampaignWizardStore((s) => s.selectedContentType);
  const globalErrorMessage = useCanvasStore((s) => s.globalErrorMessage);

  const launchCampaign = useLaunchCampaign();
  const launchStartedRef = useRef(false);

  // ─── Auto-launch campaign + deliverable ────────────────────
  const handleLaunch = useCallback(async () => {
    if (launchStartedRef.current) return;
    launchStartedRef.current = true;

    const store = useCampaignWizardStore.getState();
    store.setContentGenPhase('launching');
    useCanvasStore.getState().reset();

    const draftCampaignId = store.draftCampaignId ?? undefined;

    // Send the strategy layer (concept data) so the Canvas can display
    // the Campaign Concept card. Strip assetPlan.deliverables so the
    // launch route uses the fallback deliverables path (creates exactly
    // one deliverable of the selected content type).
    // Preserve the blueprint so the Canvas can read campaign concept,
    // strategy direction, etc. — but empty the assetPlan deliverables
    // array so the launch route's server-side doesn't create N content
    // items from it (we want exactly ONE from the `deliverables` param).
    const strategyForLaunch = store.blueprintResult
      ? {
          ...store.blueprintResult,
          assetPlan: {
            ...store.blueprintResult.assetPlan,
            deliverables: [],
          },
        }
      : undefined;

    try {
      const result = await launchCampaign.mutateAsync({
        name: store.name || 'Untitled Content',
        description: store.description,
        type: 'CONTENT',
        goalType: store.campaignGoalType ?? 'CONTENT_MARKETING',
        startDate: store.startDate || undefined,
        endDate: store.endDate || undefined,
        knowledgeIds: store.selectedKnowledgeIds,
        strategy: strategyForLaunch,
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
        ...(Object.keys(store.contentTypeInputs).length > 0 ? { contentTypeInputs: store.contentTypeInputs } : {}),
      });

      const s = useCampaignWizardStore.getState();
      if (result.firstDeliverableId) {
        s.setGeneratedIds(result.campaignId, result.firstDeliverableId);
        s.setDraftCampaignId(null);
        s.setContentGenPhase('complete');
      } else {
        console.error('[ContentGenerateStep] Launch returned no deliverable ID', result);
        s.setContentGenPhase('error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown launch error';
      console.error('[ContentGenerateStep] Launch failed:', error);
      useCampaignWizardStore.getState().setContentGenPhase('error');
      useCanvasStore.getState().setGlobalStatus('error', message);
      launchStartedRef.current = false;
    }
  }, [launchCampaign]);

  // Auto-launch on mount
  useEffect(() => {
    if (contentGenPhase === 'idle') {
      const store = useCampaignWizardStore.getState();
      if (store.generatedCampaignId || store.generatedDeliverableId) {
        useCampaignWizardStore.setState({
          generatedCampaignId: null,
          generatedDeliverableId: null,
        });
      }
      handleLaunch();
    }
  }, [contentGenPhase, handleLaunch]);

  // ─── Retry handler ──────────────────────────────────────────
  const handleRetry = () => {
    launchStartedRef.current = false;
    useCanvasStore.getState().reset();
    setContentGenPhase('idle');
  };

  // Sync hasSelectedVariant for canProceed gating — launch success
  // is enough to proceed (content generation happens in the canvas).
  const generatedDeliverableId = useCampaignWizardStore((s) => s.generatedDeliverableId);
  const setHasSelectedVariant = useCampaignWizardStore((s) => s.setHasSelectedVariant);
  useEffect(() => {
    setHasSelectedVariant(!!generatedDeliverableId);
  }, [generatedDeliverableId, setHasSelectedVariant]);

  // ─── Render: Launching ─────────────────────────────────────
  if (contentGenPhase === 'idle' || contentGenPhase === 'launching') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
        <p className="text-sm text-gray-500">Creating your content workspace...</p>
      </div>
    );
  }

  // ─── Render: Error ─────────────────────────────────────────
  if (contentGenPhase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-gray-900">Failed to create content workspace</p>
        {globalErrorMessage && (
          <p className="text-sm text-red-600 max-w-md text-center">{globalErrorMessage}</p>
        )}
        <Button variant="secondary" icon={RefreshCw} onClick={handleRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  // ─── Render: Success — ready to open canvas ────────────────
  const contentLabel = selectedContentType?.replace(/-/g, ' ') ?? 'content';

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <div className="text-center max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Your {contentLabel} workspace is ready
        </h3>
        <p className="text-sm text-gray-500">
          Click <strong>Open in Canvas</strong> to review the context, generate
          text variants, select images, and refine your {contentLabel} before publishing.
        </p>
      </div>
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <ExternalLink className="h-3 w-3" />
        Content generation happens in the Canvas after you review the context
      </p>
    </div>
  );
}
