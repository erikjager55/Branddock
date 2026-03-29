// =============================================================
// Content Canvas API — Bulk actions (campaign-level)
// =============================================================

export interface BulkApproveResult {
  id: string;
  success: boolean;
  newStatus?: string;
  error?: string;
}

export interface BulkPublishResult {
  id: string;
  success: boolean;
  publishedAt?: string;
  error?: string;
}

export interface ExportItem {
  id: string;
  title: string;
  text: string;
}

/** Bulk approve/submit/request-changes deliverables */
export async function bulkApprove(
  campaignId: string,
  deliverableIds: string[],
  action: 'submit' | 'approve' | 'request-changes',
  note?: string,
): Promise<{ results: BulkApproveResult[] }> {
  const res = await fetch(`/api/campaigns/${campaignId}/canvas/bulk-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deliverableIds, action, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bulk approve failed' }));
    throw new Error(err.error ?? 'Bulk approve failed');
  }
  return res.json();
}

/** Bulk publish approved deliverables */
export async function bulkPublish(
  campaignId: string,
  deliverableIds: string[],
  scheduledPublishDate?: string,
): Promise<{ results: BulkPublishResult[] }> {
  const res = await fetch(`/api/campaigns/${campaignId}/canvas/bulk-publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deliverableIds, scheduledPublishDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bulk publish failed' }));
    throw new Error(err.error ?? 'Bulk publish failed');
  }
  return res.json();
}

/** Export deliverables as plain text */
export async function exportDeliverables(
  campaignId: string,
  deliverableIds: string[],
): Promise<{ items: ExportItem[] }> {
  const res = await fetch(`/api/campaigns/${campaignId}/canvas/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deliverableIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error ?? 'Export failed');
  }
  return res.json();
}
