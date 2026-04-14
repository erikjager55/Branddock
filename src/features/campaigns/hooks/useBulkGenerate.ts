"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bulkGenerateSSE } from "../api/campaigns.api";
import { campaignKeys } from "./index";
import type { BulkGenerateProgressEvent, BulkGenerateCompleteEvent } from "@/types/campaign";

export type BulkItemStatus = 'pending' | 'generating' | 'complete' | 'error';

export interface BulkGenerateState {
  isGenerating: boolean;
  progress: Map<string, { title: string; status: BulkItemStatus; message?: string }>;
  result: BulkGenerateCompleteEvent | null;
  error: string | null;
}

export function useBulkGenerate(campaignId: string) {
  const qc = useQueryClient();
  const abortRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<BulkGenerateState>({
    isGenerating: false,
    progress: new Map(),
    result: null,
    error: null,
  });

  const start = useCallback((deliverableIds?: string[]) => {
    setState({
      isGenerating: true,
      progress: new Map(),
      result: null,
      error: null,
    });

    const { abort } = bulkGenerateSSE(
      campaignId,
      deliverableIds,
      (eventType, data) => {
        if (eventType === 'start') {
          const startData = data as { deliverables: Array<{ id: string; title: string }> };
          setState((prev) => {
            const progress = new Map(prev.progress);
            for (const d of startData.deliverables) {
              progress.set(d.id, { title: d.title, status: 'pending' });
            }
            return { ...prev, progress };
          });
        }

        if (eventType === 'progress') {
          const p = data as BulkGenerateProgressEvent;
          setState((prev) => {
            const progress = new Map(prev.progress);
            progress.set(p.deliverableId, {
              title: p.title,
              status: p.status === 'generating' ? 'generating' : p.status === 'complete' ? 'complete' : 'error',
              message: p.message,
            });
            return { ...prev, progress };
          });
        }

        if (eventType === 'complete') {
          const result = data as BulkGenerateCompleteEvent;
          setState((prev) => ({ ...prev, isGenerating: false, result }));
          // Refresh deliverables list
          qc.invalidateQueries({ queryKey: campaignKeys.deliverables(campaignId) });
          qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
        }

        if (eventType === 'error') {
          const err = data as { message: string };
          setState((prev) => ({ ...prev, isGenerating: false, error: err.message }));
        }
      },
      (error) => {
        setState((prev) => ({ ...prev, isGenerating: false, error }));
      },
    );

    abortRef.current = abort;
  }, [campaignId, qc]);

  const abort = useCallback(() => {
    abortRef.current?.();
    setState((prev) => ({ ...prev, isGenerating: false }));
  }, []);

  return { ...state, start, abort };
}
