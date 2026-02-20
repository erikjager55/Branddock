import type { StrategyType, StrategyStatus, ObjectiveStatus, MilestoneStatus, MetricType } from '../types/business-strategy.types';

// ─── Strategy Types ────────────────────────────────────────

export const STRATEGY_TYPES: {
  key: StrategyType;
  icon: string;
  label: string;
  description: string;
}[] = [
  { key: 'GROWTH', icon: 'TrendingUp', label: 'Growth', description: 'Scale revenue and market share' },
  { key: 'MARKET_ENTRY', icon: 'Globe', label: 'Market Entry', description: 'Enter new markets or segments' },
  { key: 'PRODUCT_LAUNCH', icon: 'Rocket', label: 'Product Launch', description: 'Launch new products or features' },
  { key: 'BRAND_BUILDING', icon: 'Award', label: 'Brand Building', description: 'Build brand awareness and authority' },
  { key: 'OPERATIONAL_EXCELLENCE', icon: 'Settings', label: 'Operational Excellence', description: 'Improve efficiency and processes' },
  { key: 'CUSTOM', icon: 'Puzzle', label: 'Custom', description: 'Define your own strategy type' },
];

// ─── Status Colors ─────────────────────────────────────────

export const STRATEGY_STATUS_COLORS: Record<StrategyStatus, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' },
  ARCHIVED: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
  COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export const OBJECTIVE_STATUS_COLORS: Record<ObjectiveStatus, { bg: string; text: string; dot: string }> = {
  ON_TRACK: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  AT_RISK: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  BEHIND: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export const MILESTONE_COLORS: Record<MilestoneStatus, string> = {
  DONE: 'bg-blue-500',
  UPCOMING: 'bg-amber-400',
  FUTURE: 'bg-gray-300',
};

// ─── Metric Formatters ─────────────────────────────────────

export const METRIC_FORMATTERS: Record<MetricType, (value: number) => string> = {
  PERCENTAGE: (v) => `${Math.round(v)}%`,
  NUMBER: (v) => v.toLocaleString(),
  CURRENCY: (v) => `€${v.toLocaleString()}`,
};
