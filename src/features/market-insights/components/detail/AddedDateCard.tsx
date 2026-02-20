'use client';

import type { InsightSource } from '../../types/market-insight.types';

const SOURCE_LABELS: Record<InsightSource, string> = {
  MANUAL: 'Manual Entry',
  AI_RESEARCH: 'AI Research',
  IMPORTED: 'Imported',
};

interface AddedDateCardProps {
  createdAt: string;
  source: InsightSource;
}

export function AddedDateCard({ createdAt, source }: AddedDateCardProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500 mb-1">Added</p>
      <p className="text-lg font-semibold text-gray-900">{date}</p>
      <span className="inline-flex items-center mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
        {SOURCE_LABELS[source]}
      </span>
    </div>
  );
}
