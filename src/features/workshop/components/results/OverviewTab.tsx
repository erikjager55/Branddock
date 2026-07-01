'use client';

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('workshop');
  if (!reportGenerated) {
    return (
      <div data-testid="overview-tab" className="text-center py-12">
        <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('results.overview.generateTitle')}
        </h3>
        <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
          {t('results.overview.generateDesc')}
        </p>
        <Button
          data-testid="generate-report-button"
          variant="cta"
          icon={Sparkles}
          onClick={onGenerateReport}
          isLoading={isGenerating}
        >
          {t('results.overview.generateButton')}
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
