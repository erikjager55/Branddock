import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCanvasComponents,
  selectVariant,
  updateComponentContent,
  updateApprovalStatus,
  publishDeliverable,
  deriveDeliverable,
} from '../api/canvas.api';
import type { ApprovalStatus } from '../types/canvas.types';

export const canvasKeys = {
  all: ['canvas'] as const,
  components: (deliverableId: string) => ['canvas', deliverableId, 'components'] as const,
};

/** Fetch existing DeliverableComponent records for the canvas */
export function useCanvasComponents(deliverableId: string | null) {
  return useQuery({
    queryKey: canvasKeys.components(deliverableId ?? ''),
    queryFn: () => fetchCanvasComponents(deliverableId!),
    enabled: !!deliverableId,
  });
}

/** Select a variant (deselects siblings in same variantGroup) */
export function useSelectVariant(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (componentId: string) => selectVariant(deliverableId, componentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) });
    },
  });
}

/** Update component content (inline edit) */
export function useUpdateComponentContent(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, content }: { componentId: string; content: string }) =>
      updateComponentContent(deliverableId, componentId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) });
    },
  });
}

/** Update approval status (state machine transitions) */
export function useUpdateApproval(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }: { status: ApprovalStatus; note?: string }) =>
      updateApprovalStatus(deliverableId, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: canvasKeys.all });
    },
  });
}

/** Publish an approved deliverable */
export function usePublishDeliverable(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduledPublishDate?: string) =>
      publishDeliverable(deliverableId, scheduledPublishDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: canvasKeys.all });
    },
  });
}

/** Create a derivative deliverable for another platform */
export function useDeriveDeliverable(deliverableId: string) {
  return useMutation({
    mutationFn: ({ targetPlatform, targetFormat, title }: {
      targetPlatform: string;
      targetFormat: string;
      title?: string;
    }) => deriveDeliverable(deliverableId, targetPlatform, targetFormat, title),
  });
}
