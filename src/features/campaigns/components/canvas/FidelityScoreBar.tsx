'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Loader2, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Tailwind 4 purge — inline hexes voor gradient backgrounds ──
// Standaard Tailwind klassen werken voor de zone backgrounds, maar de
// position-pin gebruikt een specifieke teal-emerald-amber-red gradient die
// bewust met inline style geschreven wordt zodat purge niets weghaalt.

const ZONE_HEX = {
  topTier: '#10b981', // emerald-500
  humanBaseline: '#14b8a6', // teal-500
  aiLeaning: '#f59e0b', // amber-500
  pureAi: '#ef4444', // red-500
} as const;

const VERDICT_LABELS: Record<'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI', string> = {
  TOP_TIER: 'Top-tier menselijk',
  HUMAN_BASELINE: 'Mens-baseline',
  AI_LEANING: 'AI-leunend',
  PURE_AI: 'Pure AI',
};

const VERDICT_COLOR: Record<keyof typeof VERDICT_LABELS, string> = {
  TOP_TIER: ZONE_HEX.topTier,
  HUMAN_BASELINE: ZONE_HEX.humanBaseline,
  AI_LEANING: ZONE_HEX.aiLeaning,
  PURE_AI: ZONE_HEX.pureAi,
};

interface FidelityScoreBarProps {
  /** Compacte modus: enkel position bar zonder pillar breakdown details */
  compact?: boolean;
}

/**
 * Demo-UI component that visualizes the F-VAL fidelity score against the
 * 0-100 mens↔AI scale. Reads streaming state from useCanvasStore that gets
 * populated via tell_check_complete (~5ms) en fidelity_score_complete
 * (~20s) SSE events.
 *
 * States:
 *   - idle:           generation hasn't run yet — render nothing
 *   - detector-only:  show position-pin + verdict, "computing composite…" hint
 *   - computing:      same as detector-only, with "computing composite…" spinner
 *   - complete:       full position-bar + composite badge + pillar breakdown
 */
export function FidelityScoreBar({ compact = false }: FidelityScoreBarProps) {
  const fidelity = useCanvasStore((s) => s.fidelityScore);
  const [showPillars, setShowPillars] = React.useState(!compact);

  if (fidelity.stage === 'idle') return null;

  const position = fidelity.humanBaselinePosition ?? 0;
  const verdict = fidelity.detectorVerdict;
  const isComplete = fidelity.stage === 'complete';
  const isComputing = fidelity.stage === 'computing' || fidelity.stage === 'detector-only';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* ─── Header row: composite + threshold ─── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Fidelity score
            {isComputing && !isComplete && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-500 ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                composite berekenen…
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Hoe trouw is deze output aan jouw merk t.o.v. een vanille AI?
          </p>
        </div>

        {isComplete && fidelity.compositeScore !== null && (
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{fidelity.compositeScore}</span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
            <ThresholdBadge
              thresholdMet={fidelity.thresholdMet === true}
              threshold={fidelity.compositeThreshold ?? 75}
            />
          </div>
        )}
      </div>

      {/* ─── Position bar (mens↔AI schaal) ─── */}
      <PositionBar position={position} />

      {/* ─── Verdict label ─── */}
      {verdict && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium" style={{ color: VERDICT_COLOR[verdict] }}>
            {VERDICT_LABELS[verdict]}
          </span>
          <span className="text-gray-500">
            positie {position}/100
            {isComplete && fidelity.elapsedMs !== null && (
              <> · berekend in {(fidelity.elapsedMs / 1000).toFixed(0)}s</>
            )}
          </span>
        </div>
      )}

      {/* ─── Pillar breakdown ─── */}
      {isComplete && fidelity.pillars && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowPillars((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Per-pijler breakdown</span>
            {showPillars ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showPillars && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <PillarChip label="Pijler 1" sublabel="Brand voice" score={fidelity.pillars.style} />
              <PillarChip label="Pijler 2" sublabel="G-Eval rubric" score={fidelity.pillars.judge} />
              <PillarChip label="Pijler 3" sublabel="Anti-tell + rules" score={fidelity.pillars.rules} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────

function PositionBar({ position }: { position: number }) {
  // Zones: 0-12 TOP_TIER, 12-30 HUMAN_BASELINE, 30-50 AI_LEANING, 50-100 PURE_AI
  const clamped = Math.max(0, Math.min(100, position));
  return (
    <div className="relative h-2.5 rounded-full overflow-hidden bg-gray-100">
      {/* Zone backgrounds — flex segments proportional to threshold widths */}
      <div className="absolute inset-0 flex">
        <div className="h-full" style={{ width: '12%', backgroundColor: ZONE_HEX.topTier }} />
        <div className="h-full" style={{ width: '18%', backgroundColor: ZONE_HEX.humanBaseline }} />
        <div className="h-full" style={{ width: '20%', backgroundColor: ZONE_HEX.aiLeaning }} />
        <div className="h-full" style={{ width: '50%', backgroundColor: ZONE_HEX.pureAi }} />
      </div>
      {/* Position pin */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
        style={{ left: `${clamped}%`, backgroundColor: '#111827' }}
        aria-label={`Position ${clamped} of 100`}
      />
    </div>
  );
}

function ThresholdBadge({ thresholdMet, threshold }: { thresholdMet: boolean; threshold: number }) {
  if (thresholdMet) {
    return (
      <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
        <ShieldCheck className="w-3 h-3" />
        boven drempel ({threshold})
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 text-[11px] text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      onder drempel ({threshold})
    </div>
  );
}

function PillarChip({
  label,
  sublabel,
  score,
}: {
  label: string;
  sublabel: string;
  score: number | null;
}) {
  const skipped = score === null;
  return (
    <div
      className={`rounded-lg px-2.5 py-2 border ${
        skipped ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${skipped ? 'text-gray-400' : 'text-gray-900'}`}>
          {skipped ? 'n.v.t.' : `${score}`}
        </span>
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">{sublabel}</div>
    </div>
  );
}
