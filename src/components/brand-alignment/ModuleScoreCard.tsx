import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Target,
  Palette,
  Users,
  Package,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleScoreData } from '@/types/brand-alignment';
import { Card, ProgressBar } from '@/components/shared';
import { MODULE_CONFIG } from '@/lib/alignment/module-config';
import { getScoreColor } from '@/lib/alignment/score-calculator';
import { TYPOGRAPHY } from '@/lib/constants/design-tokens';
import { useFormat, type UiFormatters } from '@/lib/ui-i18n/format';

// ─── Icon mapping from config string → Lucide component ────

const ICON_MAP: Record<string, LucideIcon> = {
  Layers,
  Target,
  Palette,
  Users,
  Package,
  TrendingUp,
};

// ─── Score → ProgressBar color ──────────────────────────────

function scoreBarColor(score: number): 'emerald' | 'amber' | 'red' {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'amber';
  return 'red';
}

// ─── Relative time helper ───────────────────────────────────

function formatRelativeTime(dateStr: string, formatDate: UiFormatters['formatDate']): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date, { month: 'short', day: 'numeric' });
}

// ─── Types ──────────────────────────────────────────────────

interface ModuleScoreCardProps {
  module: ModuleScoreData;
  onNavigate?: (route: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function ModuleScoreCard({ module, onNavigate }: ModuleScoreCardProps) {
  const { t } = useTranslation('brand-alignment');
  const { formatDate } = useFormat();
  const config = MODULE_CONFIG[module.moduleName];
  if (!config) return null;

  const Icon = ICON_MAP[config.icon];

  return (
    <Card data-testid="module-score-card" className="flex flex-col gap-3">
      {/* Header: icon + module name */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          {Icon && <Icon className="w-4.5 h-4.5 text-gray-500" />}
        </div>
        <span className={TYPOGRAPHY.cardTitle}>{config.label}</span>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${getScoreColor(module.score)}`}>
          {module.score}%
        </span>
        <span className={TYPOGRAPHY.caption}>{t('moduleCard.alignment')}</span>
      </div>

      {/* Progress bar */}
      <ProgressBar value={module.score} color={scoreBarColor(module.score)} />

      {/* Item counts */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {t('moduleCard.alignedCount', { count: module.alignedCount })}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {t('moduleCard.reviewCount', { count: module.reviewCount })}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {t('moduleCard.issuesCount', { count: module.misalignedCount })}
        </span>
      </div>

      {/* Last checked */}
      {module.lastCheckedAt && (
        <div className="text-xs text-gray-400">
          {t('moduleCard.lastChecked', { time: formatRelativeTime(module.lastCheckedAt, formatDate) })}
        </div>
      )}

      {/* View link */}
      <div
        className="text-green-600 text-sm font-medium cursor-pointer hover:text-green-700 transition-colors"
        onClick={() => onNavigate?.(config.route)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate?.(config.route);
          }
        }}
      >
        {t('moduleCard.view')}
      </div>
    </Card>
  );
}
