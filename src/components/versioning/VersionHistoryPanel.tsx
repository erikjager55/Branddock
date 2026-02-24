'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  X,
  RotateCcw,
  Save,
  Lock,
  Sparkles,
  Upload,
  History,
} from 'lucide-react';
import type { VersionedResourceType, VersionChangeType } from '@prisma/client';
import { useVersionHistory, useRestoreVersion } from '@/hooks/useVersionHistory';

interface VersionHistoryPanelProps {
  resourceType: VersionedResourceType;
  resourceId: string;
  onClose: () => void;
  onRestore?: () => void;
}

const CHANGE_TYPE_CONFIG: Record<
  VersionChangeType,
  { icon: typeof Save; label: string; color: string }
> = {
  MANUAL_SAVE: { icon: Save, label: 'Saved', color: 'text-blue-600' },
  AUTO_SAVE: { icon: Save, label: 'Auto-saved', color: 'text-gray-500' },
  LOCK_BASELINE: { icon: Lock, label: 'Locked', color: 'text-amber-600' },
  AI_GENERATED: { icon: Sparkles, label: 'AI Generated', color: 'text-purple-600' },
  RESTORE: { icon: RotateCcw, label: 'Restored', color: 'text-emerald-600' },
  IMPORT: { icon: Upload, label: 'Imported', color: 'text-cyan-600' },
};

/** Slide-out panel showing version history with restore capability */
export function VersionHistoryPanel({
  resourceType,
  resourceId,
  onClose,
  onRestore,
}: VersionHistoryPanelProps) {
  const { data: versions, isLoading } = useVersionHistory(resourceType, resourceId);
  const restoreMutation = useRestoreVersion(resourceType, resourceId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleRestore = async (versionId: string) => {
    await restoreMutation.mutateAsync(versionId);
    setConfirmId(null);
    onRestore?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Version History
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}

          {!isLoading && (!versions || versions.length === 0) && (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <History className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No versions yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Versions are created when you save, lock, or use AI features.
              </p>
            </div>
          )}

          {versions && versions.length > 0 && (
            <div className="divide-y divide-gray-100">
              {versions.map((v, idx) => {
                const config = CHANGE_TYPE_CONFIG[v.changeType];
                const Icon = config.icon;
                const isLatest = idx === 0;
                const isConfirming = confirmId === v.id;

                return (
                  <div key={v.id} className="px-5 py-3.5 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {v.label ?? `v${v.version}.0`}
                          </span>
                          {isLatest && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {config.label}
                          {v.changeNote ? ` — ${v.changeNote}` : ''}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                          <span>
                            {formatDistanceToNow(new Date(v.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          {v.createdBy?.name && (
                            <>
                              <span>·</span>
                              <span>{v.createdBy.name}</span>
                            </>
                          )}
                          {v.diff && (
                            <>
                              <span>·</span>
                              <span>
                                {Object.keys(v.diff).length} field
                                {Object.keys(v.diff).length !== 1 ? 's' : ''}{' '}
                                changed
                              </span>
                            </>
                          )}
                        </div>

                        {/* Restore button (not on latest) */}
                        {!isLatest && (
                          <div className="mt-2">
                            {isConfirming ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-600">
                                  Restore to this version?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRestore(v.id)}
                                  disabled={restoreMutation.isPending}
                                  className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {restoreMutation.isPending
                                    ? 'Restoring...'
                                    : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmId(null)}
                                  className="rounded px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmId(v.id)}
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restore
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
