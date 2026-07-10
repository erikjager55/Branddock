'use client';

import { useTranslation } from 'react-i18next';
import { Coins, Infinity as InfinityIcon, Clock } from 'lucide-react';
import { Card } from '@/components/shared';
import { useCreditBalance } from '@/hooks/use-credits';

/**
 * Toont het pooled credit-saldo van de org: beschikbaar saldo, gereserveerd,
 * trial-status en maandbundel. Bij een unlimited-org een "onbeperkt"-staat.
 * Rendert niet zonder billing (de query is dan disabled → geen data).
 */
export function CreditBalanceCard() {
  const { t } = useTranslation('settings-billing');
  const { data, isLoading, isError } = useCreditBalance();

  if (isError) {
    return (
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-900">{t('credits.title', { defaultValue: 'Credits' })}</h3>
        <p className="mt-1 text-sm text-red-600">
          {t('credits.error', { defaultValue: 'Kon het credit-saldo niet laden.' })}
        </p>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
        </div>
      </Card>
    );
  }

  const title = t('credits.title', { defaultValue: 'Credits' });

  if (data.unlimited) {
    return (
      <Card padding="lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <InfinityIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-sm font-medium text-emerald-700">
              {t('credits.unlimited', { defaultValue: 'Onbeperkte credits' })}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">
              {t('credits.subtitle', { defaultValue: 'Beschikbaar credit-saldo' })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums text-gray-900">{data.available}</div>
          {data.reserved > 0 && (
            <p className="text-xs text-gray-400">
              {t('credits.reserved', { defaultValue: '{{n}} gereserveerd', n: data.reserved })}
            </p>
          )}
        </div>
      </div>

      {data.trialDaysLeft !== null && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('credits.trial', { defaultValue: 'Gratis trial: nog {{d}} dagen', d: data.trialDaysLeft })}</span>
        </div>
      )}

      {data.monthlyCredits > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {t('credits.monthly', {
            defaultValue: 'Je {{tier}}-plan vult maandelijks aan met {{n}} credits.',
            tier: data.tier,
            n: data.monthlyCredits,
          })}
        </p>
      )}
    </Card>
  );
}
