'use client';

import { useState, useCallback } from 'react';
import { getReadableErrorMessage } from '../error-handler';

// ─── Types ─────────────────────────────────────────────────

export interface UseAiMutationReturn<TInput, TOutput> {
  /** Trigger the mutation */
  mutate: (input: TInput) => Promise<TOutput | undefined>;
  /** Response data (last successful call) */
  data: TOutput | null;
  /** Whether a request is in flight */
  isLoading: boolean;
  /** Error from the last call */
  error: Error | null;
}

// ─── Hook ──────────────────────────────────────────────────

/**
 * Client-side hook for non-streaming AI calls.
 *
 * Usage:
 *   const { mutate, data, isLoading } = useAiMutation<AnalysisInput, AnalysisOutput>('/api/ai/analyze');
 *   const result = await mutate({ text: '...' });
 */
export function useAiMutation<TInput, TOutput>(
  endpoint: string,
  timeoutMs = 60_000,
): UseAiMutationReturn<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput | undefined> => {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message = body?.error || getReadableErrorMessage(new Error(`${response.status}`));
          throw new Error(message);
        }

        const result = (await response.json()) as TOutput;
        setData(result);
        return result;
      } catch (err) {
        const wrapped =
          (err as Error).name === 'AbortError'
            ? new Error(getReadableErrorMessage({ type: 'timeout', message: '', retryable: true }))
            : err instanceof Error
              ? err
              : new Error(String(err));
        setError(wrapped);
        return undefined;
      } finally {
        clearTimeout(timer);
        setIsLoading(false);
      }
    },
    [endpoint, timeoutMs],
  );

  return { mutate, data, isLoading, error };
}
