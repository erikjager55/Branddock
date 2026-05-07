import type { ContentVersion } from '@prisma/client';

export interface ContentVersionListItem {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: 'AI' | 'USER' | null;
  editType: string | null;
  editorUserId: string | null;
  primaryCallTraceId: string | null;
  diffSummary: unknown;
  qualityScore: number | null;
}

export interface ContentVersionDetail extends ContentVersion {
  fidelityScores: Array<{
    id: string;
    judgeIdentifier: string;
    compositeScore: number;
    thresholdMet: boolean;
    scoredAt: string;
    pillarScores: unknown;
  }>;
}

export async function listContentVersions(
  deliverableId: string,
  limit = 50,
): Promise<{ versions: ContentVersionListItem[]; total: number }> {
  const res = await fetch(`/api/content/${deliverableId}/versions?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to load versions (${res.status})`);
  return res.json();
}

export async function getContentVersion(
  deliverableId: string,
  versionId: string,
): Promise<ContentVersionDetail> {
  const res = await fetch(`/api/content/${deliverableId}/versions/${versionId}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to load version (${res.status})`);
  return res.json();
}

export async function createUserContentVersion(deliverableId: string): Promise<ContentVersion> {
  const res = await fetch(`/api/content/${deliverableId}/versions`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to create version (${res.status})`);
  return res.json();
}

export async function restoreContentVersion(
  deliverableId: string,
  versionId: string,
): Promise<ContentVersion> {
  const res = await fetch(`/api/content/${deliverableId}/versions/${versionId}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to restore version (${res.status})`);
  return res.json();
}
