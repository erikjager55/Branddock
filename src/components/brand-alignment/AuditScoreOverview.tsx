import React from 'react';
import type { AuditDimension } from '@/types/brand-alignment';
import { AuditDimensionCard } from './AuditDimensionCard';
import type { AuditGrade } from '@/types/brand-alignment';

function scoreToGrade(score: number): AuditGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

interface Props {
  overallScore: number;
  dimensions: AuditDimension[];
}

const SCORE_COLORS: Record<string, string> = {
  A: '#059669',
  B: '#0d9488',
  C: '#d97706',
  D: '#ea580c',
  F: '#dc2626',
};

export function AuditScoreOverview({ overallScore, dimensions }: Props) {
  const grade = scoreToGrade(overallScore);
  const color = SCORE_COLORS[grade] ?? '#6b7280';

  return (
    <div className="space-y-4">
      {/* Overall score card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center gap-6">
        {/* Score circle */}
        <div className="flex-shrink-0">
          <div
            className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center"
            style={{ borderColor: color }}
          >
            <span className="text-3xl font-bold" style={{ color }}>
              {grade}
            </span>
            <span className="text-xs text-gray-500">{overallScore}%</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Brand Strength Score
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {overallScore >= 80
              ? 'Your brand foundation is strong. Focus on differentiation and activation.'
              : overallScore >= 60
                ? 'Good progress. Address the weaker dimensions to strengthen your brand.'
                : 'Your brand needs attention. Start by completing your brand assets.'}
          </p>
        </div>
      </div>

      {/* Dimension cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dimensions.map((dim) => (
          <AuditDimensionCard key={dim.key} dimension={dim} />
        ))}
      </div>
    </div>
  );
}
