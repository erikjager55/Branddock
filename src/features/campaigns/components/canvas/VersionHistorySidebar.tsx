'use client';

import { useState } from 'react';
import { History, Sparkles, User, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import {
  useContentVersions,
  useRestoreContentVersion,
} from '../../hooks/content-versions.hooks';
import type { ContentVersionListItem } from '../../api/content-versions.api';
import { Button } from '@/components/shared';

interface VersionHistorySidebarProps {
  deliverableId: string;
  /** Called when a restore completes — caller can refresh deliverable state. */
  onRestored?: (newVersionId: string) => void;
}

/**
 * Side panel listing all ContentVersions for a deliverable. Shows AI vs USER
 * provenance, edit-type chip for user-edits, fidelity score (if scored), and
 * a restore button per version.
 *
 * Wiring: import in CanvasPage and render alongside the main content area.
 * Width recommendation: w-80 (320px), flex-shrink-0.
 */
export function VersionHistorySidebar({ deliverableId, onRestored }: VersionHistorySidebarProps) {
  const { data, isLoading, error } = useContentVersions(deliverableId);
  const restoreMutation = useRestoreContentVersion(deliverableId);
  const [confirmingRestore, setConfirmingRestore] = useState<string | null>(null);

  const handleRestore = async (versionId: string) => {
    try {
      const newVersion = await restoreMutation.mutateAsync(versionId);
      setConfirmingRestore(null);
      onRestored?.(newVersion.id);
    } catch (err) {
      console.error('[VersionHistorySidebar] restore failed', err);
    }
  };

  return (
    <aside className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <History className="h-4 w-4 text-gray-600" />
        <h2 className="text-sm font-semibold text-gray-900">Version history</h2>
        {data && (
          <span className="text-xs text-gray-500 ml-auto">{data.total} versies</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <LoadingState />}
        {error && <ErrorState message={(error as Error).message} />}
        {data && data.versions.length === 0 && <EmptyState />}
        {data && data.versions.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {data.versions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                onRestore={() => setConfirmingRestore(v.id)}
                isRestoring={restoreMutation.isPending && confirmingRestore === v.id}
                disabled={restoreMutation.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      {confirmingRestore && (
        <RestoreConfirm
          onConfirm={() => handleRestore(confirmingRestore)}
          onCancel={() => setConfirmingRestore(null)}
          isPending={restoreMutation.isPending}
        />
      )}
    </aside>
  );
}

function VersionRow({
  version,
  onRestore,
  isRestoring,
  disabled,
}: {
  version: ContentVersionListItem;
  onRestore: () => void;
  isRestoring: boolean;
  disabled: boolean;
}) {
  const isAi = version.createdBy === 'AI';
  const Icon = isAi ? Sparkles : User;
  const iconColor = isAi ? 'text-emerald-600' : 'text-blue-600';
  const date = new Date(version.createdAt);
  const dateLabel = date.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-900">v{version.versionNumber}</span>
            <span className="text-xs text-gray-500">{dateLabel}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded ${isAi ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
              {isAi ? 'AI' : 'User'}
            </span>
            {version.editType && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                {version.editType}
              </span>
            )}
            {typeof version.qualityScore === 'number' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                {Math.round(version.qualityScore)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRestore}
          disabled={disabled}
          aria-label={`Restore v${version.versionNumber}`}
        >
          {isRestoring ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      Laden…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-sm text-red-700 bg-red-50 border-l-2 border-red-400 mx-3 my-3 rounded">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">Versies laden mislukt</div>
          <div className="text-xs text-red-600 mt-1 break-words">{message}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-12 text-center text-sm text-gray-500">
      <History className="h-8 w-8 mx-auto mb-2 text-gray-300" />
      Nog geen versies. Genereer of bewerk content om hier een trail op te bouwen.
    </div>
  );
}

function RestoreConfirm({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-amber-50 px-4 py-3">
      <p className="text-xs text-amber-900 mb-2">
        Restore overschrijft de huidige content. Deze actie wordt zelf vastgelegd als nieuwe versie.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Restoring…
            </>
          ) : (
            'Bevestig restore'
          )}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
          Annuleer
        </Button>
      </div>
    </div>
  );
}
