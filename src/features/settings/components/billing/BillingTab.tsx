'use client';

import { useBillingPlan } from '@/hooks/use-billing';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { BillingBanner, UpgradeModal } from '@/components/billing';
import { CurrentPlanCard } from './CurrentPlanCard';
import { UsageOverviewCard } from './UsageOverviewCard';
import { PlanComparisonTable } from './PlanComparisonTable';
import { PaymentMethodsCard } from './PaymentMethodsCard';
import { InvoiceHistoryCard } from './InvoiceHistoryCard';

export function BillingTab() {
  const billing = useBillingPlan();
  const isUpgradeModalOpen = useSettingsStore((s) => s.isUpgradeModalOpen);
  const setIsUpgradeModalOpen = useSettingsStore((s) => s.setIsUpgradeModalOpen);

  return (
    <div data-testid="billing-tab" className="max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Billing & Subscription</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your plan, usage, and payment details
        </p>
      </div>

      {/* Free Beta or Usage Warning Banner */}
      <BillingBanner
        isFreeBeta={billing.isFreeBeta}
        usagePercentage={billing.usage.percentage}
        onUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      {/* Current Plan */}
      <CurrentPlanCard />

      {/* Usage Overview */}
      <UsageOverviewCard />

      {/* Plan Comparison */}
      <PlanComparisonTable />

      {/* Payment Methods */}
      <PaymentMethodsCard />

      {/* Invoice History */}
      <InvoiceHistoryCard />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={billing.plan.tier}
        isFreeBeta={billing.isFreeBeta}
        onSelectPlan={async (tier, cycle) => {
          await billing.openCheckout(tier, cycle);
          setIsUpgradeModalOpen(false);
        }}
      />
    </div>
  );
}
