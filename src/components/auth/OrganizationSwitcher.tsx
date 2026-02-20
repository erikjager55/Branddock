'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { Building2, ChevronDown, Check, Plus, Loader2, Briefcase } from 'lucide-react';

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: string | null;
}

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
}

export function OrganizationSwitcher() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOrgId = (session?.session as Record<string, unknown> | undefined)
    ?.activeOrganizationId as string | undefined;

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const isAgency = activeOrg?.metadata ? (() => {
    try {
      return JSON.parse(activeOrg.metadata as string)?.type === 'AGENCY';
    } catch { return false; }
  })() : false;

  // Determine org type from the Organization model
  // The org type is stored in the DB, not in metadata. We'll fetch it separately.
  const [orgTypes, setOrgTypes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authClient.organization.list();
      const orgList = (result.data ?? []) as OrgData[];
      setOrgs(orgList);

      // Fetch org types
      if (orgList.length > 0) {
        const typesRes = await fetch('/api/organization/members');
        // We actually need org type info — let's fetch workspaces which gives us data
      }

      // Fetch workspaces for active org
      if (activeOrgId) {
        const wsRes = await fetch('/api/workspaces');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspaces(wsData.workspaces ?? []);

          // Set active workspace (first one or from cookie)
          if (wsData.workspaces?.length > 0) {
            setActiveWorkspace(wsData.workspaces[0]);
          }
        }
      }
    } catch (err) {
      console.warn('[OrganizationSwitcher] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

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
    await authClient.organization.setActive({ organizationId: orgId });
    setIsOpen(false);
    window.location.reload();
  };

  const handleSwitchWorkspace = async (workspace: WorkspaceData) => {
    const res = await fetch('/api/workspace/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: workspace.id }),
    });

    if (res.ok) {
      setActiveWorkspace(workspace);
      setIsOpen(false);
      window.location.reload();
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      if (res.ok) {
        const workspace = await res.json();
        setWorkspaces((prev) => [...prev, workspace]);
        setNewWorkspaceName('');
        setShowNewWorkspace(false);
        // Switch to the new workspace
        await handleSwitchWorkspace(workspace);
      } else {
        const err = await res.json();
        alert(err.error ?? 'Failed to create workspace');
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setIsCreating(false);
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
        <Building2 className="h-4 w-4 text-teal-600" />
        <div className="flex flex-col items-start">
          <span className="font-medium text-gray-900 truncate max-w-[160px]">
            {activeOrg?.name ?? 'Select organization'}
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
                Organizations
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
                    <Check className="h-4 w-4 text-teal-600 flex-shrink-0" />
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
                Workspaces
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
                    <Check className="h-4 w-4 text-teal-600 flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* New Workspace button (agencies with owner/admin role) */}
              {workspaces.length >= 1 && (
                <>
                  {showNewWorkspace ? (
                    <div className="px-3 py-2 flex items-center gap-2">
                      <input
                        data-testid="new-workspace-input"
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                        placeholder="Workspace name..."
                        className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        autoFocus
                      />
                      <button
                        onClick={handleCreateWorkspace}
                        disabled={isCreating || !newWorkspaceName.trim()}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                      >
                        {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                      </button>
                    </div>
                  ) : (
                    <button
                      data-testid="new-workspace-button"
                      onClick={() => setShowNewWorkspace(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left text-sm text-teal-600"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New workspace</span>
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
