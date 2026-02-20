'use client';

import React from 'react';

// ─── Types ─────────────────────────────────────────────

interface AutoSaveIndicatorProps {
  lastSavedAt: string | null;
  isDirty: boolean;
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
  return `${diffHrs} hours ago`;
}

// ─── Component ─────────────────────────────────────────

export function AutoSaveIndicator({ lastSavedAt, isDirty }: AutoSaveIndicatorProps) {
  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Saving...
      </div>
    );
  }

  if (lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Auto-saved {getRelativeTime(lastSavedAt)}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="w-2 h-2 rounded-full bg-gray-300" />
      Not saved yet
    </div>
  );
}

export default AutoSaveIndicator;
