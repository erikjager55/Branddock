'use client';

import { RotateCcw, Eye, EyeOff, Zap } from 'lucide-react';
import { SearchInput, Select, Button } from '@/components/shared';
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

/** Filter bar with search, selects, dismissed toggle, and reset */
export function TrendFilterBar() {
  const {
    searchQuery,
    categoryFilter,
    impactFilter,
    detectionSourceFilter,
    showDismissed,
    showActivated,
    setSearchQuery,
    setCategoryFilter,
    setImpactFilter,
    setDetectionSourceFilter,
    setShowDismissed,
    setShowActivated,
    resetFilters,
  } = useTrendRadarStore();

  const hasFilters = !!(searchQuery || categoryFilter || impactFilter || detectionSourceFilter || showDismissed || showActivated);

  return (
    <div className="flex flex-wrap items-center gap-3">
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
      <button
        type="button"
        onClick={() => setShowActivated(!showActivated)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
          showActivated
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title={showActivated ? 'Show all trends' : 'Show only activated trends'}
      >
        <Zap className="w-3.5 h-3.5" />
        Activated
      </button>
      <button
        type="button"
        onClick={() => setShowDismissed(!showDismissed)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
          showDismissed
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        }`}
        title={showDismissed ? 'Hide dismissed trends' : 'Show dismissed trends'}
      >
        {showDismissed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        Dismissed
      </button>
      {hasFilters && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );
}
