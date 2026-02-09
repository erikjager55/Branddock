"use client";

import {
  CreditCard,
  Check,
  ArrowRight,
  Layers,
  Users,
  HardDrive,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

const currentPlan = {
  name: "Professional",
  price: "$49",
  period: "month",
  renewDate: "Mar 1, 2025",
};

const usage = [
  { label: "Brand Assets", used: 24, limit: 50, icon: Layers },
  { label: "Team Members", used: 4, limit: 10, icon: Users },
  { label: "Storage", used: 2.1, limit: 10, unit: "GB", icon: HardDrive },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "month",
    features: [
      "5 brand assets",
      "1 team member",
      "1 GB storage",
      "Basic analytics",
    ],
    current: false,
  },
  {
    name: "Starter",
    price: "$19",
    period: "month",
    features: [
      "20 brand assets",
      "3 team members",
      "5 GB storage",
      "Campaign management",
      "Email support",
    ],
    current: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "month",
    features: [
      "50 brand assets",
      "10 team members",
      "10 GB storage",
      "AI content tools",
      "Validation tools",
      "Priority support",
    ],
    current: true,
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "month",
    features: [
      "Unlimited assets",
      "Unlimited members",
      "100 GB storage",
      "Custom AI models",
      "API access",
      "Dedicated support",
      "SSO & SAML",
    ],
    current: false,
  },
];

const billingHistory = [
  { id: "inv-001", date: "Feb 1, 2025", amount: "$49.00", status: "Paid" },
  { id: "inv-002", date: "Jan 1, 2025", amount: "$49.00", status: "Paid" },
  { id: "inv-003", date: "Dec 1, 2024", amount: "$49.00", status: "Paid" },
  { id: "inv-004", date: "Nov 1, 2024", amount: "$19.00", status: "Paid" },
];

export default function BillingSettingsPage() {
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-dark">Billing</h1>
        <p className="text-sm text-text-dark/40">
          Manage your subscription and billing details
        </p>
      </div>

      <div className="space-y-8">
        {/* Current Plan */}
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-text-dark">
                    {currentPlan.name}
                  </h3>
                  <Badge variant="info" size="sm">
                    Current Plan
                  </Badge>
                </div>
                <p className="text-sm text-text-dark/40">
                  <span className="text-2xl font-bold text-text-dark">
                    {currentPlan.price}
                  </span>
                  /{currentPlan.period} &middot; Renews {currentPlan.renewDate}
                </p>
              </div>
            </div>
            <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Upgrade Plan
            </Button>
          </div>
        </Card>

        {/* Usage */}
        <div>
          <h2 className="text-lg font-semibold text-text-dark mb-4">Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {usage.map((item) => {
              const Icon = item.icon;
              const percent = Math.round((item.used / item.limit) * 100);
              const unit = item.unit || "";
              return (
                <Card key={item.label} padding="lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-dark">
                          {item.label}
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={percent}
                      size="sm"
                      variant={percent >= 80 ? "warning" : "default"}
                    />
                    <p className="text-xs text-text-dark/40">
                      {item.used}{unit} of {item.limit}{unit} used
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Plan Comparison */}
        <div>
          <h2 className="text-lg font-semibold text-text-dark mb-4">
            Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                padding="lg"
                selected={plan.current}
                className="flex flex-col"
              >
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-dark">
                      {plan.name}
                    </h3>
                    <p className="text-text-dark/40">
                      <span className="text-xl font-bold text-text-dark">
                        {plan.price}
                      </span>
                      <span className="text-xs">/{plan.period}</span>
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="text-xs text-text-dark/60 flex items-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 pt-4 border-t border-border-dark">
                  {plan.current ? (
                    <Button variant="outline" fullWidth disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button variant="outline" fullWidth>
                      {plan.price === "$0" ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <div>
          <h2 className="text-lg font-semibold text-text-dark mb-4">
            Billing History
          </h2>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-dark">
                    <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                      Invoice
                    </th>
                    <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-text-dark/40 uppercase tracking-wider py-3 px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((inv, i) => (
                    <tr
                      key={inv.id}
                      className={
                        i < billingHistory.length - 1
                          ? "border-b border-border-dark/50"
                          : ""
                      }
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-text-dark flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-text-dark/40" />
                          {inv.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-dark/60">
                        {inv.date}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-text-dark">
                        {inv.amount}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
