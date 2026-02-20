import React from 'react';
import {
  Cpu,
  Leaf,
  Users,
  ShoppingCart,
  Briefcase,
  Clock,
  Link,
} from 'lucide-react';
import { Badge, Card, ProgressBar } from '@/components/shared';
import type { InsightWithMeta, InsightCategory, ImpactLevel, InsightScope, InsightTimeframe } from '@/types/market-insight';

// ─── Mappings ──────────────────────────────────────────────

const CATEGORY_ICON: Record<InsightCategory, React.ElementType> = {
  TECHNOLOGY: Cpu,
  ENVIRONMENTAL: Leaf,
  SOCIAL: Users,
  CONSUMER: ShoppingCart,
  BUSINESS: Briefcase,
};

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  TECHNOLOGY: 'Technology',
  ENVIRONMENTAL: 'Environmental',
  SOCIAL: 'Social',
  CONSUMER: 'Consumer',
  BUSINESS: 'Business',
};

const IMPACT_VARIANT: Record<ImpactLevel, 'danger' | 'warning' | 'success'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

const SCOPE_VARIANT: Record<InsightScope, 'info' | 'default' | 'warning'> = {
  MICRO: 'info',
  MESO: 'default',
  MACRO: 'warning',
};

const TIMEFRAME_LABEL: Record<InsightTimeframe, string> = {
  SHORT_TERM: 'Short term',
  MEDIUM_TERM: 'Medium term',
  LONG_TERM: 'Long term',
};

// ─── Score color for ProgressBar ────────────────────────────

function scoreBarColor(score: number): 'emerald' | 'amber' | 'red' {
  if (score >= 75) return 'emerald';
  if (score >= 50) return 'amber';
  return 'red';
}

// ─── Component ─────────────────────────────────────────────

interface InsightCardProps {
  insight: InsightWithMeta;
  onSelect: (id: string) => void;
}

export function InsightCard({ insight, onSelect }: InsightCardProps) {
  const CategoryIcon = CATEGORY_ICON[insight.category];

  return (
    <Card hoverable onClick={() => onSelect(insight.id)}>
      <Card.Body>
        {/* Header: title + impact badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {insight.title}
          </h3>
          <Badge variant={IMPACT_VARIANT[insight.impactLevel]}>
            {insight.impactLevel}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {insight.description || 'No description provided.'}
        </p>

        {/* Metadata tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge icon={CategoryIcon}>
            {CATEGORY_LABEL[insight.category]}
          </Badge>
          <Badge variant={SCOPE_VARIANT[insight.scope]}>
            {insight.scope}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {TIMEFRAME_LABEL[insight.timeframe]}
          </span>
        </div>

        {/* Relevance score bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Relevance</span>
            <span className="text-xs font-medium text-gray-700">
              {insight.relevanceScore}%
            </span>
          </div>
          <ProgressBar
            value={insight.relevanceScore}
            color={scoreBarColor(insight.relevanceScore)}
            size="sm"
          />
        </div>

        {/* Footer: source count + date */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Link className="w-3 h-3" />
            {insight.sourceUrls.length} source{insight.sourceUrls.length !== 1 ? 's' : ''}
          </span>
          <span>
            {new Date(insight.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </Card.Body>
    </Card>
  );
}
