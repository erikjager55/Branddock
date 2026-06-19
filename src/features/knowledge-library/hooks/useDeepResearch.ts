'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { startClarify } from '../api/knowledge-resources.api';
import type {
  ClarifyAnswer,
  ClarifyRequest,
  DeepResearchEvent,
} from '@/lib/knowledge-research/types';

const RUN_ENDPOINT = '/api/knowledge-resources/deep-research/run';

/**
 * Callbacks waarmee de consumer op individuele SSE-events reageert. Allemaal
 * optioneel; ongekoppelde events worden stilzwijgend genegeerd.
 */
export interface DeepResearchCallbacks {
  /** Elk binnenkomend, getypeerd event (catch-all naast de specifieke hooks). */
  onEvent?: (event: DeepResearchEvent) => void;
  /** Transport-/parse-fout buiten de stream om (network, abort uitgezonderd). */
  onError?: (message: string) => void;
}

/** Argumenten voor het starten van een onderzoeksrun. */
export interface RunResearchArgs {
  topic: string;
  answers: ClarifyAnswer[];
  useBrandContext?: boolean;
  callbacks?: DeepResearchCallbacks;
}

export interface UseDeepResearchReturn {
  /** TanStack-mutation voor de verfijningsvragen-stap. */
  startClarify: ReturnType<typeof useMutation<Awaited<ReturnType<typeof startClarify>>, Error, ClarifyRequest>>;
  /** Start de SSE-run en dispatch getypeerde events naar de callbacks. */
  runResearch: (args: RunResearchArgs) => void;
  /** Breekt een lopende run af. */
  abort: () => void;
  /** True zolang de SSE-stream loopt. */
  isStreaming: boolean;
}

/**
 * Splitst een SSE-buffer op event-grenzen (`\n\n`) en parse't elke `data:`-regel
 * als {@link DeepResearchEvent}. Geeft de geparste events terug plus de
 * resterende (nog onvolledige) buffer-staart.
 */
function drainSseBuffer(buffer: string): {
  events: DeepResearchEvent[];
  rest: string;
} {
  const events: DeepResearchEvent[] = [];
  const chunks = buffer.split('\n\n');
  // Laatste stuk kan een onvolledig event zijn → bewaren voor de volgende read.
  const rest = chunks.pop() ?? '';

  for (const chunk of chunks) {
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        events.push(JSON.parse(payload) as DeepResearchEvent);
      } catch {
        // Onparseerbare regel overslaan — niet de hele stream laten klappen.
      }
    }
  }

  return { events, rest };
}

/**
 * Client-data-laag voor Deep Research. Levert de clarify-mutation plus een
 * EIGEN getypeerde SSE-reader voor de run (bewust NIET `useAiStream`, dat
 * yield't enkel platte tekst). De reader dispatch't elk
 * {@link DeepResearchEvent} naar de meegegeven callbacks zodat de UI een eigen
 * state-machine kan voeden.
 */
export function useDeepResearch(): UseDeepResearchReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const clarifyMutation = useMutation<
    Awaited<ReturnType<typeof startClarify>>,
    Error,
    ClarifyRequest
  >({
    mutationFn: (body) => startClarify(body),
  });

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const runResearch = useCallback(
    ({ topic, answers, useBrandContext, callbacks }: RunResearchArgs) => {
      // Eventuele lopende run afbreken vóór een nieuwe start.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      (async () => {
        try {
          const response = await fetch(RUN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, answers, useBrandContext }),
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            const detail = await response.json().catch(() => null);
            throw new Error(
              (detail as { error?: string } | null)?.error ??
                'Research run failed to start'
            );
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let sawTerminal = false;

          const dispatch = (evts: DeepResearchEvent[]) => {
            for (const event of evts) {
              if (event.type === 'complete' || event.type === 'error') {
                sawTerminal = true;
              }
              callbacks?.onEvent?.(event);
            }
          };

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (controller.signal.aborted) break;
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const { events, rest } = drainSseBuffer(buffer);
              buffer = rest;
              dispatch(events);
            }

            // Eventueel laatste, niet-newline-afgesloten event nog draineren.
            if (!controller.signal.aborted && buffer.trim()) {
              const { events } = drainSseBuffer(`${buffer}\n\n`);
              dispatch(events);
            }

            // Stream eindigde zonder terminaal event (bv. deadline-stille-sluiting
            // of serverfout) → de UI niet eindeloos "bezig" laten staan.
            if (!controller.signal.aborted && !sawTerminal) {
              callbacks?.onError?.('Research ended unexpectedly. Please try again.');
            }
          } finally {
            // Reader-lock vrijgeven; de fetch-abort heeft het netwerk al opgeruimd.
            reader.cancel().catch(() => {});
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          callbacks?.onError?.(
            err instanceof Error ? err.message : 'Research run failed'
          );
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
          setIsStreaming(false);
        }
      })();
    },
    []
  );

  // Lange-levende fetch: abort op unmount (zelfde lifecycle als useAiStream).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    startClarify: clarifyMutation,
    runResearch,
    abort,
    isStreaming,
  };
}
