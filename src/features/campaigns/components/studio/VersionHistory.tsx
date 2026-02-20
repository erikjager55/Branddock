'use client';

import React from 'react';
import { Clock, Save } from 'lucide-react';
import { Button, Badge } from '@/components/shared';
import { useVersions, useRestoreVersion, useCreateVersion } from '../../hooks/studio.hooks';

// ─── Types ─────────────────────────────────────────────

interface VersionHistoryProps {
  deliverableId: string;
}

// ─── Helper ────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs === 1) return '1 hour ago';
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// ─── Component ─────────────────────────────────────────

export function VersionHistory({ deliverableId }: VersionHistoryProps) {
  const { data: versions, isLoading } = useVersions(deliverableId);
  const restoreMutation = useRestoreVersion(deliverableId);
  const createMutation = useCreateVersion(deliverableId);

  const handleRestore = (versionId: string, versionNumber: number) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore version v${versionNumber}? This will replace the current content.`
    );
    if (confirmed) {
      restoreMutation.mutate(versionId);
    }
  };

  return (
    <div data-testid="version-history" className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={Save}
          onClick={() => createMutation.mutate()}
          isLoading={createMutation.isPending}
        >
          Save Version
        </Button>
      </div>

      {/* Version list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : !Array.isArray(versions) || versions.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No versions saved yet.</p>
      ) : (
        <div className="space-y-1.5">
          {versions.map((version) => (
            <button
              key={version.id}
              onClick={() => handleRestore(version.id, version.versionNumber)}
              disabled={restoreMutation.isPending}
              className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  v{version.versionNumber}
                </span>
                <span className="text-xs text-gray-500">
                  {getRelativeTime(version.createdAt)}
                </span>
              </div>
              {version.qualityScore != null && (
                <Badge
                  variant={version.qualityScore >= 80 ? 'success' : version.qualityScore >= 60 ? 'warning' : 'danger'}
                  size="sm"
                >
                  {Math.round(version.qualityScore)}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default VersionHistory;
