'use client';

import React from 'react';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import { QualityScoreWidget } from './QualityScoreWidget';
import { ResearchInsightsSection } from './ResearchInsightsSection';
import { ContentChecklist } from './ContentChecklist';
import { VersionHistory } from './VersionHistory';
import { AutoSaveIndicator } from './AutoSaveIndicator';

// ─── Types ─────────────────────────────────────────────

interface RightPanelProps {
  deliverableId: string;
  contentTab: string | null;
}

// ─── Component ─────────────────────────────────────────

export function RightPanel({ deliverableId, contentTab }: RightPanelProps) {
  const isDirty = useContentStudioStore((s) => s.isDirty);
  const lastSavedAt = useContentStudioStore((s) => s.lastSavedAt);

  return (
    <aside data-testid="studio-right-panel" className="w-80 border-l bg-white overflow-y-auto p-4 space-y-6">
      {/* Auto-save status */}
      <AutoSaveIndicator lastSavedAt={lastSavedAt} isDirty={isDirty} />

      {/* Quality score */}
      <QualityScoreWidget deliverableId={deliverableId} contentTab={contentTab} />

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Research insights */}
      <ResearchInsightsSection deliverableId={deliverableId} />

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Content checklist */}
      <ContentChecklist deliverableId={deliverableId} />

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Version history */}
      <VersionHistory deliverableId={deliverableId} />
    </aside>
  );
}

export default RightPanel;
