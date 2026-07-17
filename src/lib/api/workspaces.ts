// Shared workspace CRUD calls — used by the workspace-entitlements hooks
// (src/hooks/use-workspace-entitlements.ts), consolidating what used to be
// 3 separate inline `fetch('/api/workspaces', ...)` implementations
// (OrganizationSwitcher, settings WorkspacesTab, AgencySettingsPage).

import { throwApiError } from './api-error';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  contentLanguage: string;
}

export interface WorkspacesListResponse {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
}

export async function fetchWorkspaces(): Promise<WorkspacesListResponse> {
  const res = await fetch('/api/workspaces', { cache: 'no-store' });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function createWorkspace(data: {
  name: string;
  contentLanguage?: string;
}): Promise<WorkspaceItem> {
  const res = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function deleteWorkspace(
  workspaceId: string,
): Promise<{ success: boolean; deleted: { id: string; name: string } }> {
  const res = await fetch('/api/workspaces', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function updateWorkspaceContentLanguage(
  workspaceId: string,
  contentLanguage: string,
): Promise<WorkspaceItem> {
  const res = await fetch('/api/workspaces', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, contentLanguage }),
  });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function updateWorkspaceName(
  workspaceId: string,
  name: string,
): Promise<WorkspaceItem> {
  const res = await fetch('/api/workspaces', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, name }),
  });
  if (!res.ok) await throwApiError(res);
  return res.json();
}
