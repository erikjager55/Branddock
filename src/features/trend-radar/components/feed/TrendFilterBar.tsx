'use client';

import { SearchInput, Select } from '@/components/shared';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import type { InsightCategory, ImpactLevel, TrendDetectionSource } from '../../types/trend-radar.types';

const CATEGORY_OPTIONS = [
  { value: 'CONSUMER_BEHAVIOR', label: 'Consumer Behavior' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'MARKET_DYNAMICS', label: 'Market Dynamics' },
  { value: 'COMPETITIVE', label: 'Competitive' },
  { value: 'REGULATORY', label: 'Regulatory' },
];

const IMPACT_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const SOURCE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AI_RESEARCH', label: 'AI Research' },
];

export function TrendFilterBar() {
  const {
    searchQuery,
    categoryFilter,
    impactFilter,
    detectionSourceFilter,
    setSearchQuery,
    setCategoryFilter,
    setImpactFilter,
    setDetectionSourceFilter,
  } = useTrendRadarStore();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search trends..."
        />
      </div>
      <Select
        value={categoryFilter ?? ''}
        onChange={(v) => setCategoryFilter((v || undefined) as InsightCategory | undefined)}
        options={CATEGORY_OPTIONS}
        placeholder="Category"
        allowClear
      />
      <Select
        value={impactFilter ?? ''}
        onChange={(v) => setImpactFilter((v || undefined) as ImpactLevel | undefined)}
        options={IMPACT_OPTIONS}
        placeholder="Impact"
        allowClear
      />
      <Select
        value={detectionSourceFilter ?? ''}
        onChange={(v) => setDetectionSourceFilter((v || undefined) as TrendDetectionSource | undefined)}
        options={SOURCE_OPTIONS}
        placeholder="Source"
        allowClear
      />
    </div>
  );
}
