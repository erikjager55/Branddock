'use client';

// Pre-flight-kostenindicatie (credit-model Fase 6, ADR 2026-07-07): "kost
// ~N credits" naast een generatie-CTA, gevoed door de centrale kosten-
// registry. Rendert niets zolang credits uit staan (pilot-orgs met
// unlimited zien 'm wel — de schatting blijft informatief en de charge
// short-circuit zit server-side).

import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { estimateCreditsForAction } from '@/lib/billing/credits/credit-costs';
import { isCreditsEnabled } from '@/lib/stripe/feature-flags';
import type { CreditAction } from '@/types/billing';

export function CreditCostHint({
  action,
  count = 1,
  className = '',
}: {
  action: CreditAction;
  count?: number;
  className?: string;
}) {
  const { t } = useTranslation('settings-billing');
  if (!isCreditsEnabled()) return null;
  const estimate = estimateCreditsForAction(action) * Math.max(1, count);
  if (estimate <= 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-gray-400 ${className}`}
      data-testid="credit-cost-hint"
    >
      <Coins className="h-3 w-3" />
      {t('credits.costHint', { defaultValue: 'kost ~{{n}} credits', n: estimate })}
    </span>
  );
}
