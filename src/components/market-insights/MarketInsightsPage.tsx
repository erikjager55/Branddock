import React from 'react';
import {
  Lightbulb,
  Plus,
  Activity,
  Zap,
  CalendarPlus,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  Badge,
  SearchInput,
  Select,
  StatCard,
  EmptyState,
  SkeletonCard,
} from '@/components/shared';
import { useMarketInsights } from '@/contexts/MarketInsightsContext';
import { useMarketInsightsStore } from '@/stores/useMarketInsightsStore';
import { InsightCard } from './InsightCard';
import { InsightDetailModal } from './InsightDetailModal';
import type { InsightCategory, ImpactLevel, InsightTimeframe } from '@/types/market-insight';

// ─── Filter options ────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'CONSUMER', label: 'Consumer' },
  { value: 'BUSINESS', label: 'Business' },
];

const IMPACT_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'SHORT_TERM', label: 'Short term' },
  { value: 'MEDIUM_TERM', label: 'Medium term' },
  { value: 'LONG_TERM', label: 'Long term' },
];

// ─── Component ─────────────────────────────────────────────

export function MarketInsightsPage() {
  const {
    insights,
    stats,
    isLoading,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    impactFilter,
    setImpactFilter,
    timeframeFilter,
    setTimeframeFilter,
  } = useMarketInsights();

  const setSelectedInsightId = useMarketInsightsStore((s) => s.setSelectedInsightId);
  const setAddModalOpen = useMarketInsightsStore((s) => s.setAddModalOpen);
  const selectedInsightId = useMarketInsightsStore((s) => s.selectedInsightId);

  const hasActiveFilters = !!searchQuery || !!categoryFilter || !!impactFilter || !!timeframeFilter;

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter(undefined);
    setImpactFilter(undefined);
    setTimeframeFilter(undefined);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ── Sticky header ──────────────────────────────────── */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-6">
        <div className="flex items-start justify-between">
          {/* Left: icon + title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Market Insights</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Understand your market landscape and trends
              </p>
            </div>
          </div>

          {/* Right: count badge + add button */}
          <div className="flex items-center gap-3">
            <Badge>{insights.length} insights</Badge>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setAddModalOpen(true)}
            >
              Add Insight
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Insights" value={stats.active} icon={Activity} />
        <StatCard label="High Impact" value={stats.highImpact} icon={Zap} />
        <StatCard label="New This Month" value={stats.newThisMonth} icon={CalendarPlus} />
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search insights..."
          className="flex-1 min-w-[200px]"
        />

        <Select
          value={categoryFilter ?? null}
          onChange={(v) => setCategoryFilter(v ? (v as InsightCategory) : undefined)}
          options={CATEGORY_OPTIONS}
          placeholder="All Categories"
          className="w-auto"
        />

        <Select
          value={impactFilter ?? null}
          onChange={(v) => setImpactFilter(v ? (v as ImpactLevel) : undefined)}
          options={IMPACT_OPTIONS}
          placeholder="All Impact"
          className="w-auto"
        />

        <Select
          value={timeframeFilter ?? null}
          onChange={(v) => setTimeframeFilter(v ? (v as InsightTimeframe) : undefined)}
          options={TIMEFRAME_OPTIONS}
          placeholder="All Timeframes"
          className="w-auto"
        />

        {hasActiveFilters && (
          <Button variant="ghost" icon={RotateCcw} onClick={resetFilters}>
            Reset
          </Button>
        )}
      </div>

      {/* ── Loading state ──────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────── */}
      {!isLoading && insights.length === 0 && (
        <EmptyState
          icon={Lightbulb}
          title="No insights found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters to find what you are looking for.'
              : 'Start by adding your first market insight to track trends and opportunities.'
          }
          action={
            hasActiveFilters
              ? { label: 'Reset Filters', onClick: resetFilters, variant: 'secondary' }
              : undefined
          }
        />
      )}

      {/* ── Grid ───────────────────────────────────────────── */}
      {!isLoading && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onSelect={setSelectedInsightId}
            />
          ))}
        </div>
      )}

      {/* ── Detail modal ───────────────────────────────────── */}
      {selectedInsightId && <InsightDetailModal />}
    </div>
  );
}
