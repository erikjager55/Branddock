'use client';

import React from 'react';
import type { AIAnalysisReportData } from '@/types/ai-analysis';
import { SuccessBanner } from './SuccessBanner';
import { ExportToolbar } from './ExportToolbar';
import { ExecutiveSummary } from './ExecutiveSummary';
import { FindingCardsGrid } from './FindingCardsGrid';
import { RecommendationsList } from './RecommendationsList';

interface ReportViewProps {
  reportData: AIAnalysisReportData;
  assetName: string;
  sessionId: string;
  assetId: string;
  isLocked: boolean;
}

export function ReportView({
  reportData,
  assetName,
  sessionId,
  assetId,
  isLocked,
}: ReportViewProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
      {/* Success banner with metadata */}
      <SuccessBanner reportData={reportData} />

      {/* Export toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Analysis Report: {assetName}
        </h2>
        <ExportToolbar
          assetId={assetId}
          sessionId={sessionId}
          isLocked={isLocked}
        />
      </div>

      {/* Executive summary */}
      <ExecutiveSummary summary={reportData.executiveSummary} />

      {/* Findings grid */}
      <FindingCardsGrid findings={reportData.findings} />

      {/* Recommendations */}
      <RecommendationsList recommendations={reportData.recommendations} />
    </div>
  );
}
