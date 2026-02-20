'use client';

import { Check, Minus, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Card, Button, Badge } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { PLAN_CONFIGS, ALL_TIERS, formatLimit } from '@/lib/constants/plan-limits';
import { cn } from '@/lib/constants/design-tokens';
import type { PlanTier, FeatureKey } from '@/types/billing';

const COMPARISON_ROWS: { label: string; key: FeatureKey }[] = [
  { label: 'Workspaces', key: 'WORKSPACES' },
  { label: 'Team Members', key: 'TEAM_MEMBERS' },
  { label: 'AI Tokens / month', key: 'AI_TOKENS' },
  { label: 'Personas', key: 'PERSONAS' },
  { label: 'Campaigns', key: 'CAMPAIGNS' },
  { label: 'Brand Assets', key: 'BRAND_ASSETS' },
  { label: 'Products', key: 'PRODUCTS' },
  { label: 'Market Insights', key: 'MARKET_INSIGHTS' },
  { label: 'Knowledge Resources', key: 'KNOWLEDGE_RESOURCES' },
];

export function PlanComparisonTable() {
  const billing = useBillingPlan();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  const handleUpgrade = async (tier: PlanTier) => {
    if (billing.isFreeBeta || tier === 'FREE') return;
    setLoadingTier(tier);
    try {
      await billing.openCheckout(tier, cycle);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-900">Compare Plans</h3>
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
            Monthly
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
            Yearly
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 pr-4 text-xs font-medium text-gray-500 w-[180px]">
                Feature
              </th>
              {ALL_TIERS.map((tier) => {
                const config = PLAN_CONFIGS[tier];
                const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;
                const price = cycle === 'monthly'
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
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          &euro;{price}
                        </span>
                        <span className="text-xs text-gray-500">
                          /{cycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      {isCurrent && (
                        <Badge variant="success" size="sm">Current</Badge>
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
              <td className="py-2.5 pr-4 text-xs text-gray-600">Support</td>
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
              <td className="py-2.5 pr-4 text-xs text-gray-600">Export</td>
              {ALL_TIERS.map((tier) => {
                const formats = PLAN_CONFIGS[tier].limits.EXPORT_FORMATS;
                const isCurrent = tier === billing.plan.tier && !billing.isFreeBeta;
                const label = formats === 0 ? <Minus className="h-3.5 w-3.5 text-gray-300 mx-auto" />
                  : formats === 1 ? 'PDF'
                  : formats === 2 ? 'PDF + DOCX'
                  : 'All formats';

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
                        Current
                      </Button>
                    ) : tier === 'FREE' || billing.isFreeBeta ? (
                      <Button variant="secondary" size="sm" fullWidth disabled>
                        {tier === 'FREE' ? 'Free' : 'Beta'}
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
                            Loading...
                          </>
                        ) : (
                          <>
                            Upgrade
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
