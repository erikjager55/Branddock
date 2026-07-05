'use client';

import { Zap, ZapOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/ui-i18n/format';
import { Card } from '@/components/shared';
import type { DetectedTrendWithMeta } from '../../types/trend-radar.types';

interface TrendActivationCardProps {
  trend: DetectedTrendWithMeta;
  onToggle: () => void;
  disabled?: boolean;
}

export function TrendActivationCard({ trend, onToggle, disabled }: TrendActivationCardProps) {
  const { t } = useTranslation('trend-radar');
  const { formatDate } = useFormat();
  const activatedDate = trend.activatedAt
    ? formatDate(new Date(trend.activatedAt), { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Card padding="none">
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('activation.status')}</h3>

        {trend.isActivated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">{t('activation.activated')}</span>
            </div>
            {activatedDate && (
              <p className="text-xs text-gray-500">{t('activation.since', { date: activatedDate })}</p>
            )}
            {trend.activatedBy && (
              <p className="text-xs text-gray-500">{t('activation.by', { name: trend.activatedBy.name })}</p>
            )}
            <p className="text-[10px] text-gray-400">
              {t('activation.activeInfo')}
            </p>
            <button
              onClick={onToggle}
              disabled={disabled}
              className={`flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                disabled
                  ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <ZapOff className="w-3.5 h-3.5" /> {t('actions.deactivate')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ZapOff className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">{t('activation.notActivated')}</span>
            </div>
            <p className="text-[10px] text-gray-400">
              {t('activation.inactiveInfo')}
            </p>
            <button
              onClick={onToggle}
              disabled={disabled}
              className={`flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                disabled
                  ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  : 'text-white bg-primary hover:bg-primary-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> {t('activation.activateTrend')}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
