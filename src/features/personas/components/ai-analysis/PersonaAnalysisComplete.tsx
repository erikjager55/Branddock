'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/shared';
import type { PersonaInsightsData } from '../../types/persona-analysis.types';
import { DimensionInsightCard } from './DimensionInsightCard';

interface PersonaAnalysisCompleteProps {
  insightsData: PersonaInsightsData;
  personaName: string;
  onBack: () => void;
}

export function PersonaAnalysisComplete({ insightsData, personaName, onBack }: PersonaAnalysisCompleteProps) {
  return (
    <div className="space-y-6">
      {/* Success Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Analysis Complete</h2>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div>
            <span className="font-semibold text-gray-900">4</span>{' '}
            <span className="text-gray-500">Dimensions analyzed</span>
          </div>
          <div>
            <span className="font-semibold text-emerald-600">+{insightsData.researchBoostPercentage}%</span>{' '}
            <span className="text-gray-500">Research confidence</span>
          </div>
        </div>
      </div>

      {/* Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insightsData.dimensions.map((dim) => (
          <DimensionInsightCard key={dim.key} dimension={dim} />
        ))}
      </div>

      {/* Back Button */}
      <div className="text-center">
        <Button variant="cta" onClick={onBack}>
          Back to {personaName}
        </Button>
      </div>
    </div>
  );
}
