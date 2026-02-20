'use client';

// =============================================================
// UpgradeModal — plan comparison + checkout redirect
//
// Shows all 4 plan tiers with features, highlights current plan,
// and redirects to Stripe Checkout for upgrades.
// =============================================================

import React, { useState } from 'react';
import { Check, Crown, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/shared';
import { PLAN_CONFIGS, ALL_TIERS, formatLimit } from '@/lib/constants/plan-limits';
import { cn } from '@/lib/constants/design-tokens';
import type { PlanTier } from '@/types/billing';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: PlanTier;
  isFreeBeta: boolean;
  onSelectPlan: (tier: PlanTier, cycle: 'monthly' | 'yearly') => Promise<void>;
}

const TIER_HIGHLIGHTS: Record<PlanTier, string> = {
  FREE: 'border-gray-200',
  PRO: 'border-primary ring-2 ring-primary/10',
  AGENCY: 'border-blue-400 ring-2 ring-blue-100',
  ENTERPRISE: 'border-amber-400 ring-2 ring-amber-100',
};

export function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  isFreeBeta,
  onSelectPlan,
}: UpgradeModalProps) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  const handleSelect = async (tier: PlanTier) => {
    if (tier === currentTier && !isFreeBeta) return;
    if (tier === 'FREE') return;
    setLoadingTier(tier);
    try {
      await onSelectPlan(tier, cycle);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Your Plan"
      subtitle="Select the plan that fits your needs"
      size="xl"
    >
      <div className="space-y-6">
        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setCycle('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
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
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
              cycle === 'yearly'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            Yearly
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                cycle === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700',
              )}
            >
              Save 20%
            </span>
          </button>
        </div>

        {/* Plan cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_TIERS.map((tier) => {
            const config = PLAN_CONFIGS[tier];
            const isCurrent = tier === currentTier && !isFreeBeta;
            const isRecommended = tier === 'PRO';
            const monthlyPrice = config.monthlyPriceEur;
            const displayPrice = cycle === 'monthly'
              ? monthlyPrice
              : Math.round(monthlyPrice * 12 * 0.8);
            const isLoading = loadingTier === tier;

            return (
              <div
                key={tier}
                className={cn(
                  'relative rounded-xl border-2 p-5 transition-all',
                  isCurrent ? TIER_HIGHLIGHTS[tier] : 'border-gray-200 hover:border-gray-300',
                )}
              >
                {isRecommended && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge variant="teal" size="sm" icon={Sparkles}>
                      Popular
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-base font-bold text-gray-900">{config.name}</h4>
                  {isCurrent && (
                    <Badge variant="success" size="sm">Current</Badge>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    &euro;{displayPrice}
                  </span>
                  <span className="text-sm text-gray-500">
                    /{cycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>

                <ul className="space-y-1.5 mb-5">
                  {config.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="secondary" size="sm" fullWidth disabled>
                    Current Plan
                  </Button>
                ) : tier === 'FREE' ? (
                  <Button variant="secondary" size="sm" fullWidth disabled>
                    Free
                  </Button>
                ) : (
                  <Button
                    variant={isRecommended ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth
                    onClick={() => handleSelect(tier)}
                    disabled={isLoading || loadingTier !== null}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        Upgrade
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Crown className="h-3.5 w-3.5" />
          <span>All plans include a 14-day free trial. Cancel anytime.</span>
        </div>
      </div>
    </Modal>
  );
}
