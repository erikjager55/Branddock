// =============================================================
// Trend Radar Constants
// =============================================================

import type {
  TrendSourceStatus,
  TrendDetectionSource,
  TrendScanStatus,
  InsightCategory,
  ImpactLevel,
  InsightScope,
  InsightTimeframe,
} from '../types/trend-radar.types';

// ─── Source Status ───────────────────────────────────────────

export const SOURCE_STATUS_CONFIG: Record<
  TrendSourceStatus,
  { label: string; color: string; dotColor: string }
> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' },
  HEALTHY: { label: 'Healthy', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-500' },
  WARNING: { label: 'Warning', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
  PAUSED: { label: 'Paused', color: 'bg-gray-100 text-gray-500', dotColor: 'bg-gray-400' },
};

// ─── Detection Source ────────────────────────────────────────

export const DETECTION_SOURCE_CONFIG: Record<
  TrendDetectionSource,
  { label: string; color: string; icon: string }
> = {
  AUTO_SCAN: { label: 'Auto Scan', color: 'bg-blue-100 text-blue-700', icon: 'Radar' },
  MANUAL: { label: 'Manual', color: 'bg-gray-100 text-gray-700', icon: 'PenLine' },
  AI_RESEARCH: { label: 'AI Research', color: 'bg-purple-100 text-purple-700', icon: 'Sparkles' },
};

// ─── Scan Status ─────────────────────────────────────────────

export const SCAN_STATUS_CONFIG: Record<
  TrendScanStatus,
  { label: string; color: string }
> = {
  PENDING: { label: 'Pending', color: 'text-gray-500' },
  RUNNING: { label: 'Running', color: 'text-blue-600' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-600' },
  FAILED: { label: 'Failed', color: 'text-red-600' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-500' },
};

// ─── Category Colors (reused from Market Insights) ───────────

export const CATEGORY_COLORS: Record<InsightCategory, { bg: string; text: string; label: string }> = {
  CONSUMER_BEHAVIOR: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Consumer Behavior' },
  TECHNOLOGY: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Technology' },
  MARKET_DYNAMICS: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Market Dynamics' },
  COMPETITIVE: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Competitive' },
  REGULATORY: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Regulatory' },
};

// ─── Impact Level Colors ─────────────────────────────────────

export const IMPACT_COLORS: Record<ImpactLevel, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Low' },
  MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medium' },
  HIGH: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'High' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
};

// ─── Scope Labels ────────────────────────────────────────────

export const SCOPE_LABELS: Record<InsightScope, string> = {
  MICRO: 'Micro',
  MESO: 'Meso',
  MACRO: 'Macro',
};

// ─── Timeframe Labels ────────────────────────────────────────

export const TIMEFRAME_LABELS: Record<InsightTimeframe, { label: string; icon: string }> = {
  SHORT_TERM: { label: '0-6 months', icon: 'Clock' },
  MEDIUM_TERM: { label: '6-18 months', icon: 'Clock' },
  LONG_TERM: { label: '18+ months', icon: 'Clock' },
};

// ─── Direction Labels ────────────────────────────────────────

export const DIRECTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  rising: { label: 'Rising', icon: 'TrendingUp', color: 'text-emerald-600' },
  declining: { label: 'Declining', icon: 'TrendingDown', color: 'text-red-600' },
  stable: { label: 'Stable', icon: 'Minus', color: 'text-gray-500' },
};

// ─── Check Interval Options ──────────────────────────────────

export const CHECK_INTERVAL_OPTIONS = [
  { value: 60, label: 'Every hour' },
  { value: 180, label: 'Every 3 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Once a day' },
  { value: 10080, label: 'Once a week' },
] as const;

// ─── Relevance Score Thresholds ──────────────────────────────

export const RELEVANCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 0,
} as const;

export function getRelevanceColor(score: number): string {
  if (score >= RELEVANCE_THRESHOLDS.HIGH) return 'text-emerald-600';
  if (score >= RELEVANCE_THRESHOLDS.MEDIUM) return 'text-amber-600';
  return 'text-gray-500';
}

export function getRelevanceBg(score: number): string {
  if (score >= RELEVANCE_THRESHOLDS.HIGH) return 'bg-emerald-500';
  if (score >= RELEVANCE_THRESHOLDS.MEDIUM) return 'bg-amber-500';
  return 'bg-gray-400';
}
