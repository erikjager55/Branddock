'use client';

import { Check, Minus, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Badge } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { PLAN_CONFIGS, ALL_TIERS, formatLimit } from '@/lib/constants/plan-limits';
import { cn } from '@/lib/constants/design-tokens';
import type { PlanTier, FeatureKey } from '@/types/billing';

/** review-live-pricing: toon de jaarlijks-toggle alleen als er echte
 *  yearly-Stripe-prijzen geconfigureerd zijn — anders belooft de UI -20%
 *  terwijl de checkout server-side fail-safe weigert. */
function useYearlyAvailable(): boolean {
  const { data } = useQuery<{ yearlyAvailable?: boolean }>({
    queryKey: ['stripe-prices'],
    queryFn: async () => {
      const res = await fetch('/api/stripe/prices');
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  return data?.yearlyAvailable === true;
}

export function PlanComparisonTable() {
  const { t } = useTranslation('settings-billing');
  const billing = useBillingPlan();
  const yearlyAvailable = useYearlyAvailable();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const effectiveCycle: 'monthly' | 'yearly' = yearlyAvailable ? cycle : 'monthly';

  const COMPARISON_ROWS: { label: string; key: FeatureKey }[] = [
    { label: t('comparison.rows.workspaces'), key: 'WORKSPACES' },
    { label: t('comparison.rows.teamMembers'), key: 'TEAM_MEMBERS' },
    { label: t('comparison.rows.aiTokens'), key: 'AI_TOKENS' },
    { label: t('comparison.rows.personas'), key: 'PERSONAS' },
    { label: t('comparison.rows.campaigns'), key: 'CAMPAIGNS' },
    { label: t('comparison.rows.brandAssets'), key: 'BRAND_ASSETS' },
    { label: t('comparison.rows.products'), key: 'PRODUCTS' },
    { label: t('comparison.rows.marketInsights'), key: 'MARKET_INSIGHTS' },
    { label: t('comparison.rows.knowledgeResources'), key: 'KNOWLEDGE_RESOURCES' },
  ];

  const handleUpgrade = async (tier: PlanTier) => {
    if (billing.isFreeBeta || tier === 'FREE') return;
    setLoadingTier(tier);
    try {
      await billing.openCheckout(tier, effectiveCycle);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-900">{t('comparison.title')}</h3>
        {yearlyAvailable && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCycle('monthly')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              cycle === 'monthly'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {t('comparison.monthly')}
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
              cycle === 'yearly'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {t('comparison.yearly')}
            <span
              className={cn(
                'text-[9px] px-1 py-0.5 rounded-full font-semibold',
                cycle === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700',
              )}
            >
              -20%
            </span>
          </button>
        </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 pr-4 text-xs font-medium text-gray-500 w-[180px]">
                {t('comparison.feature')}
              </th>
              {ALL_TIERS.map((tier) => {
                const config = PLAN_CONFIGS[tier];
                const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;
                const price = effectiveCycle === 'monthly'
                  ? config.monthlyPriceEur
                  : Math.round(config.monthlyPriceEur * 12 * 0.8);

                return (
                  <th key={tier} className="text-center py-3 px-2 min-w-[120px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900">
                          {config.name}
                        </span>
                        {tier === 'PRO' && (
                          <Badge variant="teal" size="sm" icon={Sparkles}>
                            {t('comparison.popular')}
                          </Badge>
                        )}
                      </div>
                      <div>
                        {config.isContactSales ? (
                          // Enterprise heeft bewust geen publieke prijs
                          // (plan-limits: contact sales) — "€0/mo" was een bug.
                          <span className="text-lg font-bold text-gray-900">
                            {t('comparison.contactSales')}
                          </span>
                        ) : (
                          <>
                            <span className="text-lg font-bold text-gray-900">
                              &euro;{price}
                            </span>
                            <span className="text-xs text-gray-500">
                              /{effectiveCycle === 'monthly' ? t('comparison.perMonthShort') : t('comparison.perYearShort')}
                            </span>
                          </>
                        )}
                      </div>
                      {isCurrent && (
                        <Badge variant="success" size="sm">{t('common.current')}</Badge>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.key} className="border-b border-gray-50">
                <td className="py-2.5 pr-4 text-xs text-gray-600">{row.label}</td>
                {ALL_TIERS.map((tier) => {
                  const value = PLAN_CONFIGS[tier].limits[row.key];
                  const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;

                  return (
                    <td
                      key={tier}
                      className={cn(
                        'py-2.5 px-2 text-center text-xs tabular-nums',
                        isCurrent ? 'bg-primary/5 font-medium text-gray-900' : 'text-gray-700',
                      )}
                    >
                      {formatLimit(value)}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Support row */}
            <tr className="border-b border-gray-50">
              <td className="py-2.5 pr-4 text-xs text-gray-600">{t('comparison.support')}</td>
              {ALL_TIERS.map((tier) => {
                const level = PLAN_CONFIGS[tier].supportLevel;
                const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;
                return (
                  <td
                    key={tier}
                    className={cn(
                      'py-2.5 px-2 text-center text-xs capitalize',
                      isCurrent ? 'bg-primary/5 font-medium text-gray-900' : 'text-gray-700',
                    )}
                  >
                    {level}
                  </td>
                );
              })}
            </tr>

            {/* Export row */}
            <tr className="border-b border-gray-50">
              <td className="py-2.5 pr-4 text-xs text-gray-600">{t('comparison.export.label')}</td>
              {ALL_TIERS.map((tier) => {
                const formats = PLAN_CONFIGS[tier].limits.EXPORT_FORMATS;
                const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;
                const label = formats === 0 ? <Minus className="h-3.5 w-3.5 text-gray-300 mx-auto" />
                  : formats === 1 ? 'PDF'
                  : formats === 2 ? 'PDF + DOCX'
                  : t('comparison.export.all');

                return (
                  <td
                    key={tier}
                    className={cn(
                      'py-2.5 px-2 text-center text-xs',
                      isCurrent ? 'bg-primary/5 font-medium text-gray-900' : 'text-gray-700',
                    )}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>
          </tbody>

          {/* CTA row */}
          <tfoot>
            <tr>
              <td className="pt-4" />
              {ALL_TIERS.map((tier) => {
                const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;
                const isLoading = loadingTier === tier;

                return (
                  <td key={tier} className="pt-4 px-2">
                    {isCurrent ? (
                      <Button variant="secondary" size="sm" fullWidth disabled>
                        {t('common.current')}
                      </Button>
                    ) : tier === 'FREE' || billing.isFreeBeta ? (
                      <Button variant="secondary" size="sm" fullWidth disabled>
                        {tier === 'FREE' ? t('comparison.free') : t('comparison.beta')}
                      </Button>
                    ) : (
                      <Button
                        variant={tier === 'PRO' ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth
                        onClick={() => handleUpgrade(tier)}
                        disabled={isLoading || loadingTier !== null}
                        className="gap-1.5"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('common.loading')}
                          </>
                        ) : (
                          <>
                            {t('common.upgrade')}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
