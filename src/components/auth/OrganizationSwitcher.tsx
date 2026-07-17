'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient, useSession } from '@/lib/auth-client';
import { Building2, ChevronDown, Check, Plus, Loader2, Briefcase } from 'lucide-react';
import { clearAllStorage } from '@/utils/storage';
import {
  WORKSPACE_SWITCH_CHANNEL,
  type WorkspaceSwitchMessage,
} from '@/components/shared/WorkspaceSwitchGuard';
import { useWorkspaceEntitlements, useCreateWorkspace } from '@/hooks/use-workspace-entitlements';
import { ApiError, translateApiError } from '@/lib/api/api-error';

/**
 * Meld andere open tabs dat de workspace-cookie is gewijzigd, zodat de
 * WorkspaceSwitchGuard daar een blocking herlaad-overlay kan tonen (de
 * reload hieronder ververst alleen de eigen tab — zombie-tab fix, audit
 * docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
 */
function broadcastWorkspaceSwitch(workspaceId: string | null, name: string | null) {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(WORKSPACE_SWITCH_CHANNEL);
    const message: WorkspaceSwitchMessage = { type: 'workspace-switched', workspaceId, name };
    channel.postMessage(message);
    channel.close();
  } catch {
    // Broadcast is best-effort — een falende channel mag de switch niet blokkeren.
  }
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: string | null;
}

export function OrganizationSwitcher() {
  const { t } = useTranslation(['auth-chrome', 'entitlement-errors']);
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOrgId = (session?.session as Record<string, unknown> | undefined)
    ?.activeOrganizationId as string | undefined;

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  const { workspaces, activeWorkspaceId, atLimit, current, limit, isLoading: isLoadingWorkspaces } =
    useWorkspaceEntitlements();
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? workspaces[0] ?? null;
  const createWorkspace = useCreateWorkspace();
  const isLoading = isLoadingOrgs || isLoadingWorkspaces;

  const loadOrgs = useCallback(async () => {
    setIsLoadingOrgs(true);
    try {
      const result = await authClient.organization.list();
      setOrgs((result.data ?? []) as OrgData[]);
    } catch (err) {
      console.warn('[OrganizationSwitcher] Failed to load organizations:', err);
    } finally {
      setIsLoadingOrgs(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadOrgs();
    }
  }, [session, loadOrgs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowNewWorkspace(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSwitchOrg = async (orgId: string) => {
    try {
      // Clear the workspace cookie first — it belongs to the old org
      await fetch('/api/workspace/switch', { method: 'DELETE' });
      await authClient.organization.setActive({ organizationId: orgId });
      setIsOpen(false);
      broadcastWorkspaceSwitch(null, null);
      // Clear client-side localStorage to prevent stale data from previous workspace
      clearAllStorage();
      window.location.reload();
    } catch (err) {
      console.error('[OrganizationSwitcher] Failed to switch organization:', err);
    }
  };

  const handleSwitchWorkspace = async (workspace: { id: string; name: string }) => {
    try {
      const res = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });

      if (res.ok) {
        setIsOpen(false);
        broadcastWorkspaceSwitch(workspace.id, workspace.name);
        // Clear client-side localStorage to prevent stale data from previous workspace
        clearAllStorage();
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('[OrganizationSwitcher] Workspace switch failed:', data.error);
      }
    } catch (err) {
      console.error('[OrganizationSwitcher] Failed to switch workspace:', err);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setCreateError(null);

    try {
      const workspace = await createWorkspace.mutateAsync({ name: newWorkspaceName.trim() });
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
      // Switch to the new workspace
      await handleSwitchWorkspace(workspace);
    } catch (err) {
      setCreateError(err instanceof ApiError ? translateApiError(t, err) : t('orgSwitcher.createFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (orgs.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative" data-testid="org-switcher">
      {/* Trigger Button */}
      <button
        data-testid="org-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
      >
        <Building2 className="h-4 w-4 text-primary" />
        <div className="flex flex-col items-start">
          <span className="font-medium text-gray-900 truncate max-w-[160px]">
            {activeOrg?.name ?? t('orgSwitcher.selectOrganization')}
          </span>
          {activeWorkspace && workspaces.length > 1 && (
            <span className="text-xs text-gray-500 truncate max-w-[160px]">
              {activeWorkspace.name}
            </span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div data-testid="org-switcher-dropdown" className="absolute top-full left-0 mt-1 z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Organizations section */}
          {orgs.length > 1 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('orgSwitcher.organizationsHeading')}
              </div>
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {org.name}
                    </div>
                  </div>
                  {org.id === activeOrgId && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
              <div className="my-1 h-px bg-gray-100" />
            </>
          )}

          {/* Workspaces section (only show if multiple) */}
          {workspaces.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('orgSwitcher.workspacesHeading')}
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  data-testid={`workspace-item-${ws.id}`}
                  onClick={() => handleSwitchWorkspace(ws)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">
                      {ws.name}
                    </div>
                  </div>
                  {ws.id === activeWorkspace?.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* New Workspace: proactively disabled at the plan limit — no
                  more clicking through to a raw English 403 after the fact. */}
              {workspaces.length >= 1 && (
                <>
                  {showNewWorkspace ? (
                    <div className="px-3 py-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          data-testid="new-workspace-input"
                          type="text"
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                          placeholder={t('orgSwitcher.newWorkspacePlaceholder')}
                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                        />
                        <button
                          onClick={handleCreateWorkspace}
                          disabled={createWorkspace.isPending || !newWorkspaceName.trim()}
                          className="text-sm text-primary hover:text-primary-700 font-medium disabled:opacity-50"
                        >
                          {createWorkspace.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            t('orgSwitcher.add')
                          )}
                        </button>
                      </div>
                      {createError && <p className="text-xs text-red-600">{createError}</p>}
                    </div>
                  ) : (
                    <button
                      data-testid="new-workspace-button"
                      onClick={() => setShowNewWorkspace(true)}
                      disabled={atLimit}
                      title={atLimit ? t('orgSwitcher.newWorkspaceLimitReached', { current, limit }) : undefined}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left text-sm text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('orgSwitcher.newWorkspace')}</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
