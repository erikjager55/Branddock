'use client';

import { Card, ProgressBar } from '@/components/shared';
import { getRelevanceColor } from '../../constants/trend-radar-constants';

interface TrendRelevanceCardProps {
  score: number;
  confidence: number | null;
}

export function TrendRelevanceCard({ score, confidence }: TrendRelevanceCardProps) {
  const color = getRelevanceColor(score);

  return (
    <Card padding="none">
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Relevance Score</h3>
        <div className="text-center">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
        <ProgressBar value={score} color={score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'teal'} size="md" />
        {confidence !== null && confidence !== undefined && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>AI Confidence</span>
            <span className="font-medium">{Math.round(confidence)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
}
