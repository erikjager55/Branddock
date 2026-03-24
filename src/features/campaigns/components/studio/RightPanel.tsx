'use client';

import React, { useRef } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import { QualityScoreWidget } from './QualityScoreWidget';
import { ResearchInsightsSection } from './ResearchInsightsSection';
import { ContentChecklist } from './ContentChecklist';
import { VersionHistory } from './VersionHistory';
import { STUDIO } from '@/lib/constants/design-tokens';

// ─── Types ─────────────────────────────────────────────

interface RightPanelProps {
  deliverableId: string;
  contentType?: string;
}

// ─── Component ─────────────────────────────────────────

export function RightPanel({ deliverableId, contentType }: RightPanelProps) {
  const validationResult = useContentStudioStore((s) => s.validationResult);
  const checklistRef = useRef<HTMLDivElement>(null);

  const actionableWarnings = validationResult?.warnings.filter(
    (w) => w.severity === 'error' || w.severity === 'warning'
  ) ?? [];
  const errorCount = actionableWarnings.filter((w) => w.severity === 'error').length;
  const warningCount = actionableWarnings.filter((w) => w.severity === 'warning').length;

  const handleScrollToChecklist = () => {
    checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside data-testid="studio-right-panel" className={`${STUDIO.panel.right} flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-6`}>
      {/* Quality score */}
      <QualityScoreWidget deliverableId={deliverableId} />

      {/* Validation warnings banner */}
      {actionableWarnings.length > 0 && (
        <button
          type="button"
          onClick={handleScrollToChecklist}
          className={`w-full flex items-start gap-2 p-3 rounded-lg text-left text-xs transition-colors ${
            errorCount > 0
              ? 'bg-red-50 text-red-800 hover:bg-red-100'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          {errorCount > 0 ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          )}
          <span>
            <strong>{actionableWarnings.length} quality {actionableWarnings.length === 1 ? 'issue' : 'issues'} detected</strong>
            {': '}
            {actionableWarnings.slice(0, 3).map((w) => w.message).join(', ')}
            {actionableWarnings.length > 3 && ` (+${actionableWarnings.length - 3} more)`}
          </span>
        </button>
      )}

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Research insights */}
      <ResearchInsightsSection deliverableId={deliverableId} />

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Content checklist */}
      <div ref={checklistRef}>
        <ContentChecklist deliverableId={deliverableId} contentType={contentType} />
      </div>

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Version history */}
      <VersionHistory deliverableId={deliverableId} />
    </aside>
  );
}
