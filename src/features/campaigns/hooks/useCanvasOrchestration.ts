// =============================================================
// useCanvasOrchestration — SSE hook for canvas content generation
//
// Connects to POST /api/studio/[deliverableId]/orchestrate and
// parses named SSE events (event: xxx\ndata: {...}\n\n).
// =============================================================

import { useRef, useCallback } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';
import type { CanvasVariant, CanvasImageVariant } from '../types/canvas.types';
import { interpretAiError, errorFromResponse } from '@/lib/ai/ai-error-client';

// ─── Named SSE Parser ───────────────────────────────────────
// Standard SSE events use "event:" + "data:" fields.
// This parser handles: "event: xxx\ndata: {...}\n\n"

interface ParsedSSEEvent {
  event: string;
  data: string;
}

function parseNamedSSE(buffer: string): { events: ParsedSSEEvent[]; remainder: string } {
  const events: ParsedSSEEvent[] = [];
  const blocks = buffer.split('\n\n');
  // Last element might be incomplete
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    // Skip heartbeat comments
    if (block.trim().startsWith(':')) continue;

    let eventName = 'message';
    let data = '';

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        eventName = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data += (data ? '\n' : '') + line.slice(6);
      } else if (line.startsWith('data:')) {
        data += (data ? '\n' : '') + line.slice(5);
      }
    }

    if (data) {
      events.push({ event: eventName, data });
    }
  }

  return { events, remainder };
}

// ─── Hook ───────────────────────────────────────────────────

export function useCanvasOrchestration(deliverableId: string | null) {
  const abortRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(false);

  const generate = useCallback(async (options?: { instruction?: string }) => {
    if (!deliverableId || isGeneratingRef.current) return;

    const store = useCanvasStore.getState();
    store.setGlobalStatus('generating');
    // Markeer dit als de initiële generatie zodat Step 2 de voortgangs-
    // indicator toont totdat ALLE groups gestreamd zijn, i.p.v. een half-
    // gevuld variant-grid terwijl groups nog binnenkomen.
    store.setInitialGenerating(true);
    store.resetFidelityScore();
    store.resetStrictRewrite();
    store.resetAutoIterate();
    store.resetBrandVoiceStatus();
    store.resetIterationNudges();
    store.resetVisualFidelity();
    isGeneratingRef.current = true;

    // Abort previous request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Collect user-selected knowledge context items from the store
      const contextItems = Array.from(store.additionalContextItems.values()).map(
        ({ sourceType, sourceId, note, priority }) => ({ sourceType, sourceId, note, priority }),
      );

      const mediumConfigValues = store.mediumConfigValues;
      const hasMediumConfig = Object.keys(mediumConfigValues).length > 0;

      // Include SEO input if the user has provided a primary keyword.
      // Auto-seed from contentTypeInputs if the user hasn't manually entered one.
      const cti = store.contentTypeInputs;
      const effectiveKeyword = store.seoInput.primaryKeyword
        || (typeof cti.seoKeyword === 'string' ? cti.seoKeyword : '')
        || (typeof cti.targetKeywords === 'object' && Array.isArray(cti.targetKeywords) && cti.targetKeywords.length > 0 ? cti.targetKeywords[0] : '');

      const filteredCompetitorUrls = store.seoInput.competitorUrls.filter((u) => u.trim().length > 0);

      // Merge secondaryKeywords from contentTypeInputs as hints for the pipeline
      const secondaryHints = Array.isArray(cti.secondaryKeywords)
        ? (cti.secondaryKeywords as string[])
        : Array.isArray(cti.targetKeywords)
          ? (cti.targetKeywords as string[]).slice(1) // first one used as primary
          : undefined;

      const seoInput = effectiveKeyword
        ? {
            primaryKeyword: effectiveKeyword,
            funnelStage: store.seoInput.funnelStage,
            competitorUrls: filteredCompetitorUrls.length > 0
              ? filteredCompetitorUrls
              : undefined,
            secondaryKeywordHints: secondaryHints && secondaryHints.length > 0
              ? secondaryHints
              : undefined,
            conversionGoal: typeof cti.conversionGoal === 'string' && cti.conversionGoal
              ? cti.conversionGoal
              : undefined,
            trafficSource: typeof cti.trafficSource === 'string' && cti.trafficSource
              ? cti.trafficSource
              : undefined,
          }
        : undefined;

      const res = await fetch(`/api/studio/${deliverableId}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: options?.instruction,
          additionalContextItems: contextItems.length > 0 ? contextItems : undefined,
          mediumConfig: hasMediumConfig ? mediumConfigValues : undefined,
          seoInput,
          contentTypeInputs: Object.keys(cti).length > 0 ? cti : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw await errorFromResponse(res, `Orchestration failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseNamedSSE(buffer);
        buffer = remainder;

        for (const evt of events) {
          routeEvent(evt.event, evt.data);
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const { events } = parseNamedSSE(buffer + '\n\n');
        for (const evt of events) {
          routeEvent(evt.event, evt.data);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[useCanvasOrchestration] Error:', err);
      const e = interpretAiError(err);
      useCanvasStore.getState().setGlobalStatus('error', {
        message: e.message || 'Generation failed',
        errorType: e.errorType,
        unavailable: e.unavailable,
      });
    } finally {
      isGeneratingRef.current = false;
      abortRef.current = null;
      const finalStore = useCanvasStore.getState();
      finalStore.setInitialGenerating(false);
      if (finalStore.globalStatus === 'generating') {
        finalStore.setGlobalStatus('complete');
      }
    }
  }, [deliverableId]);

  const regenerate = useCallback(async (groups: string[], feedback: string) => {
    if (!deliverableId || isGeneratingRef.current || groups.length === 0) return;

    const store = useCanvasStore.getState();
    for (const g of groups) {
      store.setGenerationStatus(g, 'generating');
    }
    store.setGlobalStatus('generating');
    // Regeneratie behoudt de bestaande variant-set (overlay-state), dus dit is
    // expliciet GEEN initiële generatie.
    store.setInitialGenerating(false);
    isGeneratingRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for (const group of groups) {
        if (controller.signal.aborted) break;

        // Collect user-selected knowledge context items from the store
        const contextItems = Array.from(
          useCanvasStore.getState().additionalContextItems.values(),
        ).map(({ sourceType, sourceId, note, priority }) => ({ sourceType, sourceId, note, priority }));

        const mediumConfigValues = useCanvasStore.getState().mediumConfigValues;
        const hasMediumConfig = Object.keys(mediumConfigValues).length > 0;

        const res = await fetch(`/api/studio/${deliverableId}/orchestrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regenerateGroup: group,
            userFeedback: feedback,
            additionalContextItems: contextItems.length > 0 ? contextItems : undefined,
            mediumConfig: hasMediumConfig ? mediumConfigValues : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw await errorFromResponse(res, `Regeneration failed: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseNamedSSE(buffer);
          buffer = remainder;

          for (const evt of events) {
            routeEvent(evt.event, evt.data);
          }
        }

        if (buffer.trim()) {
          const { events } = parseNamedSSE(buffer + '\n\n');
          for (const evt of events) {
            routeEvent(evt.event, evt.data);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[useCanvasOrchestration] Regenerate error:', err);
      const e = interpretAiError(err);
      useCanvasStore.getState().setGlobalStatus('error', {
        message: e.message || 'Regeneration failed',
        errorType: e.errorType,
        unavailable: e.unavailable,
      });
    } finally {
      isGeneratingRef.current = false;
      abortRef.current = null;
      const finalStore = useCanvasStore.getState();
      finalStore.setInitialGenerating(false);
      if (finalStore.globalStatus === 'generating') {
        finalStore.setGlobalStatus('complete');
      }
    }
  }, [deliverableId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    isGeneratingRef.current = false;
    const store = useCanvasStore.getState();
    store.setInitialGenerating(false);
    store.setGlobalStatus('idle');
  }, []);

  const isGenerating = useCanvasStore((s) => s.globalStatus === 'generating');

  return { generate, regenerate, isGenerating, abort };
}

// ─── Event Router ───────────────────────────────────────────

function routeEvent(eventName: string, rawData: string) {
  const store = useCanvasStore.getState();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawData);
  } catch {
    console.warn('[routeEvent] Failed to parse event data:', rawData);
    return;
  }

  switch (eventName) {
    case 'context_loaded':
      if (data.contextStack) {
        store.setContextStack(data.contextStack as Parameters<typeof store.setContextStack>[0]);
      }
      break;

    case 'brand_voice_status': {
      const level = typeof data.level === 'string' ? data.level : null;
      const userMessage = typeof data.userMessage === 'string' ? data.userMessage : '';
      const isFallback = data.isFallback === true;
      if (
        level === 'voiceguide' ||
        level === 'tone-only' ||
        level === 'language-only' ||
        level === 'none'
      ) {
        store.setBrandVoiceStatus({ level, userMessage, isFallback });
      }
      break;
    }

    case 'text_generating':
      if (typeof data.group === 'string') {
        store.setGenerationStatus(data.group, 'generating');
      }
      break;

    case 'text_complete': {
      const group = data.group as string | undefined;
      const variants = data.variants as Array<{ content: string; tone?: string; cta?: string | null; angleLabel?: string | null }> | undefined;
      if (group && Array.isArray(variants)) {
        const mapped: CanvasVariant[] = variants.map((v, i) => ({
          index: i,
          content: v.content,
          tone: v.tone,
          cta: v.cta ?? undefined,
          isSelected: i === 0,
          angleLabel: v.angleLabel ?? undefined,
        }));
        store.addVariantGroup(group, mapped);
        store.setGenerationStatus(group, 'complete');
      }
      break;
    }

    case 'image_prompt_ready':
      // Informational — prompts stored in image_complete
      break;

    case 'image_generating':
      // Informational — UI can show loading state
      break;

    case 'image_complete': {
      const images = data.variants as Array<{ url: string; prompt: string }> | undefined;
      if (Array.isArray(images)) {
        const mapped: CanvasImageVariant[] = images.map((img, i) => ({
          index: i,
          url: img.url,
          prompt: img.prompt,
          isSelected: i === 0,
        }));
        store.setImageVariants(mapped);
      }
      break;
    }

    case 'publish_suggestion':
      if (data.suggestedDate && data.reasoning) {
        store.setPublishSuggestion({
          suggestedDate: data.suggestedDate as string,
          reasoning: data.reasoning as string,
        });
      }
      break;

    case 'tell_check_complete': {
      const verdict = data.verdict as
        | 'TOP_TIER'
        | 'HUMAN_BASELINE'
        | 'AI_LEANING'
        | 'PURE_AI'
        | undefined;
      const pos = typeof data.humanBaselinePosition === 'number' ? data.humanBaselinePosition : null;
      const variantIdx = typeof data.variantIndex === 'number' ? data.variantIndex : 0;
      if (verdict && pos !== null) {
        // F9: per-variant detector signal. setDetectorOnlyForVariant spiegelt
        // variant 0 ook naar legacy fidelityScore voor backwards-compat.
        store.setDetectorOnlyForVariant(variantIdx, { verdict, humanBaselinePosition: pos });
      }
      break;
    }

    case 'fidelity_score_running': {
      const variantIdx = typeof data.variantIndex === 'number' ? data.variantIndex : 0;
      store.setFidelityRunningForVariant(variantIdx);
      break;
    }

    case 'fidelity_score_complete': {
      const composite = typeof data.compositeScore === 'number' ? data.compositeScore : null;
      const verdict = data.detectorVerdict as
        | 'TOP_TIER'
        | 'HUMAN_BASELINE'
        | 'AI_LEANING'
        | 'PURE_AI'
        | undefined;
      const pos = typeof data.humanBaselinePosition === 'number' ? data.humanBaselinePosition : null;
      const pillarsRaw = data.pillars as
        | { style: number | null; judge: number | null; rules: number | null }
        | undefined;
      const variantIdx = typeof data.variantIndex === 'number' ? data.variantIndex : 0;
      if (composite !== null && verdict && pos !== null && pillarsRaw) {
        store.setFidelityCompleteForVariant(variantIdx, {
          compositeScore: composite,
          thresholdMet: data.thresholdMet === true,
          compositeThreshold: typeof data.compositeThreshold === 'number' ? data.compositeThreshold : 75,
          detectorVerdict: verdict,
          humanBaselinePosition: pos,
          pillars: {
            style: typeof pillarsRaw.style === 'number' ? pillarsRaw.style : null,
            judge: typeof pillarsRaw.judge === 'number' ? pillarsRaw.judge : null,
            rules: typeof pillarsRaw.rules === 'number' ? pillarsRaw.rules : null,
          },
          elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0,
        });
      }
      break;
    }

    case 'fidelity_score_skipped': {
      const reason = typeof data.reason === 'string' ? data.reason : 'Score skipped';
      const variantIdx = typeof data.variantIndex === 'number' ? data.variantIndex : 0;
      store.setFidelityScoreSkippedForVariant(variantIdx, reason);
      break;
    }

    case 'strict_rewrite_running':
      store.setStrictRewriteRunning();
      break;

    case 'strict_rewrite_skipped':
      // Clear de STRICT spinner — geen verdict transition om te tonen
      store.resetStrictRewrite();
      break;

    case 'strict_rewrite_complete': {
      const before = data.before as
        | { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number }
        | undefined;
      const after = data.after as
        | { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number }
        | undefined;
      const decisionReason = typeof data.decisionReason === 'string' ? data.decisionReason : '';
      const improved = data.improved === true;
      const rewritePreview = typeof data.rewritePreview === 'string' ? data.rewritePreview : null;
      if (before && after) {
        store.setStrictRewriteComplete({ improved, decisionReason, before, after, rewritePreview });
      }

      // finalScore (re-computed composition) overschrijft fidelityScore
      // zodat UI position-bar de verbeterde waarde toont.
      const finalScore = data.finalScore as
        | {
            compositeScore: number;
            thresholdMet: boolean;
            compositeThreshold: number;
            detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
            humanBaselinePosition: number;
            pillars: { style: number | null; judge: number | null; rules: number | null };
            elapsedMs: number;
          }
        | null
        | undefined;
      if (finalScore && typeof finalScore === 'object' && 'compositeScore' in finalScore) {
        store.setFidelityComplete(finalScore);
      }
      break;
    }

    case 'auto_iterate_started': {
      const initialScore = typeof data.initialScore === 'number' ? data.initialScore : 0;
      const threshold = typeof data.threshold === 'number' ? data.threshold : 65;
      store.setAutoIterateStarted({ initialScore, threshold });
      break;
    }

    case 'auto_iterate_iteration_started': {
      const appliedTemplates = Array.isArray(data.appliedTemplates)
        ? (data.appliedTemplates as unknown[]).filter((t): t is string => typeof t === 'string')
        : undefined;
      // We tonen iteration_started niet apart in UI — we wachten op _complete.
      // Maar appliedTemplates accumuleren we wel voor attribution.
      if (appliedTemplates && appliedTemplates.length > 0) {
        store.setAutoIterateIterationComplete({
          attempt: typeof data.attempt === 'number' ? data.attempt : 1,
          newScore: store.autoIterate.finalScore ?? store.autoIterate.initialScore ?? 0,
          appliedTemplates,
        });
      }
      break;
    }

    case 'auto_iterate_iteration_complete': {
      const attempt = typeof data.attempt === 'number' ? data.attempt : 1;
      const newScore = typeof data.newScore === 'number' ? data.newScore : 0;
      store.setAutoIterateIterationComplete({ attempt, newScore });
      break;
    }

    case 'auto_iterate_complete': {
      const attemptsExecuted = typeof data.attemptsExecuted === 'number' ? data.attemptsExecuted : 0;
      const finalScore = typeof data.finalScore === 'number' ? data.finalScore : 0;
      const thresholdMet = data.thresholdMet === true;
      const stopReason = typeof data.stopReason === 'string' ? data.stopReason : 'max_iterations';
      store.setAutoIterateComplete({ attemptsExecuted, finalScore, thresholdMet, stopReason });
      break;
    }

    case 'auto_iterate_skipped': {
      const stopReason = typeof data.reason === 'string' ? data.reason : 'disabled';
      store.setAutoIterateComplete({
        attemptsExecuted: 0,
        finalScore: typeof data.initialScore === 'number' ? data.initialScore : 0,
        thresholdMet: stopReason === 'already_passing',
        stopReason,
      });
      break;
    }

    case 'visual_fidelity_running': {
      const componentIds = Array.isArray(data.componentIds)
        ? (data.componentIds as unknown[]).filter(
            (id): id is string => typeof id === 'string',
          )
        : [];
      if (componentIds.length > 0) store.setVisualFidelityRunning(componentIds);
      break;
    }

    case 'visual_fidelity_complete': {
      const results = Array.isArray(data.results)
        ? (data.results as unknown[]).filter(
            (r): r is { componentId: string; compositeScore: number | null; thresholdMet: boolean; judgeSkipped: boolean; error?: string } =>
              typeof r === 'object' && r !== null && typeof (r as { componentId?: unknown }).componentId === 'string',
          )
        : [];
      if (results.length > 0) store.setVisualFidelityComplete(results);
      break;
    }

    case 'seo_step': {
      const step = data.step as number | undefined;
      const status = data.status as string | undefined;
      if (typeof step === 'number' && status) {
        // Initialize steps on first event
        if (store.seoSteps.length === 0) {
          store.initSeoSteps();
        }
        store.updateSeoStep(step, {
          status: status as 'pending' | 'running' | 'complete' | 'error',
          preview: (data.preview as string) ?? null,
        });
      }
      break;
    }

    case 'complete': {
      const nudges = Array.isArray(data.iterationNudges)
        ? (data.iterationNudges as Array<{
            id?: unknown;
            label?: unknown;
            intent?: unknown;
            targetContentTypeId?: unknown;
          }>)
            .filter(
              (n) =>
                typeof n.id === 'string' &&
                typeof n.label === 'string' &&
                typeof n.intent === 'string',
            )
            .map((n) => ({
              id: n.id as string,
              label: n.label as string,
              intent: n.intent as string,
              targetContentTypeId:
                typeof n.targetContentTypeId === 'string'
                  ? (n.targetContentTypeId as string)
                  : undefined,
            }))
        : [];
      if (nudges.length > 0) store.setIterationNudges(nudges);
      store.setGlobalStatus('complete');
      break;
    }

    case 'error': {
      // Respect the server's recoverable flag — image generation failure
      // is non-fatal (text variants still stream + persist), so we log
      // the warning and let the 'complete' event that comes after it
      // flip the status. Only hard errors (recoverable: false) halt the UI.
      const recoverable = data.recoverable === true;
      if (recoverable) {
        console.warn('[Canvas Orchestration] Recoverable warning:', data.message);
      } else {
        console.error('[Canvas Orchestration] Error event:', data.message);
        const e = interpretAiError(data);
        store.setGlobalStatus('error', {
          message: (data.message as string) ?? e.message ?? 'Content generation failed',
          errorType: e.errorType,
          unavailable: e.unavailable,
        });
      }
      break;
    }

    default:
      // Unknown event — ignore gracefully
      break;
  }
}
