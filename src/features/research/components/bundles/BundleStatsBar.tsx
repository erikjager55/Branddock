"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, FileText, FlaskConical, DollarSign } from "lucide-react";
import { useFormat } from "@/lib/ui-i18n/format";

// ─── Types ───────────────────────────────────────────────────

interface BundleStatsBarProps {
  timeline: string | null;
  assetCount: number;
  methodCount: number;
  savings: number;
}

// ─── Component ───────────────────────────────────────────────

export function BundleStatsBar({
  timeline,
  assetCount,
  methodCount,
  savings,
}: BundleStatsBarProps) {
  const { t } = useTranslation("research");
  const { formatCurrency } = useFormat();
  const stats = [
    { icon: Calendar, label: t("bundleStats.timeline"), value: timeline || t("bundleStats.flexible") },
    { icon: FileText, label: t("bundleStats.assets"), value: t("bundleStats.included", { count: assetCount }) },
    { icon: FlaskConical, label: t("bundleStats.methods"), value: t("bundleStats.methodsCount", { count: methodCount }) },
    {
      icon: DollarSign,
      label: t("bundleStats.savings"),
      value: savings > 0 ? formatCurrency(savings, "USD") : "--",
    },
  ];

  return (
    <div data-testid="bundle-stats-bar" className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-sm font-semibold text-gray-900">{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
