// =============================================================
// Publish Channels API — fetch functions
// =============================================================

export interface PublishChannelSummary {
  id: string;
  platform: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  lastPublishedAt: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
}

export interface PublishChannelDetail extends PublishChannelSummary {
  credentials: Record<string, unknown> | null;
}

export interface CreateChannelBody {
  platform: string;
  provider: string;
  label?: string;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface UpdateChannelBody {
  label?: string;
  isActive?: boolean;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

const BASE = '/api/settings/publish-channels';

export async function fetchPublishChannels(): Promise<PublishChannelSummary[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch channels');
  const data = await res.json();
  return data.channels ?? [];
}

export async function fetchPublishChannelDetail(id: string): Promise<PublishChannelDetail> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch channel');
  const data = await res.json();
  return data.channel;
}

export async function createPublishChannel(body: CreateChannelBody): Promise<PublishChannelSummary> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create channel');
  }
  const data = await res.json();
  return data.channel;
}

export async function updatePublishChannel(id: string, body: UpdateChannelBody): Promise<PublishChannelSummary> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update channel');
  const data = await res.json();
  return data.channel;
}

export async function deletePublishChannel(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete channel');
}
