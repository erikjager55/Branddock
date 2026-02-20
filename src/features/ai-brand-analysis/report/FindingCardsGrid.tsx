'use client';

import React from 'react';
import type { AIFinding } from '@/types/ai-analysis';
import { FindingCard } from './FindingCard';

interface FindingCardsGridProps {
  findings: AIFinding[];
}

export function FindingCardsGrid({ findings }: FindingCardsGridProps) {
  const safeFindings = Array.isArray(findings) ? findings : [];

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Key Findings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeFindings.map((finding) => (
          <FindingCard key={finding.key} finding={finding} />
        ))}
      </div>
    </div>
  );
}
