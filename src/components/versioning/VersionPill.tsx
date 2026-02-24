'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import type { VersionedResourceType } from '@prisma/client';
import { useVersionHistory } from '@/hooks/useVersionHistory';
import { VersionHistoryPanel } from './VersionHistoryPanel';

interface VersionPillProps {
  resourceType: VersionedResourceType;
  resourceId: string;
  /** Additional query keys to invalidate after restore */
  onRestore?: () => void;
}

/** Small button showing version count — opens VersionHistoryPanel on click */
export function VersionPill({ resourceType, resourceId, onRestore }: VersionPillProps) {
  const [open, setOpen] = useState(false);
  const { data: versions } = useVersionHistory(resourceType, resourceId);

  const count = versions?.length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        {count} {count === 1 ? 'version' : 'versions'}
      </button>

      {open && (
        <VersionHistoryPanel
          resourceType={resourceType}
          resourceId={resourceId}
          onClose={() => setOpen(false)}
          onRestore={onRestore}
        />
      )}
    </>
  );
}
