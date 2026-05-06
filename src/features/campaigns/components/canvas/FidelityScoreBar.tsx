'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useVanillaBaseline } from '../../hooks/useVanillaBaseline';
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

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
  TOP_TIER: 'Klinkt heel menselijk',
  HUMAN_BASELINE: 'Klinkt menselijk',
  AI_LEANING: 'Voelt AI-achtig',
  PURE_AI: 'Klinkt als AI',
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
  /** Deliverable ID — required om "Vergelijk met vanille AI" knop te tonen */
  deliverableId?: string | null;
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
export function FidelityScoreBar({ compact = false, deliverableId = null }: FidelityScoreBarProps) {
  const fidelity = useCanvasStore((s) => s.fidelityScore);
  const strict = useCanvasStore((s) => s.strictRewrite);
  const vanilla = useCanvasStore((s) => s.vanillaBaseline);
  const { compare: runVanillaCompare, isRunning: isVanillaRunning } = useVanillaBaseline(deliverableId);
  const [showPillars, setShowPillars] = React.useState(!compact);

  if (fidelity.stage === 'idle') return null;

  const position = fidelity.humanBaselinePosition ?? 0;
  const verdict = fidelity.detectorVerdict;
  const isComplete = fidelity.stage === 'complete';
  const isSkipped = fidelity.stage === 'skipped';
  const isComputing = fidelity.stage === 'computing' || fidelity.stage === 'detector-only';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* ─── Header row: titel + score badge ─── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Brand fidelity score
            {isComputing && !isComplete && !isSkipped && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-500 ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                bezig met meten…
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Hoe goed past deze tekst bij jouw merk?
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

      {/* ─── Position bar (mens↔AI schaal) met as-labels ─── */}
      <div className="space-y-1">
        <PositionBar position={position} />
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wide">
          <span>← Klinkt menselijk</span>
          <span>Klinkt als AI →</span>
        </div>
      </div>

      {/* ─── Verdict label + skipped fallback ─── */}
      {verdict && !isSkipped && (
        <div className="mt-2 text-xs">
          <span className="font-medium" style={{ color: VERDICT_COLOR[verdict] }}>
            {VERDICT_LABELS[verdict]}
          </span>
          {isComplete && fidelity.elapsedMs !== null && (
            <span className="text-gray-500"> · gemeten in {(fidelity.elapsedMs / 1000).toFixed(0)}s</span>
          )}
        </div>
      )}

      {/* ─── Skipped state — composite faalde maar detector heeft signaal ─── */}
      {isSkipped && (
        <div className="mt-2 text-xs text-gray-500 italic">
          {verdict
            ? `${VERDICT_LABELS[verdict]} — uitgebreide score niet beschikbaar.`
            : 'Score kon niet berekend worden.'}
        </div>
      )}

      {/* ─── STRICT mode running indicator ─── */}
      {strict.stage === 'rewriting' && (
        <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-900">Branddock verbetert de output…</p>
            <p className="text-xs text-violet-700">
              De tekst klinkt nog AI-achtig — we schrijven hem menselijker. ~15-30s.
            </p>
          </div>
        </div>
      )}

      {/* ─── STRICT mode improved badge + rewrite preview ─── */}
      {strict.stage === 'complete' && strict.improved && strict.before && strict.after && (
        <StrictImprovedBlock
          before={strict.before}
          after={strict.after}
          rewritePreview={strict.rewritePreview}
          deliverableId={deliverableId}
        />
      )}

      {/* ─── Pillar breakdown ─── */}
      {isComplete && fidelity.pillars && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowPillars((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Bekijk hoe deze score is opgebouwd</span>
            {showPillars ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showPillars && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <PillarChip label="Merkstijl" sublabel="Gebruikt jouw woorden" score={fidelity.pillars.style} />
              <PillarChip label="Strategie" sublabel="AI-beoordeling" score={fidelity.pillars.judge} />
              <PillarChip label="Menselijk" sublabel="Geen AI-patronen" score={fidelity.pillars.rules} />
            </div>
          )}
        </div>
      )}

      {/* ─── Vergelijk-met-vanille-AI panel ─── */}
      {isComplete && deliverableId && (
        <VanillaComparisonPanel
          branddockComposite={fidelity.compositeScore ?? 0}
          branddockPosition={fidelity.humanBaselinePosition ?? 0}
          vanilla={vanilla}
          isRunning={isVanillaRunning}
          onCompare={runVanillaCompare}
        />
      )}
    </div>
  );
}

// ─── STRICT improved block ─────────────────────────

function StrictImprovedBlock({
  before,
  after,
  rewritePreview,
  deliverableId,
}: {
  before: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number };
  after: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number };
  rewritePreview: string | null;
  deliverableId: string | null;
}) {
  const [showPreview, setShowPreview] = React.useState(false);
  const [applyState, setApplyState] = React.useState<'idle' | 'applying' | 'applied' | 'error'>('idle');
  const [applyError, setApplyError] = React.useState<string | null>(null);

  const handleApply = React.useCallback(async () => {
    if (!deliverableId) return;
    setApplyState('applying');
    setApplyError(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/strict-rewrite/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Apply failed: ${res.status}`);
      }
      setApplyState('applied');
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Apply mislukt');
      setApplyState('error');
    }
  }, [deliverableId]);

  return (
    <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-semibold text-violet-900">Branddock heeft de tekst menselijker gemaakt</span>
      </div>
      <div className="text-xs text-violet-800">
        Was: <span className="font-medium">{VERDICT_LABELS[before.verdict]}</span>
        <span className="mx-1.5">→</span>
        Nu: <span className="font-medium">{VERDICT_LABELS[after.verdict]}</span>
      </div>

      {rewritePreview && (
        <div className="mt-2 pt-2 border-t border-violet-200">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            <span>{showPreview ? 'Verberg' : 'Bekijk'} de menselijkere versie</span>
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showPreview && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded bg-white border border-violet-100 px-3 py-2">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {rewritePreview}
              </pre>
            </div>
          )}

          {/* Apply CTA — gebruikersactie, replace longest first-variant component */}
          {deliverableId && applyState !== 'applied' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applyState === 'applying'}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-violet-300 bg-white text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {applyState === 'applying' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Toepassen…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Gebruik deze versie
                </>
              )}
            </button>
          )}

          {applyState === 'applied' && (
            <div className="mt-2 text-xs text-violet-700 font-medium inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Toegepast — ververs de pagina om de nieuwe tekst te zien
            </div>
          )}

          {applyState === 'error' && applyError && (
            <div className="mt-2 text-xs text-red-700">{applyError}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vanille comparison panel ─────────────────────

interface VanillaComparisonPanelProps {
  branddockComposite: number;
  branddockPosition: number;
  vanilla: {
    stage: 'idle' | 'generating' | 'scoring' | 'complete' | 'error';
    compositeScore: number | null;
    detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI' | null;
    humanBaselinePosition: number | null;
    pillars: { style: number | null; judge: number | null; rules: number | null } | null;
    model: string | null;
    wordCount: number | null;
    errorMessage: string | null;
  };
  isRunning: boolean;
  onCompare: () => void;
}

function VanillaComparisonPanel({
  branddockComposite,
  branddockPosition,
  vanilla,
  isRunning,
  onCompare,
}: VanillaComparisonPanelProps) {
  // Idle: alleen CTA
  if (vanilla.stage === 'idle') {
    return (
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCompare}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-teal-200 bg-teal-50 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Vergelijk met ChatGPT zonder Branddock
        </button>
      </div>
    );
  }

  // Loading: stage 'generating' of 'scoring'
  if (isRunning) {
    return (
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="rounded-lg bg-gray-50 px-3 py-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {vanilla.stage === 'generating' ? 'ChatGPT schrijft de tekst…' : 'Score berekenen…'}
            </p>
            <p className="text-xs text-gray-500">
              Zelfde briefing, maar zonder jouw merkcontext — meestal 30-60s totaal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (vanilla.stage === 'error') {
    return (
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-sm font-medium text-red-900">Vergelijking mislukt</p>
          <p className="text-xs text-red-700 mt-0.5">{vanilla.errorMessage ?? 'Onbekende fout'}</p>
          <button
            type="button"
            onClick={onCompare}
            className="mt-2 text-xs font-medium text-red-700 underline hover:text-red-900"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  // Complete: side-by-side comparison
  if (vanilla.stage === 'complete' && vanilla.compositeScore !== null && vanilla.detectorVerdict) {
    const delta = branddockComposite - vanilla.compositeScore;
    const positionDelta = (vanilla.humanBaselinePosition ?? 0) - branddockPosition;
    const branddockWins = delta > 0;

    return (
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Vergelijking: met vs. zonder Branddock</h4>
        </div>

        {/* Delta hero */}
        <div
          className={`rounded-lg px-4 py-3 mb-3 ${
            branddockWins ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-600">Verschil in score</div>
              <div
                className={`text-3xl font-bold ${branddockWins ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {delta >= 0 ? '+' : ''}
                {delta} punten
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {branddockWins ? 'beter mét Branddock' : 'beter zonder'}
              </div>
            </div>
            {positionDelta !== 0 && (
              <div className="text-right">
                <div className="text-xs text-gray-600">menselijkheid</div>
                <div className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  {positionDelta > 0 ? 'menselijker met Branddock' : 'menselijker zonder'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side-by-side score-mini */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreMini
            label="Met Branddock"
            composite={branddockComposite}
            position={branddockPosition}
            highlight
          />
          <ScoreMini
            label={`Zonder Branddock (${vanilla.model ?? 'GPT-4o'})`}
            composite={vanilla.compositeScore}
            position={vanilla.humanBaselinePosition ?? 0}
          />
        </div>
      </div>
    );
  }

  return null;
}

function ScoreMini({
  label,
  composite,
  position,
  highlight = false,
}: {
  label: string;
  composite: number;
  position: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        highlight ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
        <span className="text-xl font-bold text-gray-900">{composite}</span>
      </div>
      <PositionBar position={position} />
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
