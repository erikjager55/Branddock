import React from 'react';
import type { IssueSeverity } from '@/types/brand-alignment';
import { getSeverityConfig } from '@/lib/alignment/score-calculator';

// ─── Types ──────────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: IssueSeverity;
}

// ─── Component ──────────────────────────────────────────────

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = getSeverityConfig(severity);

  return (
    <span
      className={`${config.bg} ${config.text} text-xs font-medium px-2.5 py-0.5 rounded-full`}
    >
      {config.label}
    </span>
  );
}
