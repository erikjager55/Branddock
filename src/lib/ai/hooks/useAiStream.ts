'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseSSEStream } from '../streaming';
import { getReadableErrorMessage } from '../error-handler';

// ─── Types ─────────────────────────────────────────────────

export interface UseAiStreamReturn {
  /** Accumulated streamed text */
  data: string;
  /** Whether streaming is in progress */
  isStreaming: boolean;
  /** Error if the stream failed */
  error: Error | null;
  /** Start streaming with optional request body */
  startStream: (body?: unknown) => void;
  /** Abort the current stream */
  abort: () => void;
}

// ─── Hook ──────────────────────────────────────────────────

/**
 * Client-side hook for consuming a streaming AI endpoint.
 *
 * Usage:
 *   const { data, isStreaming, startStream, abort } = useAiStream('/api/ai/chat');
 *   startStream({ messages: [...] });
 */
export function useAiStream(endpoint: string): UseAiStreamReturn {
  const [data, setData] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    (body?: unknown) => {
      // Abort any in-flight stream
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setData('');
      setError(null);
      setIsStreaming(true);

      (async () => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            const message = body?.error || getReadableErrorMessage(new Error(`${response.status}`));
            throw new Error(message);
          }

          for await (const chunk of parseSSEStream(response)) {
            if (controller.signal.aborted) break;
            setData((prev) => prev + chunk);
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          setIsStreaming(false);
        }
      })();
    },
    [endpoint],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { data, isStreaming, error, startStream, abort };
}
