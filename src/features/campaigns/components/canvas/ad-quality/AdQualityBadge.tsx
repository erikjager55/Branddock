'use client';

// =============================================================
// AdQualityBadge — kleur-gecodeerde score-pill voor Content Canvas
// Step 2 variant-card. Click → opent AdQualityDrawer met breakdown.
//
// Color mapping per spec sectie 6.3 (matches Google Ad Strength):
//   Poor       0-25   red    #DC2626
//   Average    26-50  orange #EA580C
//   Good       51-75  yellow #CA8A04
//   Excellent  76-100 green  #16A34A
//
// Loading state: skeleton-pulse pill. Failure state (L2 fallback) is
// rendered via Drawer notice, niet in badge zelf (badge toont L1-only
// score met aantekening "AI judge unavailable").
// =============================================================

import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import type { AdQualityLabel } from '@/lib/ad-validation';

interface AdQualityBadgeProps {
  score: number;
  label: AdQualityLabel;
  l2Unavailable?: boolean;
  onClick?: () => void;
}

const COLOR_BY_LABEL: Record<AdQualityLabel, { fg: string; bg: string; border: string; dot: string }> = {
  poor: { fg: '#991B1B', bg: '#FEE2E2', border: '#FECACA', dot: '#DC2626' },
  average: { fg: '#9A3412', bg: '#FED7AA', border: '#FDBA74', dot: '#EA580C' },
  good: { fg: '#854D0E', bg: '#FEF3C7', border: '#FDE68A', dot: '#CA8A04' },
  excellent: { fg: '#14532D', bg: '#DCFCE7', border: '#BBF7D0', dot: '#16A34A' },
};

const LABEL_DISPLAY: Record<AdQualityLabel, string> = {
  poor: 'Poor',
  average: 'Average',
  good: 'Good',
  excellent: 'Excellent',
};

export function AdQualityBadge({ score, label, l2Unavailable = false, onClick }: AdQualityBadgeProps) {
  const colors = COLOR_BY_LABEL[label];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-opacity hover:opacity-80"
      style={{
        color: colors.fg,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
      aria-label={`Ad Strength: ${LABEL_DISPLAY[label]} · ${score}/100${l2Unavailable ? ' (AI judge unavailable)' : ''}`}
    >
      <span
        className="inline-block h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: colors.dot }}
      />
      <Sparkles className="h-3 w-3" />
      <span>
        Ad Strength: {LABEL_DISPLAY[label]} · {score}/100
      </span>
      {l2Unavailable && (
        <AlertTriangle className="h-3 w-3 ml-0.5" aria-label="AI judge unavailable" />
      )}
    </button>
  );
}

export function AdQualityBadgeSkeleton() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 animate-pulse">
      <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
      <span className="h-3 w-32 bg-gray-300 rounded" />
    </div>
  );
}
