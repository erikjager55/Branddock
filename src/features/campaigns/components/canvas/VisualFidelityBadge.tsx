'use client';

import React from 'react';
import { Loader2, ShieldCheck, AlertTriangle, ImageOff } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';

// ─── Tailwind 4 purge — inline hexes ──────────────────────────────────
//
// Composite-score zones mirror the text fidelity bar so the demo reads
// consistently across pillars. Threshold for "publishable" is 70 — the
// same default used by visual-fidelity-scorer.

const ZONE_HEX = {
  good: '#10b981', // emerald-500   ≥70 publishable
  warn: '#f59e0b', // amber-500     50–69 marginal
  bad: '#ef4444',  // red-500       <50 fails
} as const;

function zoneFor(score: number): keyof typeof ZONE_HEX {
  if (score >= 70) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

interface VisualFidelityBadgeProps {
  /** DeliverableComponent.id of the image to match against the store. */
  componentId: string | undefined;
  /** Render variant — `compact` is a small pill on top of the image,
   *  `inline` is a wider chip suited for a card footer. */
  variant?: 'compact' | 'inline';
  /** When provided, the badge becomes a button that opens the detail
   *  panel via this callback. Stops click propagation so the variant
   *  card's own click handler doesn't fire. */
  onOpenDetail?: () => void;
}

/**
 * Per-image G8 visual fidelity badge. Reads streaming state from
 * `useCanvasStore.visualFidelityScores` keyed by componentId.
 *
 * States:
 *   - no entry          → render nothing (image hasn't been scored yet)
 *   - stage=computing   → spinner + "Scoring…"
 *   - stage=skipped     → muted "Score n/a" + tooltip with reason
 *   - stage=complete    → score + zone color
 *
 * Click expands to show color-alignment summary + AI-judge composite —
 * deferred to Phase 3, kept as TODO.
 */
export function VisualFidelityBadge({
  componentId,
  variant = 'compact',
  onOpenDetail,
}: VisualFidelityBadgeProps) {
  const score = useCanvasStore((s) =>
    componentId ? s.visualFidelityScores.get(componentId) : undefined,
  );

  if (!componentId || !score) return null;

  let body: React.ReactNode;
  let bg = 'rgba(255,255,255,0.92)';
  let fg = '#374151';
  let borderColor: string | undefined;
  let title: string | undefined;

  if (score.stage === 'computing') {
    body = (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        Scoring…
      </>
    );
    bg = 'rgba(255,255,255,0.85)';
  } else if (score.stage === 'skipped') {
    body = (
      <>
        <ImageOff className="h-3 w-3" />
        Score n/a
      </>
    );
    bg = 'rgba(255,255,255,0.85)';
    fg = '#6b7280';
    title = score.errorMessage ?? 'Visual fidelity score unavailable';
  } else if (score.compositeScore !== null) {
    const composite = Math.round(score.compositeScore);
    const zone = zoneFor(composite);
    const Icon = zone === 'good' ? ShieldCheck : AlertTriangle;
    const label =
      zone === 'good' ? 'On-brand' : zone === 'warn' ? 'Off-target' : 'Off-brand';
    // Pattern F UI exposure: signal off-brand swatches direct in badge.
    // Score-pill blijft de hoofdmetric; off-brand-count komt als kleine
    // secundaire pill ernaast — alleen wanneer ≥1 unmatched color gevonden.
    const offBrandCount = score.colorAlignment?.unmatchedColors?.length ?? 0;
    body = (
      <>
        <Icon className="h-3 w-3" />
        <span className="tabular-nums font-semibold">{composite}</span>
        <span className="text-[10px] opacity-70">{label}</span>
        {offBrandCount > 0 && (
          <span
            className="ml-0.5 inline-flex items-center gap-0.5 px-1 py-[1px] rounded-full text-[9px] font-medium bg-red-50 text-red-700 border border-red-200"
            title={`${offBrandCount} off-brand color${offBrandCount > 1 ? 's' : ''} detected`}
          >
            ●{offBrandCount}
          </span>
        )}
      </>
    );
    fg = ZONE_HEX[zone];
    borderColor = ZONE_HEX[zone];
    title = score.judgeSkipped
      ? `${composite}/100 — color match only (AI judge unavailable). Click for breakdown.`
      : `${composite}/100 visual fidelity${
          score.thresholdMet ? '' : ' — below threshold 70'
        }${
          offBrandCount > 0 ? ` — ${offBrandCount} off-brand color${offBrandCount > 1 ? 's' : ''}` : ''
        }. Click for breakdown.`;
  } else {
    return null;
  }

  // Static pill rendering
  const padding = variant === 'compact' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = variant === 'compact' ? 'text-[11px]' : 'text-xs';
  const gap = variant === 'compact' ? 'gap-1' : 'gap-1.5';
  const className = `inline-flex items-center ${gap} ${padding} ${text} rounded-full backdrop-blur-sm shadow-sm`;
  const style = {
    backgroundColor: bg,
    color: fg,
    border: borderColor
      ? `1px solid ${borderColor}33`
      : '1px solid rgba(0,0,0,0.08)',
  };

  // When clickable, render als <span role="button"> i.p.v. <button>: deze
  // badge wordt vaak binnen een outer <button> gerenderd (image-variant
  // card in Step 2), wat HTML-invalid is en hydration-errors geeft.
  // span met role+tabIndex behoudt accessibility + keyboard support.
  if (onOpenDetail) {
    return (
      <span
        role="button"
        tabIndex={0}
        title={title}
        className={`${className} cursor-pointer hover:shadow-md transition-shadow pointer-events-auto`}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onOpenDetail();
          }
        }}
      >
        {body}
      </span>
    );
  }

  return (
    <div title={title} className={className} style={style}>
      {body}
    </div>
  );
}

