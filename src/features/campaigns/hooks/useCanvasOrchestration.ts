// =============================================================
// useCanvasOrchestration — SSE hook for canvas content generation
//
// Connects to POST /api/studio/[deliverableId]/orchestrate and
// parses named SSE events (event: xxx\ndata: {...}\n\n).
// =============================================================

import { useRef, useCallback } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';
import type { CanvasVariant, CanvasImageVariant } from '../types/canvas.types';

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
    isGeneratingRef.current = true;

    // Abort previous request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Collect user-selected knowledge context items from the store
      const contextItems = Array.from(store.additionalContextItems.values()).map(
        ({ sourceType, sourceId }) => ({ sourceType, sourceId }),
      );

      const mediumConfigValues = store.mediumConfigValues;
      const hasMediumConfig = Object.keys(mediumConfigValues).length > 0;

      const res = await fetch(`/api/studio/${deliverableId}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: options?.instruction,
          additionalContextItems: contextItems.length > 0 ? contextItems : undefined,
          mediumConfig: hasMediumConfig ? mediumConfigValues : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Orchestration failed: ${res.status}`);
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
      useCanvasStore.getState().setGlobalStatus('error', (err as Error).message ?? 'Generation failed');
    } finally {
      isGeneratingRef.current = false;
      abortRef.current = null;
      const finalStore = useCanvasStore.getState();
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
        ).map(({ sourceType, sourceId }) => ({ sourceType, sourceId }));

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
          throw new Error(`Regeneration failed: ${res.status}`);
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
      useCanvasStore.getState().setGlobalStatus('error');
    } finally {
      isGeneratingRef.current = false;
      abortRef.current = null;
      const finalStore = useCanvasStore.getState();
      if (finalStore.globalStatus === 'generating') {
        finalStore.setGlobalStatus('complete');
      }
    }
  }, [deliverableId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    isGeneratingRef.current = false;
    useCanvasStore.getState().setGlobalStatus('idle');
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

    case 'text_generating':
      if (typeof data.group === 'string') {
        store.setGenerationStatus(data.group, 'generating');
      }
      break;

    case 'text_complete': {
      const group = data.group as string | undefined;
      const variants = data.variants as Array<{ content: string; tone?: string }> | undefined;
      if (group && Array.isArray(variants)) {
        const mapped: CanvasVariant[] = variants.map((v, i) => ({
          index: i,
          content: v.content,
          tone: v.tone,
          isSelected: i === 0,
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

    case 'complete':
      store.setGlobalStatus('complete');
      break;

    case 'error':
      console.error('[Canvas Orchestration] Error event:', data.message);
      store.setGlobalStatus('error', (data.message as string) ?? 'Content generation failed');
      break;

    default:
      // Unknown event — ignore gracefully
      break;
  }
}
