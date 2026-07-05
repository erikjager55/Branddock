'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { canvasKeys } from '../../hooks/canvas.hooks';
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

// Verdict → i18n key. Object keys are the enum verdict values (data), the values
// are translation keys resolved with `t()` at render-time inside each component.
const VERDICT_LABEL_KEYS: Record<'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI', string> = {
  TOP_TIER: 'verdict.topTier',
  HUMAN_BASELINE: 'verdict.humanBaseline',
  AI_LEANING: 'verdict.aiLeaning',
  PURE_AI: 'verdict.pureAi',
};

const VERDICT_COLOR: Record<keyof typeof VERDICT_LABEL_KEYS, string> = {
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
  /**
   * Expliciete variant-index override. Wanneer gezet (≠ null) toont de bar de
   * score van die variant i.p.v. de uit `selections`/`variantGroups` afgeleide
   * index. Gebruikt door LP-flow (LandingPageGenerateBlock) die geen generieke
   * variantGroups zet maar wel per-variant scoort.
   */
  variantIndex?: number | null;
  /**
   * Onderdrukt de generieke "Verbeter automatisch"-CTA. Gebruikt door de
   * LP-flow, die een eigen structured-variant auto-iterate aanbiedt i.p.v. de
   * generieke studio-trigger (die platte deliverableComponent-tekst leest en
   * op LP-varianten faalt).
   */
  suppressAutoIterateCta?: boolean;
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
export function FidelityScoreBar({ compact = false, deliverableId = null, variantIndex = null, suppressAutoIterateCta = false }: FidelityScoreBarProps) {
  const { t } = useTranslation('campaigns-canvas-page');
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
    if (variantIndex != null) return variantIndex;
    const firstGroup = variantGroups.keys().next().value;
    if (!firstGroup) return 0;
    return selections.get(firstGroup) ?? 0;
  }, [variantIndex, variantGroups, selections]);
  // P4: toon NOOIT de score van variant 0 op een andere (nog niet gescoorde)
  // variant. Eigen entry → die; map helemaal leeg → legacy-fallback; map gevuld
  // maar deze index nog niet gescoord → neutrale 'computing'-placeholder
  // (spinner i.p.v. een vreemde score) tot de eigen score landt.
  const fidelity =
    variantScores.get(selectedVariantIndex) ??
    (variantScores.size === 0
      ? fidelityFallback
      : { ...fidelityFallback, stage: 'computing' as const, compositeScore: null });

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
            {t('fidelity.title')}
            {isComputing && !isComplete && !isSkipped && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-500 ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('fidelity.measuring')}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('fidelity.subtitle')}
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
          <span>{t('fidelity.axisLeft')}</span>
          <span>{t('fidelity.axisRight')}</span>
        </div>
      </div>

      {/* ─── Verdict label + uitleg + skipped fallback ─── */}
      {verdict && !isSkipped && (
        <div className="mt-2 text-xs">
          <span className="font-medium" style={{ color: VERDICT_COLOR[verdict] }}>
            {t(VERDICT_LABEL_KEYS[verdict])}
          </span>
          <span className="text-gray-400">{t('fidelity.verdictSuffix')}</span>
          <span className="text-gray-500">
            {t('fidelity.verdictExplain')}
          </span>
          {isComplete && fidelity.elapsedMs !== null && (
            <span className="text-gray-500">{t('fidelity.measuredIn', { seconds: (fidelity.elapsedMs / 1000).toFixed(0) })}</span>
          )}
        </div>
      )}

      {/* ─── Skipped state — composite faalde maar detector heeft signaal.
              2026-05-19 — surface skippedReason inline so failures aren't
              silent. Reason comes from the orchestrator's
              fidelity_score_skipped event (judge LLM error, voiceguide
              missing, target wordCount mismatch, etc). ─── */}
      {isSkipped && (
        <div className="mt-2 text-xs text-gray-500 italic space-y-1">
          <div>
            {verdict
              ? t('skipped.detailNotAvailable', { verdict: t(VERDICT_LABEL_KEYS[verdict]) })
              : t('skipped.notCalculated')}
          </div>
          {fidelity.skippedReason && (
            <div className="text-[11px] not-italic text-amber-700">
              {t('skipped.reason', { reason: fidelity.skippedReason })}
            </div>
          )}
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
            <span className="font-medium">{t('discrepancy.title')}</span>{' '}
            {t('discrepancy.body')}
          </div>
        )}

      {/* ─── STRICT mode running indicator ─── */}
      {strict.stage === 'rewriting' && (
        <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-900">{t('strictRunning.title')}</p>
            <p className="text-xs text-violet-700">
              {t('strictRunning.body')}
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
            <p className="text-sm font-medium text-emerald-900">{t('autoIterate.running.title')}</p>
            <p className="text-xs text-emerald-700">
              {t('autoIterate.running.body', { initial: autoIterate.initialScore, threshold: autoIterate.threshold })}
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
            <span>{t('fidelity.pillarsToggle')}</span>
            {showPillars ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showPillars && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <PillarChip label={t('pillar.style.label')} sublabel={t('pillar.style.sublabel')} score={fidelity.pillars.style} />
              <PillarChip label={t('pillar.strategy.label')} sublabel={t('pillar.strategy.sublabel')} score={fidelity.pillars.judge} />
              <PillarChip label={t('pillar.human.label')} sublabel={t('pillar.human.sublabel')} score={fidelity.pillars.rules} />
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
      {!suppressAutoIterateCta &&
        isComplete &&
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
  const { t } = useTranslation('campaigns-canvas-page');
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
        throw new Error(body?.error ?? t('autoIterate.errors.startFailed', { status: res.status }));
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
            // F18 fix (audit 2026-05-13): banner-initial moet matchen met de
            // canvas-displayed score (de grote getal-display). Trigger-endpoint
            // doet re-judge met judge-variance van ±5pt; SSE-initialScore zou
            // banner doen afwijken van big number (user saw "47/100" + banner
            // "54 → 61", drie getallen die niet correleren). Canvas-store score
            // is single source of truth voor banner-start.
            const canvasScore = useCanvasStore.getState().fidelityScore?.compositeScore;
            const sseScore = typeof data.initialScore === 'number' ? data.initialScore : 0;
            const fresh = typeof canvasScore === 'number' && canvasScore > 0 ? canvasScore : sseScore;
            store.setAutoIterateStarted({
              initialScore: fresh,
              threshold: typeof data.threshold === 'number' ? data.threshold : 75,
            });
            // F17 fix (audit 2026-05-13): GEEN sync van fidelity-score op
            // started-event meer. Trigger-endpoint doet fresh F-VAL met judge-
            // variance van ±2-3pt; vorige F12 fix sync'de canvas-score naar
            // die fresh waarde, waardoor user "score zakte" zag voordat iters
            // begonnen. Canvas-score blijft nu staan op origineel; alleen
            // bij echte verbetering (auto_iterate_complete + finalScore >
            // initialScore) syncen we de display.
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
            const errMsg = typeof data.message === 'string' ? data.message : t('autoIterate.errors.iterationFailed');
            throw new Error(errMsg);
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('autoIterate.errors.iterationFailed'));
    } finally {
      setBusy(false);
    }
  }, [deliverableId, t]);

  const isRunning = busy || autoIterate.stage === 'iterating';

  return (
    <div className="mt-3 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 px-4 py-3">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-teal-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {t('autoIterate.cta.title')}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {t('autoIterate.cta.body')}
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
                {t('autoIterate.cta.improving')}
                {autoIterate.attemptsExecuted > 0 &&
                  t('autoIterate.cta.improvingProgress', {
                    attempt: autoIterate.attemptsExecuted,
                    score: autoIterate.finalScore ?? '—',
                  })}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('autoIterate.cta.improveAutomatically')}
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
  const { t } = useTranslation('campaigns-canvas-page');
  const [applyState, setApplyState] = React.useState<'idle' | 'applying' | 'applied' | 'error'>('idle');
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const delta = finalScore - initialScore;

  const queryClient = useQueryClient();
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
        throw new Error(body?.error ?? t('autoIterate.errors.applyFailedStatus', { status: res.status }));
      }
      // F19 fix (audit 2026-05-13): in-place refresh zonder page reload.
      // Branddock is een hybride SPA waarbij window.location.reload() de user
      // terug naar de root brengt — user moet opnieuw navigeren. Hier:
      //   1) invalidate canvas-components-query → TanStack refetcht
      //      DeliverableComponent rows incl. nieuwe generatedContent.
      //   2) update canvas-store.fidelityScore.compositeScore + variant 0
      //      direct met finalScore zodat het grote getal-display ook meteen
      //      de nieuwe waarde toont (anders blijft 47 hangen totdat re-fetch
      //      van components klaar is en dat hangt niet aan score-state).
      //   3) reset autoIterate state zodat de improved-block sluit en de
      //      CTA opnieuw beschikbaar is als user verder wil iterereren.
      queryClient.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) });
      const threshold = useCanvasStore.getState().fidelityScore?.compositeThreshold ?? 75;
      useCanvasStore.setState((state) => {
        const variantMap = new Map(state.fidelityScoresByVariantIndex);
        const variant0 = variantMap.get(0);
        if (variant0) {
          variantMap.set(0, {
            ...variant0,
            compositeScore: finalScore,
            thresholdMet: finalScore >= threshold,
          });
        }
        return {
          fidelityScore: {
            ...state.fidelityScore,
            compositeScore: finalScore,
            thresholdMet: finalScore >= threshold,
          },
          fidelityScoresByVariantIndex: variantMap,
        };
      });
      setApplyState('applied');
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : t('autoIterate.errors.applyFailed'));
      setApplyState('error');
    }
  }, [deliverableId, finalScore, queryClient, t]);

  // F17 fix (audit 2026-05-13): drie copy-varianten naargelang of iteratie
  // werkelijk verbetering opleverde. Bij gelijke score / regressie geen
  // "verbeterd" copy (misleidend) — eerlijk zeggen dat het niet lukte.
  //
  // 2026-05-19: bug-fix volgorde-fout. Voorheen overrulet de thresholdMet-
  // check de improved-check, waardoor regressies van bv. 88 → 68 als
  // "Verbeterd ... klaar voor publish" werden getoond (eindscore boven
  // drempel, maar -20 punten = regressie). Nu: improved-check eerst,
  // threshold-suffix als modifier alleen op echte verbetering.
  const improved = delta > 0;
  const regressed = delta < 0;
  // Banner-kleur volgt resultaat: emerald bij echte winst, amber bij stagnatie/regressie
  const bannerClass = improved
    ? 'bg-emerald-50 border-emerald-200'
    : 'bg-amber-50 border-amber-200';
  const titleClass = improved ? 'text-emerald-900' : 'text-amber-900';
  const subClass = improved ? 'text-emerald-800' : 'text-amber-800';
  const accentClass = improved ? 'text-emerald-700' : 'text-amber-700';
  const iconClass = improved ? 'text-emerald-600' : 'text-amber-600';

  const attempts = t('autoIterate.attempts', { count: attemptsExecuted });
  const stopReasonLabel = improved
    ? thresholdMet
      ? t('autoIterate.result.improvedReady', { initial: initialScore, final: finalScore })
      : stopReason === 'early_stop_stagnation'
        ? t('autoIterate.result.improvedStagnation', { initial: initialScore, final: finalScore })
        : stopReason === 'max_iterations'
          ? t('autoIterate.result.improvedMaxIterations', { initial: initialScore, final: finalScore, attempts })
          : t('autoIterate.result.improved', { initial: initialScore, final: finalScore })
    : regressed
      ? // Regressie: eindscore is lager dan start — auto-iterate maakte het slechter,
        // orchestrator heeft daarom origineel behouden.
        t('autoIterate.result.dropped', { initial: initialScore, final: finalScore, attempts })
      : // delta === 0: stagnatie, geen verschuiving.
        t('autoIterate.result.stayed', { initial: initialScore, attempts });

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2.5 ${bannerClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className={`w-4 h-4 ${iconClass}`} />
        <span className={`text-sm font-semibold ${titleClass}`}>{stopReasonLabel}</span>
      </div>
      <div className={`text-xs ${subClass}`}>
        {t('autoIterate.scoreLabel')} <span className="font-medium">{initialScore}</span>
        <span className="mx-1.5">→</span>
        <span className="font-medium">{finalScore}</span>
        <span className={`ml-1 ${accentClass}`}>
          {t('autoIterate.pointsDelta', {
            signedDelta: `${delta >= 0 ? '+' : ''}${delta}`,
            attempts,
          })}
        </span>
      </div>

      {appliedTemplates.length > 0 && improved && (
        <div className={`mt-2 text-[11px] ${accentClass}`}>
          {t('autoIterate.applied', { templates: appliedTemplates.slice(0, 3).join(' · ') })}
          {appliedTemplates.length > 3 && ` +${appliedTemplates.length - 3}`}
        </div>
      )}

      {/* F17 fix: apply-knop alleen tonen wanneer score daadwerkelijk
          omhoog ging. Bij stagnatie zou apply de huidige content vervangen
          door iets met gelijke score = verwarrend; user behoudt origineel. */}
      {deliverableId && applyState !== 'applied' && improved && (
        <button
          type="button"
          onClick={handleApply}
          disabled={applyState === 'applying'}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-emerald-300 bg-white text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {applyState === 'applying' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('autoIterate.applyingButton')}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {t('autoIterate.useImproved')}
            </>
          )}
        </button>
      )}

      {!improved && (
        <div className="mt-2 text-[11px] text-amber-700 italic">
          {t('autoIterate.tip')}
        </div>
      )}

      {applyState === 'applied' && (
        <div className="mt-2 text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('autoIterate.appliedLoaded')}
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
  const { t } = useTranslation('campaigns-canvas-page');
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
        throw new Error(body?.error ?? t('autoIterate.errors.applyFailedStatus', { status: res.status }));
      }
      setApplyState('applied');
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : t('autoIterate.errors.applyFailed'));
      setApplyState('error');
    }
  }, [deliverableId, t]);

  return (
    <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-semibold text-violet-900">{t('strict.improvedTitle')}</span>
      </div>
      <div className="text-xs text-violet-800">
        {t('strict.was')} <span className="font-medium">{t(VERDICT_LABEL_KEYS[before.verdict])}</span>
        <span className="mx-1.5">→</span>
        {t('strict.now')} <span className="font-medium">{t(VERDICT_LABEL_KEYS[after.verdict])}</span>
      </div>

      {rewritePreview && (
        <div className="mt-2 pt-2 border-t border-violet-200">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            <span>{showPreview ? t('strict.hidePreview') : t('strict.viewPreview')}</span>
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
                  {t('strict.applyingButton')}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('strict.useThisVersion')}
                </>
              )}
            </button>
          )}

          {applyState === 'applied' && (
            <div className="mt-2 text-xs text-violet-700 font-medium inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('strict.appliedRefresh')}
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
  const { t } = useTranslation('campaigns-canvas-page');
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
        aria-label={t('positionBar.scoreAria', { score: clamped })}
      />
    </div>
  );
}

function ThresholdBadge({ thresholdMet, threshold }: { thresholdMet: boolean; threshold: number }) {
  const { t } = useTranslation('campaigns-canvas-page');
  if (thresholdMet) {
    return (
      <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
        <ShieldCheck className="w-3 h-3" />
        {t('threshold.above', { threshold })}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 text-[11px] text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      {t('threshold.below', { threshold })}
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
  const { t } = useTranslation('campaigns-canvas-page');
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
          {skipped ? t('pillar.na') : `${score}`}
        </span>
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">{sublabel}</div>
    </div>
  );
}
