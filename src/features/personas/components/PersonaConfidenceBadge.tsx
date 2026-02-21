"use client";

import { Check, AlertTriangle, Clock } from "lucide-react";

interface PersonaConfidenceBadgeProps {
  percentage: number;
}

function getBadgeConfig(percentage: number) {
  if (percentage >= 80) {
    return {
      Icon: Check,
      border: "border-emerald-200",
      text: "text-emerald-600",
    };
  }
  if (percentage >= 50) {
    return {
      Icon: Clock,
      border: "border-emerald-200",
      text: "text-emerald-600",
    };
  }
  if (percentage >= 1) {
    return {
      Icon: AlertTriangle,
      border: "border-amber-200",
      text: "text-amber-600",
    };
  }
  return {
    Icon: AlertTriangle,
    border: "border-red-200",
    text: "text-red-600",
  };
}

export function PersonaConfidenceBadge({
  percentage,
}: PersonaConfidenceBadgeProps) {
  const { Icon, border, text } = getBadgeConfig(percentage);

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${border} ${text}`}
    >
      {percentage}%
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
