'use client';

import { Button } from '@/components/shared';
import { Sparkles } from 'lucide-react';
import { AIReportSection } from './AIReportSection';
import { KeyFindingsCard } from './KeyFindingsCard';
import { RecommendationsCard } from './RecommendationsCard';

interface OverviewTabProps {
  reportGenerated: boolean;
  executiveSummary: string | null;
  findings: { id: string; order: number; content: string }[];
  recommendations: { id: string; order: number; content: string; isCompleted: boolean }[];
  onGenerateReport: () => void;
  isGenerating: boolean;
}

export function OverviewTab({
  reportGenerated,
  executiveSummary,
  findings,
  recommendations,
  onGenerateReport,
  isGenerating,
}: OverviewTabProps) {
  if (!reportGenerated) {
    return (
      <div data-testid="overview-tab" className="text-center py-12">
        <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generate AI Report
        </h3>
        <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
          Analyze workshop responses and generate an executive summary with key
          findings and recommendations.
        </p>
        <Button
          data-testid="generate-report-button"
          variant="cta"
          icon={Sparkles}
          onClick={onGenerateReport}
          isLoading={isGenerating}
        >
          Generate Report
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="overview-tab">
      <AIReportSection executiveSummary={executiveSummary} />
      <KeyFindingsCard findings={findings} />
      <RecommendationsCard recommendations={recommendations} />
    </div>
  );
}
