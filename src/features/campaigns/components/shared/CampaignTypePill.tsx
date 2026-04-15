/**
 * CampaignTypePill — visual badge showing campaign classification.
 *
 * Three types: Creative (purple), Strategic (teal), Format (blue).
 * Uses inline styles for Tailwind 4 purge safety.
 */

"use client";

import React from "react";
import { getCampaignDisplayConfig } from "../../lib/campaign-type-display";

interface CampaignTypePillProps {
  type: string;
  confidence?: number | null;
  size?: "sm" | "md";
}

export function CampaignTypePill({ type, confidence, size = "sm" }: CampaignTypePillProps) {
  const config = getCampaignDisplayConfig(type, confidence);
  const Icon = config.icon;

  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-[11px] gap-1"
    : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md ${sizeClasses}`}
      style={{
        backgroundColor: config.pillBg,
        color: config.pillText,
        border: `1px solid ${config.pillBorder}`,
      }}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {config.label}
    </span>
  );
}
