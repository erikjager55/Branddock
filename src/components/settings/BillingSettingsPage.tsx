"use client";

import React from "react";
import {
  CreditCard,
  Download,
  Check,
  Crown,
  Zap,
  Users,
  Brain,
  FlaskConical,
  HardDrive,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Card, Button, Badge, Modal, ProgressBar } from "@/components/shared";
import {
  useBilling,
  usePlans,
  useUsage,
  usePaymentMethods,
  useInvoices,
  useChangePlan,
  useCancelSubscription,
  useDownloadInvoice,
} from "@/hooks/use-settings";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { PlanItem, UsageData } from "@/types/settings";

// ─── Usage Meter Helpers ─────────────────────────────────────

function getUsageColor(percentage: number): "teal" | "amber" | "red" {
  if (percentage > 80) return "red";
  if (percentage >= 50) return "amber";
  return "teal";
}

function getUsageBadgeVariant(
  percentage: number
): "success" | "warning" | "danger" {
  if (percentage > 80) return "danger";
  if (percentage >= 50) return "warning";
  return "success";
}

// ─── Sub-components ──────────────────────────────────────────

function UsageMeterCard({
  label,
  used,
  limit,
  icon: Icon,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  icon: React.ElementType;
  unit?: string;
}) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const color = getUsageColor(pct);
  const badgeVariant = getUsageBadgeVariant(pct);
  const displayUsed = unit ? `${used}${unit}` : String(used);
  const displayLimit = unit ? `${limit}${unit}` : String(limit);

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <Icon className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <Badge variant={badgeVariant} size="sm">
          {Math.round(pct)}%
        </Badge>
      </div>
      <ProgressBar value={pct} color={color} size="md" />
      <p className="text-xs text-gray-500 mt-2">
        {displayUsed} / {displayLimit} used
      </p>
    </Card>
  );
}

function BillingCycleToggle({
  cycle,
  onToggle,
}: {
  cycle: "monthly" | "yearly";
  onToggle: (c: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onToggle("monthly")}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          cycle === "monthly"
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => onToggle("yearly")}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
          cycle === "yearly"
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Yearly
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            cycle === "yearly"
              ? "bg-white/20 text-white"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          Save 20%
        </span>
      </button>
    </div>
  );
}

function PricingCard({
  plan,
  cycle,
  isCurrent,
  onSelect,
}: {
  plan: PlanItem;
  cycle: "monthly" | "yearly";
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const isRecommended = plan.isRecommended;

  return (
    <div
      className={`relative rounded-xl border-2 p-6 transition-all ${
        isRecommended
          ? "border-primary ring-2 ring-primary/10"
          : "border-gray-200"
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="teal">Recommended</Badge>
        </div>
      )}

      <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>

      <div className="mt-3 mb-4">
        <span className="text-3xl font-bold text-gray-900">
          ${price}
        </span>
        <span className="text-gray-500 text-sm">
          /{cycle === "monthly" ? "mo" : "yr"}
        </span>
      </div>

      <ul className="space-y-2 mb-6">
        <li className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          Up to {plan.maxSeats} team members
        </li>
        <li className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {plan.maxAiGenerations.toLocaleString()} AI generations/mo
        </li>
        <li className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {plan.maxResearchStudies} research studies
        </li>
        <li className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {plan.maxStorageGb}GB storage
        </li>
      </ul>

      {isCurrent ? (
        <Button variant="secondary" fullWidth disabled>
          Current Plan
        </Button>
      ) : (
        <Button
          variant={isRecommended ? "primary" : "secondary"}
          fullWidth
          onClick={onSelect}
        >
          Select Plan
        </Button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function BillingSettingsPage() {
  const { data: billingData, isLoading: billingLoading } = useBilling();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: paymentData, isLoading: paymentLoading } = usePaymentMethods();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();

  const changePlanMutation = useChangePlan();
  const cancelMutation = useCancelSubscription();
  const downloadMutation = useDownloadInvoice();

  const {
    billingCycle,
    setBillingCycle,
    isChangePlanModalOpen,
    setIsChangePlanModalOpen,
    selectedPlanId,
    setSelectedPlanId,
  } = useSettingsStore();

  const billing = billingData?.billing;
  const plans = plansData?.plans ?? [];
  const usage: UsageData | null = usageData?.usage ?? null;
  const paymentMethods = paymentData?.paymentMethods ?? [];
  const invoices = invoicesData?.invoices ?? [];
  const defaultPayment = paymentMethods.find((m) => m.isDefault);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleChangePlan = () => {
    if (!selectedPlanId) return;
    changePlanMutation.mutate(
      {
        planId: selectedPlanId,
        billingCycle: billingCycle === "monthly" ? "MONTHLY" : "YEARLY",
      },
      {
        onSuccess: () => {
          setIsChangePlanModalOpen(false);
          setSelectedPlanId(null);
        },
      }
    );
  };

  const handleCancelSubscription = () => {
    cancelMutation.mutate();
  };

  const handleDownloadInvoice = (id: string) => {
    downloadMutation.mutate(id);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Billing & Subscription
          </h1>
          <p className="text-sm text-gray-500">
            Manage your plan, usage, and payment details
          </p>
        </div>

        {/* Current Plan */}
        <Card padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {billingLoading
                    ? "Loading..."
                    : billing?.subscription?.planName ?? "No active plan"}
                </h3>
                {billing?.subscription && (
                  <Badge variant="success" dot>
                    {billing.subscription.status}
                  </Badge>
                )}
              </div>
              {billing?.subscription && (
                <>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ${billing.subscription.price}
                    <span className="text-sm font-normal text-gray-500">
                      /{billing.subscription.billingCycle === "MONTHLY" ? "month" : "year"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Current period:{" "}
                    {new Date(billing.subscription.currentPeriodStart).toLocaleDateString()}{" "}
                    &ndash;{" "}
                    {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                  {billing.subscription.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-1.5 mt-2 text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        Cancels at end of period
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsChangePlanModalOpen(true)}
              >
                Change Plan
              </Button>
              {billing?.subscription &&
                !billing.subscription.cancelAtPeriodEnd && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelSubscription}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}
            </div>
          </div>
        </Card>

        {/* Usage Meters */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Current Usage
          </h3>
          {usageLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} padding="md">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-2 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : usage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <UsageMeterCard
                label="Members"
                used={usage.seats.used}
                limit={usage.seats.limit}
                icon={Users}
              />
              <UsageMeterCard
                label="AI Generations"
                used={usage.aiGenerations.used}
                limit={usage.aiGenerations.limit}
                icon={Brain}
              />
              <UsageMeterCard
                label="Research Studies"
                used={usage.researchStudies.used}
                limit={usage.researchStudies.limit}
                icon={FlaskConical}
              />
              <UsageMeterCard
                label="Storage"
                used={usage.storage.usedGb}
                limit={usage.storage.limitGb}
                icon={HardDrive}
                unit="GB"
              />
            </div>
          ) : null}
        </div>

        {/* Pricing Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Available Plans
            </h3>
            <BillingCycleToggle cycle={billingCycle} onToggle={setBillingCycle} />
          </div>
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} padding="lg">
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded" />
                      ))}
                    </div>
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  cycle={billingCycle}
                  isCurrent={plan.isCurrentPlan}
                  onSelect={() => {
                    setSelectedPlanId(plan.id);
                    setIsChangePlanModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Payment Method
            </h3>
            <Button variant="ghost" size="sm" icon={CreditCard}>
              Add
            </Button>
          </div>
          {paymentLoading ? (
            <div className="animate-pulse h-14 bg-gray-100 rounded-lg" />
          ) : defaultPayment ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <CreditCard className="h-8 w-8 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {defaultPayment.type} ••••{defaultPayment.last4}
                </p>
                <p className="text-xs text-gray-500">
                  Expires {defaultPayment.expiryMonth}/
                  {defaultPayment.expiryYear}
                </p>
              </div>
              <Badge variant="teal" size="sm">
                Default
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payment method on file</p>
          )}
          {paymentMethods.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              +{paymentMethods.length - 1} more payment method
              {paymentMethods.length - 1 > 1 ? "s" : ""}
            </p>
          )}
        </Card>

        {/* Billing History */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Billing History
            </h3>
          </div>
          {invoicesLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No invoices yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {inv.currency === "USD" ? "$" : inv.currency}
                      {(inv.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "success"
                            : inv.status === "pending"
                            ? "warning"
                            : "danger"
                        }
                        size="sm"
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv.id)}
                        className="text-gray-400 hover:text-primary transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Change Plan Modal */}
        <Modal
          isOpen={isChangePlanModalOpen}
          onClose={() => {
            setIsChangePlanModalOpen(false);
            setSelectedPlanId(null);
          }}
          title="Change Plan"
          subtitle={
            selectedPlan
              ? `Switch to ${selectedPlan.name}`
              : "Select a new plan"
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsChangePlanModalOpen(false);
                  setSelectedPlanId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleChangePlan}
                isLoading={changePlanMutation.isPending}
                disabled={!selectedPlanId}
                icon={ArrowRight}
                iconPosition="right"
              >
                Confirm Change
              </Button>
            </div>
          }
        >
          {selectedPlan ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">New plan</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedPlan.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      $
                      {billingCycle === "monthly"
                        ? selectedPlan.monthlyPrice
                        : selectedPlan.yearlyPrice}
                    </p>
                    <p className="text-xs text-gray-500">
                      per {billingCycle === "monthly" ? "month" : "year"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    Changes apply at the start of your next billing period.
                    Prorated charges may apply.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Select a plan from the pricing cards to continue.
            </p>
          )}
        </Modal>
      </div>
    </div>
  );
}
