// =============================================================
// useVideoGeneration — SSE hook for concept video generation
//
// Connects to POST /api/studio/[deliverableId]/generate-video
// and routes named SSE events to the canvas store.
// =============================================================

import { useRef, useCallback } from 'react';
import { useCanvasStore, type SceneId } from '../stores/useCanvasStore';

// ─── Named SSE Parser (same as useCanvasOrchestration) ──────

interface ParsedSSEEvent {
  event: string;
  data: string;
}

function parseNamedSSE(buffer: string): { events: ParsedSSEEvent[]; remainder: string } {
  const events: ParsedSSEEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim() || block.trim().startsWith(':')) continue;

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

export function useVideoGeneration(deliverableId: string | null) {
  const abortRef = useRef<AbortController | null>(null);

  const generateVideo = useCallback(async (
    scriptText: string,
    sceneId: SceneId | 'full' = 'full',
    sourceImageUrl?: string,
  ) => {
    if (!deliverableId) return;

    const store = useCanvasStore.getState();
    const { provider, duration, aspectRatio } = store.videoProviderConfig;

    if (sceneId !== 'full') {
      store.updateScene(sceneId, { status: 'generating', error: null });
    }

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body: Record<string, unknown> = { scriptText, provider, duration, aspectRatio, sceneId };
      if (sourceImageUrl) body.sourceImageUrl = sourceImageUrl;

      const response = await fetch(`/api/studio/${deliverableId}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        if (sceneId !== 'full') {
          useCanvasStore.getState().setSceneError(sceneId, err.error || `HTTP ${response.status}`);
        }
        return;
      }

      if (!response.body) {
        if (sceneId !== 'full') {
          useCanvasStore.getState().setSceneError(sceneId, 'No response stream');
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseNamedSSE(sseBuffer);
        sseBuffer = remainder;

        for (const evt of events) {
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(evt.data);
          } catch {
            continue;
          }

          const s = useCanvasStore.getState();

          switch (evt.event) {
            case 'video_prompt_generating':
            case 'video_prompt_ready':
            case 'video_generating':
              if (sceneId !== 'full') {
                s.updateScene(sceneId, { status: 'generating' });
              }
              break;

            case 'video_complete':
              if (sceneId !== 'full') {
                s.setSceneVideoResult(
                  sceneId,
                  parsed.videoUrl as string,
                  parsed.prompt as string,
                );
              }
              break;

            case 'video_error':
              if (sceneId !== 'full') {
                s.setSceneError(sceneId, parsed.message as string);
              }
              break;
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Video generation failed';
      if (sceneId !== 'full') {
        useCanvasStore.getState().setSceneError(sceneId, message);
      }
    }
  }, [deliverableId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { generateVideo, abort };
}
