'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Trash2, Loader2, Plus, ArrowUpRight, Pencil, Check, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ProgressBar } from '@/components/shared';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWorkspaceEntitlements, useCreateWorkspace } from '@/hooks/use-workspace-entitlements';
import { deleteWorkspace, updateWorkspaceContentLanguage, updateWorkspaceName } from '@/lib/api/workspaces';
import { ApiError, translateApiError } from '@/lib/api/api-error';
import { formatLimit } from '@/lib/constants/plan-limits';

// Content-taal-opties — endoniemen (getoond in eigen taal, niet vertaald).
// Los van de Display-language (per gebruiker, in Settings → Appearance).
const CONTENT_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
];

export function WorkspacesTab() {
  const { t } = useTranslation(['settings-misc', 'entitlement-errors']);
  const queryClient = useQueryClient();
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const { workspaces, activeWorkspaceId, current, limit, isUnlimited, atLimit, isLoading } =
    useWorkspaceEntitlements();
  const createWorkspace = useCreateWorkspace();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLang, setNewLang] = useState('en');
  const [savingLangId, setSavingLangId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchWorkspaces = () => queryClient.invalidateQueries({ queryKey: ['workspaces', 'list'] });

  const startRename = (ws: { id: string; name: string }) => {
    setRenamingId(ws.id);
    setRenameValue(ws.name);
    setError(null);
  };

  const handleRename = async (ws: { id: string; name: string }) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === ws.name) {
      setRenamingId(null);
      return;
    }
    setSavingRename(true);
    setError(null);
    try {
      await updateWorkspaceName(ws.id, trimmed);
      await refetchWorkspaces();
      setRenamingId(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? translateApiError(t, err)
          : t('workspaces.renameFailed', { defaultValue: 'Could not rename the workspace' }),
      );
    } finally {
      setSavingRename(false);
    }
  };

  const handleDelete = async (ws: { id: string; name: string }) => {
    if (!window.confirm(t('workspaces.deleteConfirm', { name: ws.name }))) {
      return;
    }

    setDeletingId(ws.id);
    setError(null);

    try {
      await deleteWorkspace(ws.id);
      if (ws.id === activeWorkspaceId) {
        window.location.reload();
        return;
      }
      await refetchWorkspaces();
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(t, err) : t('workspaces.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setError(null);

    try {
      await createWorkspace.mutateAsync({ name: newName.trim(), contentLanguage: newLang });
      setNewName('');
      setNewLang('en');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(t, err) : t('workspaces.createFailed'));
    }
  };

  const handleLanguageChange = async (ws: { id: string; contentLanguage: string }, contentLanguage: string) => {
    if (contentLanguage === ws.contentLanguage) return;
    setSavingLangId(ws.id);
    setError(null);
    try {
      await updateWorkspaceContentLanguage(ws.id, contentLanguage);
      await refetchWorkspaces();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? translateApiError(t, err)
          : t('workspaces.updateFailed', { defaultValue: 'Could not update the workspace' }),
      );
    } finally {
      setSavingLangId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const limitPct = !isUnlimited && limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const limitColor = limitPct > 80 ? ('red' as const) : limitPct >= 50 ? ('amber' as const) : ('teal' as const);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('workspaces.heading')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('workspaces.description')}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {t('workspaces.contentLanguageHelp', {
            defaultValue:
              'Content language is the language the AI writes in for a workspace — separate from your Display language (Settings → Appearance).',
          })}
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isUnlimited
              ? t('workspaces.workspaceCount', { count: current })
              : `${current} / ${formatLimit(limit)}`}
          </span>
          <button
            onClick={() => setShowCreate(!showCreate)}
            disabled={atLimit}
            title={atLimit ? t('workspaces.limitReached', { current, limit: formatLimit(limit) }) : undefined}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {t('workspaces.newWorkspace')}
          </button>
        </div>
        {!isUnlimited && (
          <div className="flex items-center gap-3">
            <ProgressBar value={limitPct} color={limitColor} size="sm" className="flex-1" />
            {atLimit && (
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium flex-shrink-0"
              >
                {t('upgradeCta', { ns: 'entitlement-errors' })}
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex items-end gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="flex-1 space-y-1">
            <label htmlFor="ws-name" className="text-sm font-medium text-gray-700">
              {t('workspaces.nameLabel')}
            </label>
            <input
              id="ws-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('workspaces.namePlaceholder')}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ws-lang-new" className="text-sm font-medium text-gray-700">
              {t('workspaces.contentLanguageLabel', { defaultValue: 'Content language' })}
            </label>
            <select
              id="ws-lang-new"
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            >
              {CONTENT_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={createWorkspace.isPending || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {createWorkspace.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('workspaces.create')}
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(''); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('workspaces.cancel')}
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
                {renamingId === ws.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(ws);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                      maxLength={60}
                      disabled={savingRename}
                      aria-label={t('workspaces.renameLabel', { defaultValue: 'Workspace name' })}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm font-medium focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleRename(ws)}
                      disabled={savingRename || !renameValue.trim()}
                      title={t('workspaces.renameSave', { defaultValue: 'Save name' })}
                      className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 disabled:opacity-40 transition-colors"
                    >
                      {savingRename ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      disabled={savingRename}
                      title={t('workspaces.cancel')}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ws.name}</span>
                    <button
                      onClick={() => startRename(ws)}
                      title={t('workspaces.renameTooltip', { defaultValue: 'Rename workspace' })}
                      data-testid={`workspace-rename-${ws.id}`}
                      className="rounded p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {ws.id === activeWorkspaceId && (
                      <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                        {t('workspaces.active')}
                      </span>
                    )}
                  </div>
                )}
                <span className="text-xs text-gray-500">{ws.slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor={`ws-lang-${ws.id}`} className="text-xs text-gray-500 whitespace-nowrap">
                  {t('workspaces.contentLanguageLabel', { defaultValue: 'Content language' })}
                </label>
                <select
                  id={`ws-lang-${ws.id}`}
                  value={ws.contentLanguage}
                  disabled={savingLangId === ws.id}
                  onChange={(e) => handleLanguageChange(ws, e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none disabled:opacity-50"
                >
                  {CONTENT_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
                {savingLangId === ws.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              </div>
              <button
                className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-colors"
                disabled={deletingId === ws.id || workspaces.length <= 1}
                onClick={() => handleDelete(ws)}
                title={
                  workspaces.length <= 1
                    ? t('workspaces.cannotDeleteLast')
                    : t('workspaces.deleteTooltip', { name: ws.name })
                }
              >
                {deletingId === ws.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
