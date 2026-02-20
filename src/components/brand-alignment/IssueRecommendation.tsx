import React from 'react';
import { Sparkles } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface IssueRecommendationProps {
  recommendation: string;
}

// ─── Component ──────────────────────────────────────────────

export function IssueRecommendation({ recommendation }: IssueRecommendationProps) {
  return (
    <div className="bg-green-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">AI Recommendation</span>
      </div>
      <p className="text-sm text-green-600">{recommendation}</p>
    </div>
  );
}
