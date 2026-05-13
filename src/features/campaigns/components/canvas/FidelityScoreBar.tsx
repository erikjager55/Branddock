'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  // F9 (audit 2026-05-13): per-variant scoring. Lees score voor currently-
  // selected variant uit fidelityScoresByVariantIndex map. Fall back op
  // legacy fidelityScore wanneer geen variant-specific entry (b.v. wanneer
  // pipeline op blob-niveau geschoorde — pre-F9 deliverables).
  const fidelityFallback = useCanvasStore((s) => s.fidelityScore);
  const variantScores = useCanvasStore((s) => s.fidelityScoresByVariantIndex);
  const selections = useCanvasStore((s) => s.selections);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  // Selected variant-index = selection van eerste group (alle groups syncen)
  const selectedVariantIndex = React.useMemo(() => {
    const firstGroup = variantGroups.keys().next().value;
    if (!firstGroup) return 0;
    return selections.get(firstGroup) ?? 0;
  }, [variantGroups, selections]);
  const fidelity =
    variantScores.get(selectedVariantIndex) ??
    variantScores.get(0) ??
    fidelityFallback;

  const strict = useCanvasStore((s) => s.strictRewrite);
  const autoIterate = useCanvasStore((s) => s.autoIterate);
  const [showPillars, setShowPillars] = React.useState(!compact);

  if (fidelity.stage === 'idle') return null;

  // UX-overhaul 2026-05-13: pin-positie matcht nu compositeScore (0-100) i.p.v.
  // humanBaselinePosition. Zo komt visuele kleur (rood/oranje/groen) overeen
  // met de score-zone die de user verwacht ("score 52 = oranje zone").
  const position = fidelity.compositeScore ?? 0;
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

      {/* ─── Score bar (composite-based) met as-labels ─── */}
      <div className="space-y-1">
        <PositionBar position={position} />
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wide">
          <span>← Klinkt als AI</span>
          <span>Klinkt menselijk + brand-fit →</span>
        </div>
      </div>

      {/* ─── Verdict label + uitleg + skipped fallback ─── */}
      {verdict && !isSkipped && (
        <div className="mt-2 text-xs">
          <span className="font-medium" style={{ color: VERDICT_COLOR[verdict] }}>
            {VERDICT_LABELS[verdict]}
          </span>
          <span className="text-gray-400"> — meet AI-patronen. </span>
          <span className="text-gray-500">
            De score bovenaan combineert dit met merkstijl + strategie.
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

      {/* ─── F3 fix (audit 2026-05-13): explain-discrepancy banner ─── */}
      {/* Wanneer detector groen toont (TOP_TIER/HUMAN_BASELINE) maar composite */}
      {/* onder drempel zit: signaal dat tekst menselijk klinkt maar nog niet bij */}
      {/* het merk past. Voorkomt verwarring "klopt deze score wel?". */}
      {isComplete &&
        fidelity.compositeScore !== null &&
        fidelity.thresholdMet === false &&
        (verdict === 'TOP_TIER' || verdict === 'HUMAN_BASELINE') && (
          <div className="mt-2 rounded-md bg-amber-50/60 border border-amber-200/60 px-2.5 py-1.5 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-medium">Klinkt menselijk, past nog niet bij merk.</span>{' '}
            Detector ziet weinig AI-patronen (pin links), maar merkstijl + strategie
            zijn lager dan ideaal. Zie pijler-breakdown hieronder voor waar te verbeteren.
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

      {/* ─── Auto-iterate iterating spinner ─── */}
      {autoIterate.stage === 'iterating' && (
        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900">Auto-iterate verbetert de score…</p>
            <p className="text-xs text-emerald-700">
              Initial {autoIterate.initialScore} / threshold {autoIterate.threshold} — feedback-driven rewrite.
            </p>
          </div>
        </div>
      )}

      {/* ─── Auto-iterate complete badge ─── */}
      {autoIterate.stage === 'complete' &&
        autoIterate.attemptsExecuted > 0 &&
        autoIterate.initialScore !== null &&
        autoIterate.finalScore !== null && (
          <AutoIterateImprovedBlock
            initialScore={autoIterate.initialScore}
            finalScore={autoIterate.finalScore}
            attemptsExecuted={autoIterate.attemptsExecuted}
            thresholdMet={autoIterate.thresholdMet}
            stopReason={autoIterate.stopReason ?? ''}
            appliedTemplates={autoIterate.appliedTemplates}
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

      {/* UX-overhaul 2026-05-13: VanillaComparisonPanel verwijderd — was
          demo-feature die in normale workflow alleen ruis was. Comparison-flow
          kan later terug via een aparte settings-toggle. */}

      {/* Opt-in "Verbeter automatisch" CTA — wanneer score < threshold.
          UX-fix 2026-05-13: CTA blijft beschikbaar voor re-try ook na een
          eerdere voltooide auto-iterate (was: alleen bij stage === 'idle').
          Verborgen alleen tijdens actieve iteratie + na threshold-success. */}
      {isComplete &&
        fidelity.compositeScore !== null &&
        fidelity.thresholdMet === false &&
        autoIterate.stage !== 'iterating' &&
        !(autoIterate.stage === 'complete' && autoIterate.thresholdMet) &&
        deliverableId && (
          <AutoIterateOptInCta deliverableId={deliverableId} />
        )}
    </div>
  );
}

// ─── Auto-iterate opt-in CTA (UX-overhaul 2026-05-13) ──
// Toont prominente knop wanneer score < threshold. User klikt om iteratie
// te starten. Streamt SSE events naar canvas-store; output overgenomen door
// AutoIterateImprovedBlock zodra complete.

function AutoIterateOptInCta({ deliverableId }: { deliverableId: string }) {
  const autoIterate = useCanvasStore((s) => s.autoIterate);
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Listen voor 'canvas:trigger-auto-iterate' event uit GenerationFeedbackBanners
  // (auto-iterate chip in volgende-stap rij). Hergebruikt dezelfde flow.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { deliverableId?: string } | undefined;
      if (detail?.deliverableId === deliverableId) {
        void handleClick();
      }
    };
    window.addEventListener('canvas:trigger-auto-iterate', handler);
    return () => window.removeEventListener('canvas:trigger-auto-iterate', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  const handleClick = React.useCallback(async () => {
    setBusy(true);
    setErrorMsg(null);
    // Reset autoIterate-state vóór nieuwe trigger zodat oude SSE-data niet
    // door-shifted (oude max_iterations label bv.) en de progress-display
    // start vers. UX-fix 2026-05-13.
    useCanvasStore.getState().resetAutoIterate();
    try {
      const res = await fetch(`/api/studio/${deliverableId}/auto-iterate/trigger`, {
        method: 'POST',
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Iteratie-start mislukte (${res.status})`);
      }
      // Lees SSE-stream en route naar canvas-store via dezelfde setters
      // die de orchestrator gebruikt. Re-import store voor concurrency-safe
      // mutation.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const store = useCanvasStore.getState();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() ?? '';
        for (const msg of messages) {
          const eventMatch = msg.match(/^event:\s*(\S+)/m);
          const dataMatch = msg.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const eventName = eventMatch[1];
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }
          if (eventName === 'auto_iterate_started') {
            const fresh = typeof data.initialScore === 'number' ? data.initialScore : 0;
            store.setAutoIterateStarted({
              initialScore: fresh,
              threshold: typeof data.threshold === 'number' ? data.threshold : 75,
            });
            // UX-fix 2026-05-13: sync de canvas fidelityScore-display met de
            // fresh re-judge die door trigger-endpoint is gedaan. Voorkomt
            // discrepantie tussen "Brand fidelity score: 50" en
            // "Verbeterd van 52 naar 52" (judge-LLM variance). Variant-index 0
            // is de primary.
            store.setFidelityCompleteForVariant(0, {
              compositeScore: fresh,
              thresholdMet:
                fresh >= (typeof data.threshold === 'number' ? data.threshold : 75),
              compositeThreshold:
                typeof data.threshold === 'number' ? data.threshold : 75,
              detectorVerdict:
                useCanvasStore.getState().fidelityScore.detectorVerdict ?? 'HUMAN_BASELINE',
              humanBaselinePosition:
                useCanvasStore.getState().fidelityScore.humanBaselinePosition ?? 0,
              pillars: useCanvasStore.getState().fidelityScore.pillars ?? {
                style: null,
                judge: null,
                rules: null,
              },
              elapsedMs: useCanvasStore.getState().fidelityScore.elapsedMs ?? 0,
            });
          } else if (eventName === 'auto_iterate_iteration_complete') {
            store.setAutoIterateIterationComplete({
              attempt: typeof data.attempt === 'number' ? data.attempt : 1,
              newScore: typeof data.newScore === 'number' ? data.newScore : 0,
            });
          } else if (eventName === 'auto_iterate_complete') {
            store.setAutoIterateComplete({
              attemptsExecuted:
                typeof data.attemptsExecuted === 'number' ? data.attemptsExecuted : 0,
              finalScore: typeof data.finalScore === 'number' ? data.finalScore : 0,
              thresholdMet: data.thresholdMet === true,
              stopReason: typeof data.stopReason === 'string' ? data.stopReason : 'max_iterations',
            });
          } else if (eventName === 'error') {
            const errMsg = typeof data.message === 'string' ? data.message : 'Iteratie faalde';
            throw new Error(errMsg);
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Iteratie mislukt');
    } finally {
      setBusy(false);
    }
  }, [deliverableId]);

  const isRunning = busy || autoIterate.stage === 'iterating';

  return (
    <div className="mt-3 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 px-4 py-3">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-teal-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Score onder drempel — wil je dat Branddock het automatisch verbetert?
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Branddock herschrijft de tekst tot 5× en stopt zodra de score boven de
            drempel komt of niet meer verbetert. Duurt ~30-90 seconden.
          </p>
          <button
            type="button"
            onClick={handleClick}
            disabled={isRunning}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Bezig met verbeteren…
                {autoIterate.attemptsExecuted > 0 &&
                  ` (poging ${autoIterate.attemptsExecuted}, score ${autoIterate.finalScore ?? '—'})`}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Verbeter automatisch
              </>
            )}
          </button>
          {errorMsg && (
            <div className="mt-2 text-xs text-red-700">{errorMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-iterate improved block (content-test #6.B) ──

function AutoIterateImprovedBlock({
  initialScore,
  finalScore,
  attemptsExecuted,
  thresholdMet,
  stopReason,
  appliedTemplates,
  deliverableId,
}: {
  initialScore: number;
  finalScore: number;
  attemptsExecuted: number;
  thresholdMet: boolean;
  stopReason: string;
  appliedTemplates: string[];
  deliverableId: string | null;
}) {
  const [applyState, setApplyState] = React.useState<'idle' | 'applying' | 'applied' | 'error'>('idle');
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const delta = finalScore - initialScore;

  const handleApply = React.useCallback(async () => {
    if (!deliverableId) return;
    setApplyState('applying');
    setApplyError(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/auto-iterate/apply`, {
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

  // UX-overhaul 2026-05-13: stop-reason → user-friendly heading mapping.
  // Geen "kwam dichter bij threshold" jargon meer.
  const stopReasonLabel = thresholdMet
    ? `Verbeterd van ${initialScore} naar ${finalScore} — klaar voor publish`
    : stopReason === 'early_stop_stagnation'
      ? `Verbeterd van ${initialScore} naar ${finalScore} — verdere iteraties leveren weinig op`
      : stopReason === 'max_iterations'
        ? `Verbeterd van ${initialScore} naar ${finalScore} in ${attemptsExecuted} pogingen — pas brief aan voor verder verbetering`
        : `Verbeterd van ${initialScore} naar ${finalScore}`;

  return (
    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-900">{stopReasonLabel}</span>
      </div>
      <div className="text-xs text-emerald-800">
        Score: <span className="font-medium">{initialScore}</span>
        <span className="mx-1.5">→</span>
        <span className="font-medium">{finalScore}</span>
        <span className="ml-1 text-emerald-700">
          ({delta >= 0 ? '+' : ''}
          {delta} punten in {attemptsExecuted} {attemptsExecuted === 1 ? 'poging' : 'pogingen'})
        </span>
      </div>

      {appliedTemplates.length > 0 && (
        <div className="mt-2 text-[11px] text-emerald-700">
          Toegepast: {appliedTemplates.slice(0, 3).join(' · ')}
          {appliedTemplates.length > 3 && ` +${appliedTemplates.length - 3}`}
        </div>
      )}

      {deliverableId && applyState !== 'applied' && (
        <button
          type="button"
          onClick={handleApply}
          disabled={applyState === 'applying'}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-emerald-300 bg-white text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {applyState === 'applying' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Toepassen…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Gebruik verbeterde versie
            </>
          )}
        </button>
      )}

      {applyState === 'applied' && (
        <div className="mt-2 text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Toegepast — ververs de pagina om de verbeterde tekst te zien
        </div>
      )}

      {applyState === 'error' && applyError && (
        <div className="mt-2 text-xs text-red-700">{applyError}</div>
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

// UX-overhaul 2026-05-13: VanillaComparisonPanel + ScoreMini sub-components
// verwijderd. Vergelijking met vanille ChatGPT was demo-feature die in normale
// workflow alleen ruis was. Kan terug via separate settings-toggle in followup.

// ─── Sub-components ────────────────────────────────

function PositionBar({ position }: { position: number }) {
  // UX-overhaul 2026-05-13: PositionBar gebruikt nu compositeScore (0-100)
  // i.p.v. humanBaselinePosition. Pin-positie matcht score, kleur-zones
  // matchen threshold-semantiek. As-flip: links rood (klinkt als AI / niet
  // brand-fit), rechts groen (klinkt menselijk + brand-fit). Pin direct =
  // score, dus 0=helemaal links rood, 100=helemaal rechts groen.
  const clamped = Math.max(0, Math.min(100, position));
  return (
    <div className="relative h-2.5 rounded-full overflow-hidden bg-gray-100">
      {/* Zone backgrounds — score-based: 0-50 red (under), 50-75 amber, 75-100 green */}
      <div className="absolute inset-0 flex">
        <div className="h-full" style={{ width: '50%', backgroundColor: ZONE_HEX.pureAi }} />
        <div className="h-full" style={{ width: '25%', backgroundColor: ZONE_HEX.aiLeaning }} />
        <div className="h-full" style={{ width: '25%', backgroundColor: ZONE_HEX.topTier }} />
      </div>
      {/* Position pin — left = score% (axis is correct directly) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
        style={{ left: `${clamped}%`, backgroundColor: '#111827' }}
        aria-label={`Score ${clamped} of 100`}
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
