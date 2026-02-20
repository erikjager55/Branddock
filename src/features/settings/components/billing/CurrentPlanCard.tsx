'use client';

import {
  Crown,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Card, Button, Badge, ProgressBar } from '@/components/shared';
import { PlanBadge } from '@/components/billing';
import { useBillingPlan } from '@/hooks/use-billing';
import { formatLimit } from '@/lib/constants/plan-limits';

export function CurrentPlanCard() {
  const billing = useBillingPlan();

  if (billing.isFreeBeta) {
    return (
      <Card padding="lg">
        <div data-testid="current-plan-card" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 data-testid="plan-name" className="text-lg font-semibold text-gray-900">Free Beta</h3>
                <PlanBadge tier="ENTERPRISE" isFreeBeta />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                All features unlocked during beta
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const { plan, usage, canUpgrade } = billing;
  const aiPct = usage.percentage;

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <PlanBadge tier={plan.tier} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            &euro;{plan.monthlyPriceEur}
            <span className="text-sm font-normal text-gray-500">/month</span>
          </p>
        </div>
        <div className="flex gap-2">
          {canUpgrade && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => billing.openCheckout(plan.tier === 'FREE' ? 'PRO' : 'AGENCY')}
            >
              Upgrade
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => billing.openPortal()}
          >
            Manage
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* AI Usage meter */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">AI Tokens</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {formatLimit(usage.aiTokens)} / {formatLimit(usage.aiTokensLimit)}
          </span>
        </div>
        <ProgressBar
          value={aiPct}
          color={aiPct > 80 ? 'red' : aiPct >= 50 ? 'amber' : 'teal'}
          size="md"
        />
        {aiPct > 80 && (
          <div className="flex items-center gap-1.5 mt-2 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {aiPct >= 100 ? 'Token limit reached' : 'Approaching token limit'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
