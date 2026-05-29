'use client';

import React, { useEffect } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCanvasComponents } from '../../hooks/canvas.hooks';
import { HorizontalAccordion } from './accordion/HorizontalAccordion';
import { CanvasContextSelector } from './CanvasContextSelector';
import { InsertImageModal } from './InsertImageModal';
import { GenerationFeedbackBanners } from './GenerationFeedbackBanners';
import { useCanvasOrchestration } from '../../hooks/useCanvasOrchestration';
import { CanvasHelpButton } from '../../../claw/components/CanvasHelpButton';
import { useClawStore } from '@/stores/useClawStore';
import { Badge, Skeleton } from '@/components/shared';
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

const STATUS_BADGE: Record<ApprovalStatus, {
  label: string;
  variant: 'default' | 'info' | 'success' | 'warning' | 'danger';
}> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  IN_REVIEW: { label: 'In Review', variant: 'info' },
  APPROVED: { label: 'Ready', variant: 'success' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'warning' },
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  PUBLISHED: { label: 'Published', variant: 'success' },
};

// Apply inherited settings from a previous deliverable to the current one.
// Hydrates the store first (so UI reflects the change immediately), then
// PATCHes the deliverable with a merged settings blob that carries the
// inherited values plus an `inheritedFrom` marker so this code path doesn't
// fire twice. User remains on step 1 (Context) to review the inherited brief
// — both 'context' and 'medium' are marked completed so navigating to
// Variants is one click away once the review is satisfactory.
async function applyInheritance(
  deliverableId: string,
  candidate: { id: string; title: string; settings: Record<string, unknown> | null },
  signal: AbortSignal,
) {
  const prev = (candidate.settings ?? {}) as Record<string, unknown>;
  const mediumConfig = (prev.mediumConfig ?? {}) as Record<string, unknown>;
  const contentTypeInputs = (prev.contentTypeInputs ?? {}) as Record<
    string,
    string | string[] | number | boolean
  >;
  const brief = (prev.brief ?? null) as Record<string, unknown> | null;

  const store = useCanvasStore.getState();

  if (Object.keys(mediumConfig).length > 0) {
    store.setMediumConfigValues(mediumConfig);
    store.setMediumApproved(true);
  }
  if (Object.keys(contentTypeInputs).length > 0) {
    store.setContentTypeInputsBulk(contentTypeInputs);
  }
  store.setInheritedFrom({ id: candidate.id, title: candidate.title });
  store.setCompletedSteps(['context', 'medium']);
  // 2026-05-19: do NOT fast-forward to 'variants'. Previously skipped step 1
  // entirely, leaving user wondering why they couldn't review/edit the
  // inherited brief. Inherited values are now visible in step 1 (Context) with
  // the InheritedFrom banner; user clicks next when ready. completedSteps
  // still marks both 'context' + 'medium' so navigation to 'variants' is one
  // click away if the user trusts the inheritance.

  try {
    await fetch(`/api/studio/${deliverableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        settings: {
          mediumConfig,
          contentTypeInputs,
          brief,
          inheritedFrom: {
            id: candidate.id,
            title: candidate.title,
            appliedAt: new Date().toISOString(),
          },
        },
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    // Non-critical — user can still proceed; banner will re-offer on next load
    // if the PATCH failed to persist the inheritedFrom marker.
  }
}

export function CanvasPage({ deliverableId, campaignId, onNavigate }: CanvasPageProps) {
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const globalErrorMessage = useCanvasStore((s) => s.globalErrorMessage);
  const fidelityThresholdMet = useCanvasStore((s) => s.fidelityScore.thresholdMet);
  const fidelityStage = useCanvasStore((s) => s.fidelityScore.stage);
  const approvalStatus = useCanvasStore((s) => s.approvalStatus);
  const activeStep = useCanvasStore((s) => s.activeStep);
  const completedSteps = useCanvasStore((s) => s.completedSteps);
  const storeContentType = useCanvasStore((s) => s.contentType);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const contentTypeInputsModified = useCanvasStore((s) => s.contentTypeInputsModified);
  const brief = useCanvasStore((s) => s.brief);
  const briefModified = useCanvasStore((s) => s.briefModified);
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const visualBriefModified = useCanvasStore((s) => s.visualBriefModified);

  const { data: componentsData, isLoading: componentsLoading } = useCanvasComponents(deliverableId);
  const { generate: orchestrateGenerate } = useCanvasOrchestration(deliverableId);
  const pendingAutoGenerate = useCanvasStore((s) => s.pendingAutoGenerate);
  const setPendingAutoGenerate = useCanvasStore((s) => s.setPendingAutoGenerate);

  // Auto-trigger generation na derive: GenerationFeedbackBanners derive-handler
  // zet pendingAutoGenerate naar de nieuwe deliverableId voor navigatie.
  // Op deze CanvasPage mount: wanneer match → vuur generate() + clear flag.
  // Voorkomt dat user op een lege canvas land na klik op "LinkedIn-variant maken".
  useEffect(() => {
    if (!pendingAutoGenerate || pendingAutoGenerate !== deliverableId) return;
    if (componentsLoading) return; // wacht tot context geladen is
    setPendingAutoGenerate(null);
    void orchestrateGenerate();
  }, [pendingAutoGenerate, deliverableId, componentsLoading, orchestrateGenerate, setPendingAutoGenerate]);
  const existingComponents = componentsData?.components;
  const variantAngles = componentsData?.variantAngles ?? [];
  const persistedFidelityScore = componentsData?.fidelityScore ?? null;
  const persistedStrictRewrite = componentsData?.strictRewrite ?? null;
  const persistedVisualFidelityScores = componentsData?.visualFidelityScores ?? null;

  const statusConfig = STATUS_BADGE[approvalStatus];

  // Title is captured locally from the detail fetch — the canvas store doesn't
  // track it, but the Brand Assistant help button uses it for more specific
  // contextual prompts ("Shorten 'My Q2 post' to 200 words").
  const [deliverableTitle, setDeliverableTitle] = React.useState<string | null>(null);

  // Whether the store is hydrated from the server — guards against saving
  // a default activeStep before we've read the stored one.
  const hydratedRef = React.useRef(false);

  // Set deliverable in store on mount + load approval state + load context
  useEffect(() => {
    useCanvasStore.getState().setDeliverable(deliverableId, 'canvas', campaignId);
    // Clear stale title from a prior deliverable — the fetch below populates it.
    setDeliverableTitle(null);
    // UX-fix 2026-05-13: clear stale auto-iterate state. DB-snapshots uit
    // eerdere automatische runs (vóór 2026-05-13 UX-overhaul) zouden anders
    // door-renderen op canvas-load. AutoIterateImprovedBlock toont alleen
    // wanneer een NIEUWE user-triggered iteratie heeft gedraaid in deze sessie.
    useCanvasStore.getState().resetAutoIterate();

    const controller = new AbortController();

    // Fetch deliverable detail — approval state + real contentType
    fetch(`/api/studio/${deliverableId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.deliverable) return;
        const d = data.deliverable;
        // Update store with the real contentType (initial 'canvas' is a placeholder)
        if (d.contentType) {
          useCanvasStore.getState().setDeliverable(deliverableId, d.contentType, campaignId);
          // Auto-set video provider config defaults for video-adjacent types
          if (VIDEO_ADJACENT_TYPES.has(d.contentType)) {
            useCanvasStore.getState().setVideoProviderConfig(getDefaultVideoConfig(d.contentType));
          }
        }
        if (typeof d.title === 'string') {
          setDeliverableTitle(d.title);
          // Make this deliverable Claw's active entity so chat requests like
          // "vul de velden" or "rewrite this" resolve to THIS item, not a
          // new campaign search. Cleared on unmount below.
          useClawStore.getState().setActiveEntity({
            type: 'deliverable',
            id: deliverableId,
            name: d.title,
            campaignId,
          });
        }
        useCanvasStore.getState().setApprovalState({
          approvalStatus: (d.approvalStatus ?? 'DRAFT') as ApprovalStatus,
          approvalNote: d.approvalNote ?? null,
          approvedBy: d.approvedBy ?? null,
          approvedAt: d.approvedAt ?? null,
          publishedAt: d.publishedAt ?? null,
          publishedVia: d.publishedVia ?? null,
        });

        // Fase 6b — hydrate structured variant slices voor PUCK_WEBPAGE_TYPES.
        // Twee shapes mogelijk:
        //  - structuredVariantOptions (array, na initial generation, vóór user-keuze)
        //  - structuredVariant (single object, na user-keuze in Step 2)
        // Rendered vorm puckData wordt apart gehydrateerd via contextStack.puckData.
        if (Array.isArray(d.settings?.structuredVariantOptions)) {
          useCanvasStore.getState().setStructuredVariantOptions(
            d.settings.structuredVariantOptions,
          );
        }
        if (d.settings?.structuredVariant) {
          useCanvasStore.getState().setStructuredVariant(d.settings.structuredVariant);
        }

        // Surface the inheritance banner on any deliverable whose settings
        // already carry an inheritedFrom marker — set by the duplicate
        // endpoint (Sprint B · Step 1) or by a previous auto-inherit pass
        // (Sprint A · Step 1, after re-opening). The /context endpoint
        // won't return a fresh candidate in this case, so without this
        // hydration the banner would stay hidden.
        const persistedInheritedFrom = d.settings?.inheritedFrom as
          | { id: string; title: string }
          | undefined;
        if (persistedInheritedFrom?.id && persistedInheritedFrom?.title) {
          useCanvasStore.getState().setInheritedFrom({
            id: persistedInheritedFrom.id,
            title: persistedInheritedFrom.title,
          });
        }
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

        // Restore the last active accordion step + completedSteps so the user
        // lands back where they were, instead of always on "variants".
        const canvasState = d.settings?.canvasState as
          | { lastActiveStep?: string; completedSteps?: string[] }
          | undefined;
        if (canvasState?.completedSteps && Array.isArray(canvasState.completedSteps)) {
          useCanvasStore.getState().setCompletedSteps(canvasState.completedSteps);
        }
        if (canvasState?.lastActiveStep && typeof canvasState.lastActiveStep === 'string') {
          useCanvasStore.getState().setActiveStep(canvasState.lastActiveStep);
        }
        hydratedRef.current = true;
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        // Non-critical — approval state defaults to DRAFT
        hydratedRef.current = true;
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

        // Auto-inherit from previous completed deliverable (Sprint A · Step 1).
        // The server detects a candidate only for fresh NOT_STARTED deliverables
        // with no generated content, no prior inheritance, and a prior completed
        // sibling of the same type. Apply once, persist, fast-forward to Variants.
        const candidate = data.inheritanceCandidate as
          | { id: string; title: string; settings: Record<string, unknown> | null }
          | null;
        if (candidate && !controller.signal.aborted) {
          applyInheritance(deliverableId, candidate, controller.signal);
        }
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        // Non-critical — context will still load when Generate is clicked
      });

    return () => {
      controller.abort();
      useCanvasStore.getState().reset();
      // Clear Claw's active entity — leaving it set after navigating away
      // would make chat assume the user is still on this deliverable.
      useClawStore.getState().setActiveEntity(null);
    };
  }, [deliverableId, campaignId]);

  // After a Claw mutation that targets THIS deliverable, refetch settings
  // so the form shows the new values without a manual refresh. The Canvas
  // store hydrates via plain fetch (not TanStack Query) so query
  // invalidation doesn't reach it — MutationConfirmCard fires a
  // 'canvas:refresh-deliverable' window event after a successful update
  // and we listen here.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { deliverableId?: string } | undefined;
      if (detail?.deliverableId !== deliverableId) return;
      const store = useCanvasStore.getState();
      // Server is now the source of truth for brief / contentTypeInputs /
      // visualBrief — clear the *Modified flags so setContextStack
      // hydrates the fresh values from /context.
      store.resetModifiedFlags();
      fetch(`/api/studio/${deliverableId}/context`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.contextStack) {
            useCanvasStore.getState().setContextStack(data.contextStack);
          }
        })
        .catch(() => {
          // Non-critical — next page reload will pick up the change
        });
    };
    window.addEventListener('canvas:refresh-deliverable', handler);
    return () => window.removeEventListener('canvas:refresh-deliverable', handler);
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

    // Image variants — separate code path. variantGroup === 'visual' carries
    // workspace-level image rows; variantGroup === 'visual:<sceneId>'
    // (2026-05-19 Fase 1) carries scene-scoped variants voor video-script
    // types. Hydrate into respective store slots.
    const workspaceVisualComps = existingComponents.filter(
      (c) => c.variantGroup === 'visual' && c.imageUrl,
    );
    if (workspaceVisualComps.length > 0) {
      const sortedVisuals = [...workspaceVisualComps].sort(
        (a, b) => (a.variantIndex ?? 0) - (b.variantIndex ?? 0),
      );
      storeState.setImageVariants(
        sortedVisuals.map((c, i) => ({
          index: c.variantIndex ?? i,
          url: c.imageUrl ?? '',
          prompt: c.imagePromptUsed ?? '',
          isSelected: c.isSelected,
          componentId: c.id,
        })),
      );
    }

    // Scene-scoped visual hydration: 'visual:hook' / 'visual:body' / 'visual:cta'
    for (const sceneId of ['hook', 'body', 'cta'] as const) {
      const sceneComps = existingComponents.filter(
        (c) => c.variantGroup === `visual:${sceneId}` && c.imageUrl,
      );
      if (sceneComps.length > 0) {
        const sortedSceneVisuals = [...sceneComps].sort(
          (a, b) => (a.variantIndex ?? 0) - (b.variantIndex ?? 0),
        );
        storeState.setSceneImageVariants(
          sceneId,
          sortedSceneVisuals.map((c, i) => ({
            index: c.variantIndex ?? i,
            url: c.imageUrl ?? '',
            prompt: c.imagePromptUsed ?? '',
            isSelected: c.isSelected,
            componentId: c.id,
          })),
        );
      }
    }

    // Text variants — only load if store is empty (avoid clobbering an
    // in-flight orchestration).
    if (storeState.variantGroups.size > 0) return;

    const groups = new Map<string, typeof existingComponents>();
    for (const comp of existingComponents) {
      // Skip hero-image (handled above) and visual-group image variants
      // (handled directly into imageVariants above)
      // Skip image-group rows: 'visual' (workspace) of 'visual:hook/body/cta' (scene-scoped).
      if (
        !comp.variantGroup ||
        comp.variantGroup === 'hero-image' ||
        comp.variantGroup === 'visual' ||
        comp.variantGroup.startsWith('visual:')
      ) {
        continue;
      }
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
        const variantIndex = c.variantIndex ?? i;
        // Hydrate angleLabel uit settings.variantAngles geïndexeerd op
        // variantIndex. Lege string in array = geen angle voor die index
        // (legacy 1-call mode of mismatch). Filter naar undefined zodat
        // de pill UI fallback "Variant A/B" toont i.p.v. lege string.
        const angleLabel = variantAngles[variantIndex];
        return {
          index: variantIndex,
          content: c.generatedContent ?? '',
          tone: undefined,
          cta,
          isSelected: c.isSelected,
          componentId: c.id,
          angleLabel: angleLabel && angleLabel.length > 0 ? angleLabel : undefined,
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

    // Content already exists — jump to step 2 only when there is no
    // restored position (i.e. user is freshly landing on the item for the
    // first time after generation). If the store was hydrated with a
    // lastActiveStep from settings.canvasState, respect that instead.
    if (groups.size > 0 && storeState.activeStep === 'context') {
      const nextStep = storeState.mediumCategory === 'video' ? 'script' : 'variants';
      storeState.advanceToStep(nextStep);
    }
  }, [existingComponents]);

  // Hydrate persisted F-VAL fidelity score + STRICT rewrite uit DB op mount
  // — anders verdwijnt de position-bar na page refresh ondanks dat de
  // score in Deliverable.settings.fidelityScore staat. Loopt via een
  // separate effect zodat het niet afhankelijk is van existingComponents
  // hydration timing.
  useEffect(() => {
    if (!persistedFidelityScore && !persistedStrictRewrite) return;
    const storeState = useCanvasStore.getState();

    if (persistedFidelityScore) {
      const pillarsRaw = persistedFidelityScore.pillars as Record<
        string,
        { score: number; weight: number } | null
      > | null;
      storeState.setFidelityComplete({
        compositeScore: persistedFidelityScore.compositeScore,
        thresholdMet: persistedFidelityScore.thresholdMet,
        compositeThreshold: persistedFidelityScore.compositeThreshold,
        detectorVerdict: persistedFidelityScore.detectorVerdict,
        humanBaselinePosition: persistedFidelityScore.humanBaselinePosition,
        pillars: {
          style: typeof pillarsRaw?.style?.score === 'number' && (pillarsRaw.style?.weight ?? 0) > 0
            ? pillarsRaw.style.score
            : null,
          judge: typeof pillarsRaw?.judge?.score === 'number' ? pillarsRaw.judge.score : null,
          rules: typeof pillarsRaw?.rules?.score === 'number' ? pillarsRaw.rules.score : 0,
        },
        elapsedMs: 0, // unknown from persisted snapshot
      });
    }

    if (persistedStrictRewrite?.before && persistedStrictRewrite.after) {
      storeState.setStrictRewriteComplete({
        improved: true,
        decisionReason: persistedStrictRewrite.decisionReason ?? '',
        before: persistedStrictRewrite.before,
        after: persistedStrictRewrite.after,
        rewritePreview: persistedStrictRewrite.text?.slice(0, 1500) ?? null,
      });
    }
  }, [persistedFidelityScore, persistedStrictRewrite]);

  // G8 — hydrate per-image visual fidelity scores so the badges show
  // immediately on page load (not only after a fresh canvas generation).
  useEffect(() => {
    if (!persistedVisualFidelityScores || persistedVisualFidelityScores.length === 0) return;
    useCanvasStore.getState().setVisualFidelityComplete(
      persistedVisualFidelityScores.map((s) => ({
        componentId: s.componentId,
        compositeScore: s.compositeScore,
        thresholdMet: s.thresholdMet,
        judgeSkipped: s.judgeSkipped,
      })),
    );
  }, [persistedVisualFidelityScores]);

  // Persist activeStep + completedSteps back to the deliverable settings so
  // reopening the item lands on the same step. Only saves after initial
  // hydration to avoid clobbering stored values with the default 'context'.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const controller = new AbortController();
    fetch(`/api/studio/${deliverableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        settings: {
          canvasState: {
            lastActiveStep: activeStep,
            completedSteps: Array.from(completedSteps),
          },
        },
      }),
    }).catch((err) => {
      if ((err as Error).name === 'AbortError') return;
      // Non-critical — next navigation will retry
    });
    return () => controller.abort();
  }, [activeStep, completedSteps, deliverableId]);

  // Persist contentTypeInputs (Step 1 "Review Context" form values) back to
  // the deliverable settings whenever the user edits them. Without this the
  // store state vanishes on Canvas unmount and reopening shows empty fields,
  // since `assembleCanvasContext` reads `settings.contentTypeInputs` from
  // the DB. Debounced 500ms so consecutive keystrokes batch into one PATCH;
  // gated on `contentTypeInputsModified` so freshly hydrated values (from
  // inheritance / contextStack) don't echo back to the server.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!contentTypeInputsModified) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ settings: { contentTypeInputs } }),
      }).catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        // Non-critical — next edit will retry
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [contentTypeInputs, contentTypeInputsModified, deliverableId]);

  // Same autosave pattern for the briefing (objective / keyMessage / tone /
  // CTA). Surfaces in Step 1 BriefSection. Persists into settings.brief so
  // Claw's create_deliverable briefing + manual edits survive a Canvas
  // close/reopen and feed forward into the generation prompts.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!briefModified) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ settings: { brief } }),
      }).catch((err) => {
        if ((err as Error).name === 'AbortError') return;
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [brief, briefModified, deliverableId]);

  // Visual Brief autosave — same debounced PATCH pattern as the briefing.
  // Persists settings.visualBrief so source + style chip survive reopen and
  // feed forward into the orchestrator's text + image prompt builders.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!visualBriefModified) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ settings: { visualBrief } }),
      }).catch((err) => {
        if ((err as Error).name === 'AbortError') return;
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [visualBrief, visualBriefModified, deliverableId]);

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
        <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
        {globalStatus === 'generating' && (
          <span className="text-sm text-primary animate-pulse">Generating...</span>
        )}
        {globalStatus === 'complete' && (
          // Semantically connect generation-complete state to the fidelity
          // signal so the header reflects whether content is ready to ship
          // or needs review. "Complete" alone next to a below-threshold
          // fidelity-bar looked contradictory.
          fidelityStage === 'complete' && fidelityThresholdMet === false ? (
            <span className="text-sm text-amber-600">Generation complete · fidelity below threshold</span>
          ) : (
            <span className="text-sm text-emerald-600">Generation complete</span>
          )
        )}
        {globalStatus === 'error' && (
          <span className="text-sm text-red-500" title={globalErrorMessage ?? undefined}>
            {globalErrorMessage ?? 'Generation failed'}
          </span>
        )}
      </div>

      {/* Generation feedback banners: brand-voice fallback warning + iteration nudges */}
      <GenerationFeedbackBanners />

      {/* Accordion layout */}
      <div className={`flex-1 ${STUDIO.canvas.bg} overflow-hidden`}>
        <HorizontalAccordion deliverableId={deliverableId} />
      </div>

      {/* Knowledge context selector modal */}
      <CanvasContextSelector />

      {/* Insert image modal (Step 3 hero image picker) */}
      <InsertImageModal />

      {/* Sprint B · Step 3.C — floating Brand Assistant help */}
      <CanvasHelpButton
        contentType={storeContentType}
        deliverableTitle={deliverableTitle}
      />
    </div>
  );
}
