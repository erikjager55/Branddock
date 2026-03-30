import type {
  CanvasComponentResponse,
  ApprovalResponse,
  ApprovalStatus,
  PublishResponse,
  DeriveResponse,
} from '../types/canvas.types';

/** Fetch all DeliverableComponent records for a deliverable */
export async function fetchCanvasComponents(deliverableId: string): Promise<CanvasComponentResponse[]> {
  const res = await fetch(`/api/studio/${deliverableId}/components`);
  if (!res.ok) throw new Error('Failed to fetch canvas components');
  const data = await res.json();
  return data.components ?? [];
}

/** Select a variant — sets isSelected=true and deselects siblings */
export async function selectVariant(deliverableId: string, componentId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/components/${componentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSelected: true }),
  });
  if (!res.ok) throw new Error('Failed to select variant');
}

/** Update a component's generated content (inline editing) */
export async function updateComponentContent(
  deliverableId: string,
  componentId: string,
  content: string,
): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/components/${componentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generatedContent: content }),
  });
  if (!res.ok) throw new Error('Failed to update component content');
}

/** Update approval status for a deliverable */
export async function updateApprovalStatus(
  deliverableId: string,
  status: ApprovalStatus,
  note?: string,
): Promise<ApprovalResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update approval status' }));
    throw new Error(err.error ?? 'Failed to update approval status');
  }
  return res.json();
}

/** Publish an approved deliverable */
export async function publishDeliverable(
  deliverableId: string,
  scheduledPublishDate?: string,
): Promise<PublishResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledPublishDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to publish' }));
    throw new Error(err.error ?? 'Failed to publish');
  }
  return res.json();
}

/** Transform selected text using an AI action */
export async function inlineTransform(
  deliverableId: string,
  selectedText: string,
  action: 'shorter' | 'urgent' | 'brand_voice' | 'simplify',
  fullContent?: string,
): Promise<{ transformedText: string }> {
  const res = await fetch(`/api/studio/${deliverableId}/inline-transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedText, action, fullContent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to transform text' }));
    throw new Error(err.error ?? 'Failed to transform text');
  }
  return res.json();
}

/** Create a derivative deliverable for another platform */
export async function deriveDeliverable(
  deliverableId: string,
  targetPlatform: string,
  targetFormat: string,
  title?: string,
): Promise<DeriveResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/derive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPlatform, targetFormat, title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to derive deliverable' }));
    throw new Error(err.error ?? 'Failed to derive deliverable');
  }
  return res.json();
}
