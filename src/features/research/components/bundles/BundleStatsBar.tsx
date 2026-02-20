"use client";

import React from "react";
import { Calendar, FileText, FlaskConical, DollarSign } from "lucide-react";

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
  const stats = [
    { icon: Calendar, label: "Timeline", value: timeline || "Flexible" },
    { icon: FileText, label: "Assets", value: `${assetCount} included` },
    { icon: FlaskConical, label: "Methods", value: `${methodCount} methods` },
    {
      icon: DollarSign,
      label: "Savings",
      value: savings > 0 ? `$${savings.toLocaleString()}` : "--",
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
