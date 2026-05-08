import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContentReadiness,
  publishContentWithOverride,
  type PublishWithOverrideBody,
} from '../api/content-readiness.api';
import { canvasKeys } from './canvas.hooks';

export const contentReadinessKeys = {
  all: ['content-readiness'] as const,
  detail: (deliverableId: string) =>
    ['content-readiness', deliverableId] as const,
};

const DISABLED_KEY = ['content-readiness', '__disabled__'] as const;

/**
 * Fetch publish-readiness state for a deliverable. staleTime=10s so the badge
 * stays current as fidelity-scores land async after AI-generation.
 */
export function useContentReadiness(deliverableId: string | null) {
  return useQuery({
    queryKey: deliverableId
      ? contentReadinessKeys.detail(deliverableId)
      : DISABLED_KEY,
    queryFn: () => fetchContentReadiness(deliverableId!),
    enabled: !!deliverableId,
    staleTime: 10 * 1000,
  });
}

/** Override the QA-gate with a logged reason. Refreshes deliverable + readiness on success. */
export function usePublishWithOverride(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PublishWithOverrideBody) =>
      publishContentWithOverride(deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentReadinessKeys.detail(deliverableId) });
      qc.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) });
    },
  });
}
