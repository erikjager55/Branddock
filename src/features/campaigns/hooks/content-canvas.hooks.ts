// =============================================================
// Content Canvas TanStack Query hooks — bulk actions
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkApprove, bulkPublish, exportDeliverables } from '../api/content-canvas.api';
import { campaignKeys } from './index';

/** Bulk approve/submit/request-changes */
export function useBulkApprove(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, action, note }: {
      ids: string[];
      action: 'submit' | 'approve' | 'request-changes';
      note?: string;
    }) => bulkApprove(campaignId, ids, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.deliverables(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

/** Bulk publish approved deliverables */
export function useBulkPublish(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, scheduledDate }: {
      ids: string[];
      scheduledDate?: string;
    }) => bulkPublish(campaignId, ids, scheduledDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.deliverables(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

/** Export selected deliverables as plain text */
export function useExportDeliverables(campaignId: string) {
  return useMutation({
    mutationFn: (ids: string[]) => exportDeliverables(campaignId, ids),
  });
}
