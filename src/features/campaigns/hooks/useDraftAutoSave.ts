import { useEffect } from "react";
import { useCampaignWizardStore } from "../stores/useCampaignWizardStore";

const DEBOUNCE_MS = 1500;

type StoreState = ReturnType<typeof useCampaignWizardStore.getState>;
type DraftSnapshot = Record<string, unknown>;

/**
 * Builds the JSON payload sent to `/api/campaigns/wizard/drafts` PATCH/POST.
 * This is the subset of store state that belongs to the wizard conversation
 * and should survive refresh/crash/multi-device. Excludes:
 *
 *   - Transient UI flags (isGenerating, pipelineSteps, enrichmentStatus, etc.)
 *   - Non-serializable fields (stepProceedOverride function)
 *   - Draft linkage metadata (draftCampaignId, draftSaveStatus, ...) — the
 *     server row IS the identity, no need to echo it back.
 *   - Workspace fingerprint (workspaceId) — the server already knows the
 *     workspace from the session cookie.
 */
function buildServerSnapshot(state: StoreState): DraftSnapshot {
  return {
    wizardMode: state.wizardMode,
    currentStep: state.currentStep,
    name: state.name,
    description: state.description,
    campaignGoalType: state.campaignGoalType,
    campaignType: state.campaignType,
    selectedContentType: state.selectedContentType,
    startDate: state.startDate,
    endDate: state.endDate,
    selectedKnowledgeIds: state.selectedKnowledgeIds,
    strategyResult: state.strategyResult,
    selectedDeliverables: state.selectedDeliverables,
    activeDeliverableTab: state.activeDeliverableTab,
    saveAsTemplate: state.saveAsTemplate,
    templateName: state.templateName,
    briefingOccasion: state.briefingOccasion,
    briefingAudienceObjective: state.briefingAudienceObjective,
    briefingCoreMessage: state.briefingCoreMessage,
    briefingTonePreference: state.briefingTonePreference,
    briefingConstraints: state.briefingConstraints,
    strategicIntent: state.strategicIntent,
    blueprintResult: state.blueprintResult,
    strategyPhase: state.strategyPhase,
    personaValidation: state.personaValidation,
    synthesizedStrategy: state.synthesizedStrategy,
    synthesizedArchitecture: state.synthesizedArchitecture,
    arenaEnrichment: state.arenaEnrichment,
    briefingValidation: state.briefingValidation,
    strategyFoundation: state.strategyFoundation,
    strategyFeedback: state.strategyFeedback,
    enrichmentContext: state.enrichmentContext,
    conceptFeedback: state.conceptFeedback,
    elaborateResult: state.elaborateResult,
    useExternalEnrichment: state.useExternalEnrichment,
    pipelineConfig: state.pipelineConfig,
    endorsedPersonaIds: state.endorsedPersonaIds,
    strategyRatings: state.strategyRatings,
    insights: state.insights,
    selectedInsightIndex: state.selectedInsightIndex,
    insightFeedback: state.insightFeedback,
    concepts: state.concepts,
    selectedConceptIndex: state.selectedConceptIndex,
    conceptElementRatings: state.conceptElementRatings,
    creativeDebateResult: state.creativeDebateResult,
    finalStrategy: state.finalStrategy,
    finalArchitecture: state.finalArchitecture,
    pipelineAttempt: state.pipelineAttempt,
    failedConcepts: state.failedConcepts,
    regenerationBrief: state.regenerationBrief,
  };
}

function computeFingerprint(snapshot: DraftSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Auto-saves the campaign wizard state to the DB via the draft endpoints
 * (Fase 2 — DB-backed drafts). Lifecycle:
 *
 * 1. On first meaningful change (step 2+), POST /api/campaigns/wizard/drafts
 *    to create the draft row. The server's `campaignId` is stored in
 *    `draftCampaignId` and persisted to localStorage so the link survives
 *    refresh.
 * 2. Subsequent changes trigger debounced (1500ms) PATCH /drafts/:id calls
 *    that update the persisted snapshot.
 * 3. Saves are queued sequentially (not in parallel) so a slow POST never
 *    races with a follow-up PATCH. A fingerprint of the last-saved state
 *    skips no-op calls when queued saves pile up during slow networks.
 * 4. On errors: 409 DRAFT_LIMIT_REACHED and 404 (draft archived/deleted)
 *    are handled explicitly; other failures set draftSaveStatus to 'error'
 *    with the message shown by DraftSaveIndicator.
 *
 * Should be called exactly once near the root of CampaignWizardPage.
 */
export function useDraftAutoSave() {
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let saveQueue: Promise<void> = Promise.resolve();
    let lastSavedFingerprint: string | null = null;
    let unmounted = false;

    // Track the last seen snapshot so the subscribe callback can skip no-op
    // state changes (e.g. pipelineSteps updates during SSE) without resetting
    // the debounce timer needlessly.
    let lastSeenFingerprint = computeFingerprint(
      buildServerSnapshot(useCampaignWizardStore.getState()),
    );

    const doSave = async () => {
      if (unmounted) return;

      const state = useCampaignWizardStore.getState();

      // Skip until workspace fingerprint is resolved (rehydration pending)
      if (!state.workspaceId) return;

      // Don't create a server draft until the user has advanced past step 1
      if (state.currentStep < 2 && !state.draftCampaignId) return;

      const snapshot = buildServerSnapshot(state);
      const fingerprint = computeFingerprint(snapshot);

      // Nothing has changed since the last successful save — skip
      if (fingerprint === lastSavedFingerprint) return;

      const name = state.name?.trim() || "Untitled draft";
      const wizardStep = state.currentStep;
      // Tag the draft's stored type from wizardMode so the right overview
      // page picks it up (STRATEGIC → Campaigns, CONTENT → Content Library).
      const type: "STRATEGIC" | "CONTENT" =
        state.wizardMode === "content" ? "CONTENT" : "STRATEGIC";
      const body = JSON.stringify({ name, wizardState: snapshot, wizardStep, type });

      useCampaignWizardStore.getState().setDraftSaveStatus("saving");

      try {
        let response: Response;

        if (!state.draftCampaignId) {
          // First save: create the draft row on the server.
          response = await fetch("/api/campaigns/wizard/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });

          if (response.status === 409) {
            const data = (await response.json().catch(() => ({}))) as {
              message?: string;
            };
            if (!unmounted) {
              useCampaignWizardStore
                .getState()
                .setDraftSaveStatus("error", data.message || "Max drafts reached (5).");
            }
            return;
          }

          if (!response.ok) {
            throw new Error(`POST /drafts returned ${response.status}`);
          }

          const data = (await response.json()) as { campaignId: string };
          if (unmounted) return;
          useCampaignWizardStore.getState().setDraftCampaignId(data.campaignId);
          useCampaignWizardStore
            .getState()
            .setDraftLastSavedAt(new Date().toISOString());
          useCampaignWizardStore.getState().setDraftSaveStatus("saved");
          lastSavedFingerprint = fingerprint;
          return;
        }

        // Subsequent saves: patch the existing draft.
        response = await fetch(`/api/campaigns/wizard/drafts/${state.draftCampaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (response.status === 404) {
          // Draft was archived or deleted elsewhere — clear the link so the
          // next change POSTs a fresh draft (subject to max-5 enforcement).
          if (!unmounted) {
            useCampaignWizardStore.getState().setDraftCampaignId(null);
            useCampaignWizardStore
              .getState()
              .setDraftSaveStatus(
                "error",
                "Draft was removed — will create a new draft on next change.",
              );
          }
          lastSavedFingerprint = null;
          return;
        }

        if (!response.ok) {
          throw new Error(`PATCH /drafts returned ${response.status}`);
        }

        const data = (await response.json()) as { wizardLastSavedAt?: string };
        if (unmounted) return;
        useCampaignWizardStore
          .getState()
          .setDraftLastSavedAt(data.wizardLastSavedAt || new Date().toISOString());
        useCampaignWizardStore.getState().setDraftSaveStatus("saved");
        lastSavedFingerprint = fingerprint;
      } catch (error) {
        if (unmounted) return;
        console.error("[useDraftAutoSave] save failed:", error);
        useCampaignWizardStore
          .getState()
          .setDraftSaveStatus(
            "error",
            error instanceof Error ? error.message : "Save failed",
          );
      }
    };

    const queueSave = () => {
      saveQueue = saveQueue
        .then(() => {
          if (unmounted) return;
          return doSave();
        })
        .catch((err) => {
          // Promise chain should never reject — doSave catches its own errors.
          // Log anything unexpected so the chain stays alive for future saves.
          console.error("[useDraftAutoSave] queue error:", err);
        });
    };

    const unsubscribe = useCampaignWizardStore.subscribe((state) => {
      const currentFingerprint = computeFingerprint(buildServerSnapshot(state));
      // Skip no-op changes (transient fields don't move the fingerprint)
      if (currentFingerprint === lastSeenFingerprint) return;
      lastSeenFingerprint = currentFingerprint;

      // Reset debounce timer
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(queueSave, DEBOUNCE_MS);
    });

    return () => {
      unmounted = true;
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);
}
