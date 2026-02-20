"use client";

import React from "react";
import { Shield } from "lucide-react";
import { CONFIDENCE_BADGES } from "../../constants/research-constants";

// ─── Types ───────────────────────────────────────────────────

interface ConfidenceBadgeProps {
  confidence: string;
}

// ─── Component ───────────────────────────────────────────────

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const config = CONFIDENCE_BADGES[confidence as keyof typeof CONFIDENCE_BADGES];

  const bg = config?.bg ?? "bg-gray-100";
  const text = config?.text ?? "text-gray-700";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      <Shield className="w-3 h-3" />
      Confidence: {confidence}
    </span>
  );
}
