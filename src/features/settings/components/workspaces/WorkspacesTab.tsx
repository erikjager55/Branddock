'use client';

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Trash2, Loader2, Plus } from 'lucide-react';

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export function WorkspacesTab() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces ?? []);
        setActiveWorkspaceId(data.activeWorkspaceId ?? null);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleDelete = async (ws: WorkspaceItem) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${ws.name}"?\n\nAll brand assets, personas, campaigns and other data in this workspace will be permanently deleted.`
      )
    ) {
      return;
    }

    setDeletingId(ws.id);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ws.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to delete workspace');
        return;
      }

      if (ws.id === activeWorkspaceId) {
        window.location.reload();
        return;
      }

      await loadWorkspaces();
    } catch {
      setError('Failed to delete workspace');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create workspace');
        return;
      }

      setNewName('');
      setShowCreate(false);
      await loadWorkspaces();
    } catch {
      setError('Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Workspaces</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage workspaces in your organization. Each workspace has its own brand assets, personas, campaigns and other data.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex items-end gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="flex-1 space-y-1">
            <label htmlFor="ws-name" className="text-sm font-medium text-gray-700">
              Workspace name
            </label>
            <input
              id="ws-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Client Name"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(''); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="space-y-2">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{ws.name}</span>
                  {ws.id === activeWorkspaceId && (
                    <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{ws.slug}</span>
              </div>
            </div>

            <button
              className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-colors"
              disabled={deletingId === ws.id || workspaces.length <= 1}
              onClick={() => handleDelete(ws)}
              title={
                workspaces.length <= 1
                  ? 'Cannot delete the last workspace'
                  : `Delete ${ws.name}`
              }
            >
              {deletingId === ws.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
