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
export function VisualFidelityBadge({ componentId, variant = 'compact' }: VisualFidelityBadgeProps) {
  const score = useCanvasStore((s) =>
    componentId ? s.visualFidelityScores.get(componentId) : undefined,
  );

  if (!componentId || !score) return null;

  if (score.stage === 'computing') {
    return (
      <Pill variant={variant} bg="rgba(255,255,255,0.85)" fg="#374151">
        <Loader2 className="h-3 w-3 animate-spin" />
        Scoring…
      </Pill>
    );
  }

  if (score.stage === 'skipped') {
    return (
      <Pill
        variant={variant}
        bg="rgba(255,255,255,0.85)"
        fg="#6b7280"
        title={score.errorMessage ?? 'Visual fidelity score unavailable'}
      >
        <ImageOff className="h-3 w-3" />
        Score n/a
      </Pill>
    );
  }

  // stage === 'complete'
  if (score.compositeScore === null) return null;
  const composite = Math.round(score.compositeScore);
  const zone = zoneFor(composite);
  const Icon = zone === 'good' ? ShieldCheck : AlertTriangle;
  const label =
    zone === 'good' ? 'On-brand' : zone === 'warn' ? 'Off-target' : 'Off-brand';

  return (
    <Pill
      variant={variant}
      bg="rgba(255,255,255,0.92)"
      fg={ZONE_HEX[zone]}
      borderColor={ZONE_HEX[zone]}
      title={
        score.judgeSkipped
          ? `${composite}/100 — color match only (AI judge unavailable)`
          : `${composite}/100 visual fidelity${score.thresholdMet ? '' : ' — below threshold 70'}`
      }
    >
      <Icon className="h-3 w-3" />
      <span className="tabular-nums font-semibold">{composite}</span>
      <span className="text-[10px] opacity-70">{label}</span>
    </Pill>
  );
}

interface PillProps {
  variant: 'compact' | 'inline';
  bg: string;
  fg: string;
  borderColor?: string;
  title?: string;
  children: React.ReactNode;
}

function Pill({ variant, bg, fg, borderColor, title, children }: PillProps) {
  const padding = variant === 'compact' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = variant === 'compact' ? 'text-[11px]' : 'text-xs';
  const gap = variant === 'compact' ? 'gap-1' : 'gap-1.5';
  return (
    <div
      title={title}
      className={`inline-flex items-center ${gap} ${padding} ${text} rounded-full backdrop-blur-sm shadow-sm`}
      style={{
        backgroundColor: bg,
        color: fg,
        border: borderColor ? `1px solid ${borderColor}33` : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </div>
  );
}
