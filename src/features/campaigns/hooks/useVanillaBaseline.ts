// =============================================================
// useVanillaBaseline — SSE hook voor "Vergelijk met vanille AI"
//
// Streamt POST /api/studio/[deliverableId]/vanilla-baseline en
// route-t named SSE events naar useCanvasStore.vanillaBaseline.
//
// Gebruikt dezelfde named SSE parser als useCanvasOrchestration —
// "event: xxx\ndata: {...}\n\n" format.
// =============================================================

import { useRef, useCallback } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';

interface ParsedSSEEvent {
  event: string;
  data: string;
}

function parseNamedSSE(buffer: string): { events: ParsedSSEEvent[]; remainder: string } {
  const events: ParsedSSEEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    if (block.trim().startsWith(':')) continue; // heartbeat

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
    if (data) events.push({ event: eventName, data });
  }

  return { events, remainder };
}

export function useVanillaBaseline(deliverableId: string | null) {
  const abortRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);

  const compare = useCallback(async () => {
    if (!deliverableId || isRunningRef.current) return;

    const store = useCanvasStore.getState();
    store.resetVanillaBaseline();
    store.setVanillaStage('generating');
    isRunningRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/studio/${deliverableId}/vanilla-baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        // Read body for error detail (server returns JSON for non-stream errors)
        let message = `Vanilla baseline request failed: ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) message = String(body.error);
        } catch {
          /* ignore */
        }
        useCanvasStore.getState().setVanillaStage('error', message);
        return;
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
        for (const evt of events) routeEvent(evt.event, evt.data);
      }
      if (buffer.trim()) {
        const { events } = parseNamedSSE(buffer + '\n\n');
        for (const evt of events) routeEvent(evt.event, evt.data);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Vanilla baseline failed';
      console.error('[useVanillaBaseline] Error:', err);
      useCanvasStore.getState().setVanillaStage('error', message);
    } finally {
      isRunningRef.current = false;
      abortRef.current = null;
    }
  }, [deliverableId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    isRunningRef.current = false;
    useCanvasStore.getState().resetVanillaBaseline();
  }, []);

  const isRunning = useCanvasStore(
    (s) => s.vanillaBaseline.stage === 'generating' || s.vanillaBaseline.stage === 'scoring',
  );

  return { compare, abort, isRunning };
}

// ─── Event router ───────────────────────────────────

function routeEvent(eventName: string, rawData: string) {
  const store = useCanvasStore.getState();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawData);
  } catch {
    console.warn('[useVanillaBaseline] failed to parse event data:', rawData);
    return;
  }

  switch (eventName) {
    case 'vanilla_generating':
      store.setVanillaStage('generating');
      break;

    case 'vanilla_text_complete': {
      const preview = typeof data.preview === 'string' ? data.preview : '';
      const wordCount = typeof data.wordCount === 'number' ? data.wordCount : 0;
      const model = typeof data.model === 'string' ? data.model : 'gpt-4o';
      store.setVanillaTextComplete({ preview, wordCount, model });
      break;
    }

    case 'vanilla_scoring':
      store.setVanillaStage('scoring');
      break;

    case 'vanilla_score_complete': {
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

      if (composite !== null && verdict && pos !== null && pillarsRaw) {
        store.setVanillaScoreComplete({
          compositeScore: composite,
          detectorVerdict: verdict,
          humanBaselinePosition: pos,
          pillars: {
            style: typeof pillarsRaw.style === 'number' ? pillarsRaw.style : null,
            judge: typeof pillarsRaw.judge === 'number' ? pillarsRaw.judge : null,
            rules: typeof pillarsRaw.rules === 'number' ? pillarsRaw.rules : null,
          },
        });
      }
      break;
    }

    case 'complete':
      // vanilla_score_complete already flipped stage to 'complete'
      break;

    case 'error': {
      const message = typeof data.message === 'string' ? data.message : 'Vanilla baseline failed';
      store.setVanillaStage('error', message);
      break;
    }

    default:
      // Unknown event — ignore
      break;
  }
}
