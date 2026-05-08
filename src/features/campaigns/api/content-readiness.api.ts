import type { ContentReadiness } from '@/lib/learning-loop/content-readiness';

export type { ContentReadiness };

export async function fetchContentReadiness(
  deliverableId: string,
): Promise<ContentReadiness> {
  const res = await fetch(`/api/studio/${deliverableId}/readiness`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch readiness (${res.status})`);
  return res.json();
}

export interface PublishWithOverrideBody {
  reason: string;
  scheduledPublishDate?: string;
  publishNow?: boolean;
  publishedVia?: string;
}

export async function publishContentWithOverride(
  deliverableId: string,
  body: PublishWithOverrideBody,
) {
  const res = await fetch(`/api/studio/${deliverableId}/publish-with-override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Override publish failed' }));
    throw new Error(err.error ?? 'Override publish failed');
  }
  return res.json();
}
