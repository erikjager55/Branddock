'use client';

import React from 'react';
import { QualityScoreWidget } from './QualityScoreWidget';
import { ResearchInsightsSection } from './ResearchInsightsSection';
import { ContentChecklist } from './ContentChecklist';
import { VersionHistory } from './VersionHistory';
import { STUDIO } from '@/lib/constants/design-tokens';

// ─── Types ─────────────────────────────────────────────

interface RightPanelProps {
  deliverableId: string;
}

// ─── Component ─────────────────────────────────────────

export function RightPanel({ deliverableId }: RightPanelProps) {
  return (
    <aside data-testid="studio-right-panel" className={`${STUDIO.panel.right} flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-6`}>
      {/* Quality score */}
      <QualityScoreWidget deliverableId={deliverableId} />

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
