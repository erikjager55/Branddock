'use client';

import { SearchInput, Select } from '@/components/shared';
import { useMarketInsightsStore } from '../stores/useMarketInsightsStore';
import type { InsightCategory, ImpactLevel, InsightTimeframe } from '../types/market-insight.types';

export function InsightSearchFilter() {
  const searchQuery = useMarketInsightsStore((s) => s.searchQuery);
  const setSearchQuery = useMarketInsightsStore((s) => s.setSearchQuery);
  const categoryFilter = useMarketInsightsStore((s) => s.categoryFilter);
  const setCategoryFilter = useMarketInsightsStore((s) => s.setCategoryFilter);
  const impactFilter = useMarketInsightsStore((s) => s.impactFilter);
  const setImpactFilter = useMarketInsightsStore((s) => s.setImpactFilter);
  const timeframeFilter = useMarketInsightsStore((s) => s.timeframeFilter);
  const setTimeframeFilter = useMarketInsightsStore((s) => s.setTimeframeFilter);

  return (
    <div data-testid="insight-filters" className="flex items-center gap-3">
      <div className="flex-1">
        <SearchInput
          data-testid="insight-search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search insights..."
        />
      </div>
      <Select
        data-testid="insight-category-filter"
        value={categoryFilter ?? ''}
        onChange={(val) => setCategoryFilter((val || null) as InsightCategory | null)}
        placeholder="All Categories"
        allowClear
        options={[
          { value: 'TECHNOLOGY', label: 'Technology' },
          { value: 'ENVIRONMENTAL', label: 'Environmental' },
          { value: 'SOCIAL', label: 'Social' },
          { value: 'CONSUMER', label: 'Consumer' },
          { value: 'BUSINESS', label: 'Business' },
        ]}
      />
      <Select
        data-testid="insight-impact-filter"
        value={impactFilter ?? ''}
        onChange={(val) => setImpactFilter((val || null) as ImpactLevel | null)}
        placeholder="All Impact"
        allowClear
        options={[
          { value: 'HIGH', label: 'High' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'LOW', label: 'Low' },
        ]}
      />
      <Select
        data-testid="insight-timeframe-filter"
        value={timeframeFilter ?? ''}
        onChange={(val) => setTimeframeFilter((val || null) as InsightTimeframe | null)}
        placeholder="All Timeframes"
        allowClear
        options={[
          { value: 'SHORT_TERM', label: 'Short-Term' },
          { value: 'MEDIUM_TERM', label: 'Medium-Term' },
          { value: 'LONG_TERM', label: 'Long-Term' },
        ]}
      />
    </div>
  );
}
