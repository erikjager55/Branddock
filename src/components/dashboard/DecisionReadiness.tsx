import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useReadiness, dashboardKeys } from '../../hooks/use-dashboard';
import { Skeleton } from '../shared';
import type { ModuleScores } from '../../types/dashboard';

// Maps each module score to its `dashboard` catalog key (resolved via t()).
const MODULE_LABEL_KEYS: Record<keyof ModuleScores, string> = {
  brandAssets: 'readiness.modules.brandAssets',
  personas: 'readiness.modules.personas',
  products: 'readiness.modules.products',
  campaigns: 'readiness.modules.campaigns',
  trends: 'readiness.modules.trends',
};

const CARD_BG = { background: 'linear-gradient(to bottom right, #10b981, #1FD1B2)' };

export function DecisionReadiness() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError } = useReadiness();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="rounded-xl p-6" style={CARD_BG}>
        <Skeleton className="h-6 w-48 mb-4 bg-white/20" />
        <Skeleton className="h-12 w-24 mb-3 bg-white/20" />
        <Skeleton className="h-3 w-full mb-4 bg-white/20" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full bg-white/20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl p-6" style={CARD_BG}>
        <div className="flex items-center gap-2 text-white mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">{t('readiness.loadError')}</span>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: dashboardKeys.readiness })}
          className="text-sm text-white/80 hover:text-white underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { percentage, breakdown, moduleScores } = data;

  return (
    <div data-testid="decision-readiness" className="rounded-xl p-6 text-white" style={CARD_BG}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-white" />
        <h2 className="text-sm font-semibold text-white">{t('readiness.title')}</h2>
      </div>

      <div data-testid="readiness-percentage" className="text-4xl font-bold text-white mb-3">
        {percentage}%
      </div>

      <div data-testid="readiness-progress-bar" className="w-full bg-white/20 rounded-full h-3 mb-3">
        <div
          className="h-3 rounded-full bg-white transition-all duration-500"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      <p className="text-sm text-white/80 mb-4">
        <span className="text-white font-medium">{t('readiness.ready', { value: breakdown.ready })}</span>
        {' · '}
        <span className="text-white/80 font-medium">{t('readiness.needAttention', { value: breakdown.needAttention })}</span>
        {' · '}
        <span className="text-white/70 font-medium">{t('readiness.inProgress', { value: breakdown.inProgress })}</span>
      </p>

      {moduleScores && (
        <div className="space-y-2 pt-2 border-t border-white/20">
          {(Object.keys(MODULE_LABEL_KEYS) as Array<keyof ModuleScores>).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-white/80 w-24 flex-shrink-0">{t(MODULE_LABEL_KEYS[key])}</span>
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.min(100, moduleScores[key])}%` }}
                />
              </div>
              <span className="text-xs text-white/80 w-8 text-right flex-shrink-0">{moduleScores[key]}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
