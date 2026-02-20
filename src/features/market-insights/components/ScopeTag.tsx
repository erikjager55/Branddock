'use client';

import type { InsightScope } from '../types/market-insight.types';

const SCOPE_LABELS: Record<InsightScope, string> = {
  MICRO: 'Micro',
  MESO: 'Meso',
  MACRO: 'Macro',
};

interface ScopeTagProps {
  scope: InsightScope;
}

export function ScopeTag({ scope }: ScopeTagProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
      {SCOPE_LABELS[scope]}
    </span>
  );
}
