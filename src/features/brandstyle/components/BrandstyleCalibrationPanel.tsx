"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Lightbulb, Eye, CheckCircle2, ArrowRight, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared";
import {
  buildBrandstyleCalibrationReport,
  type CalibrationAskAction,
  type CalibrationSeverity,
  type CalibrationSection,
  type OverrideSignalInput,
  type ReviewFeedbackInput,
  type RuleViolationInput,
} from "@/lib/brandstyle/calibration-report";
import type { BrandStyleguide, StyleguideTab } from "../types/brandstyle.types";
import { staleReviewsToCalibrationInput } from "@/lib/brandstyle/review-sections";

interface BrandstyleCalibrationPanelProps {
  styleguide: BrandStyleguide;
  /** Deep-link callback — switches the active styleguide tab (same pattern as the onboarding wizard). */
  onJumpToTab: (tab: StyleguideTab) => void;
  /**
   * Regels die structureel botsen met wat we genereren (R4-feedback-loop).
   * Als prop i.p.v. een eigen fetch: het paneel rekent bewust alleen op
   * al-geladen data, en de parent bepaalt wanneer er gehaald wordt.
   */
  ruleViolations?: RuleViolationInput[];
  /** Secties waarvan de gebruiker een groot deel handmatig corrigeerde (R4). */
  overrideSignals?: OverrideSignalInput[];
  /** Secties met een "needs work"-toelichting van de gebruiker (R4). */
  reviewFeedback?: ReviewFeedbackInput[];
  /**
   * `insufficient-data` = er is nog te weinig gegenereerd om iets over regels
   * te zeggen. Zonder dit onderscheid leest een lege lijst als "niets aan de
   * hand", terwijl er niet gemeten is.
   */
  curationStatus?: "insufficient-data" | "nothing-above-threshold" | "signals";
  /** Hoeveel generaties er zijn, en hoeveel er nodig zijn. */
  curationProgress?: { generations: number; required: number };
  /** Klikt één suggestie weg. */
  onDismiss?: (key: string) => Promise<void>;
  /** Aantal weggeklikte suggesties, en hoe je ze terughaalt. */
  dismissedCount?: number;
  onRestoreDismissed?: () => Promise<void>;
  /**
   * De signalen konden niet geladen worden. Zonder dit zou een falende fetch
   * er precies zo uitzien als "niets te cureren" — en bij een verder schone
   * styleguide toont het paneel dan een groene "alles in orde"-banner die
   * liegt.
   */
  curationSignalsFailed?: boolean;
  /** Voert een inline correctie uit. Resolve = klaar; de parent invalideert. */
  onRunAction?: (action: CalibrationAskAction) => Promise<void>;
}

/** Per-severity icon + accent classes. Classes verified present in compiled index.css (Tailwind 4 purge). */
const SEVERITY_META: Record<
  CalibrationSeverity,
  { icon: LucideIcon; rank: number; iconClass: string; chipClass: string }
> = {
  critical: { icon: AlertTriangle, rank: 0, iconClass: "text-red-600", chipClass: "bg-red-50 border-red-200 text-red-700" },
  suggestion: { icon: Lightbulb, rank: 1, iconClass: "text-amber-600", chipClass: "bg-amber-50 border-amber-200 text-amber-700" },
  review: { icon: Eye, rank: 2, iconClass: "text-blue-600", chipClass: "bg-blue-50 border-blue-200 text-blue-700" },
};

/** Maps an ask's section to the styleguide tab the deep-link should open. */
const SECTION_TAB: Record<CalibrationSection, StyleguideTab> = {
  logo: "brand_assets",
  colors: "colors",
  typography: "typography",
  imagery: "imagery",
  "design-language": "visual_system",
  // Regels staan in het Manifest — de enige plek waar ze zichtbaar zijn.
  rules: "manifest",
};

/**
 * Consolidated "what needs attention" panel for an extracted styleguide.
 * Computes the calibration report client-side from already-loaded data
 * (no extra fetch) and surfaces low-confidence / missing / inferred items
 * as actionable asks with deep-links to the relevant tab.
 */
export function BrandstyleCalibrationPanel({
  styleguide,
  onJumpToTab,
  ruleViolations,
  overrideSignals,
  reviewFeedback,
  curationStatus,
  curationProgress,
  curationSignalsFailed,
  onRunAction,
  onDismiss,
  dismissedCount,
  onRestoreDismissed,
}: BrandstyleCalibrationPanelProps) {
  const { t } = useTranslation("brandstyle");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  /**
   * De ask-id is `rule-violated-<key>`; de dismiss-route wil de kale sleutel,
   * want die matcht wat de aggregatie produceert.
   */
  const dismissAsk = async (askId: string) => {
    if (!onDismiss || dismissing) return;
    setDismissing(askId);
    setActionError(null);
    try {
      await onDismiss(askId.replace(/^rule-violated-/, ""));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDismissing(null);
    }
  };

  const runAction = async (askId: string, action: CalibrationAskAction) => {
    if (!onRunAction || runningAction) return;
    setRunningAction(`${askId}:${action.kind}`);
    setActionError(null);
    try {
      await onRunAction(action);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningAction(null);
    }
  };
  // Calibration only makes sense once extraction has finished — computing for a
  // DRAFT/ANALYZING styleguide would surface alarming "missing" asks over partial
  // data. Gate inside the memo so the hook always runs (Rules of Hooks) and the
  // gate ordering can't regress.
  const report = useMemo(
    () =>
      styleguide.status === "COMPLETE"
        ? buildBrandstyleCalibrationReport({
            colors: styleguide.colors.map((c) => ({ confidence: c.confidence, category: c.category })),
            fonts: styleguide.fonts.map((f) => ({ source: f.source, availability: f.availability, fileUrl: f.fileUrl })),
            logos: styleguide.logos.map((l) => ({ variant: l.variant })),
            guidelines: [...styleguide.photographyGuidelines, ...styleguide.illustrationGuidelines],
            typeScaleCount: styleguide.typeScale?.length ?? 0,
            // W5-driftreset: secties waarvan de goedkeuring verviel doordat een
            // re-analyse de data veranderde.
            staleReviews: staleReviewsToCalibrationInput(styleguide.reviews ?? []),
            // R4-feedback-loop: regels die structureel botsen met wat we
            // genereren. Komt van de parent (eigen endpoint), niet uit het
            // styleguide-record.
            ruleViolations,
            overrideSignals,
            reviewFeedback,
          })
        : null,
    [styleguide, ruleViolations, overrideSignals, reviewFeedback],
  );

  if (!report) return null;

  // Een schone styleguide mag alleen groen melden als álle signalen binnen
  // zijn. Bij een mislukte fetch is "niets te cureren" een gok, geen conclusie.
  if (report.clean && curationSignalsFailed) {
    return (
      <div
        data-testid="brandstyle-calibration-panel"
        className="mt-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700">
          {t("calibration.signalsUnavailable")}
        </span>
      </div>
    );
  }

  // Alles schoon, maar we hebben nog te weinig generaties om íets over de
  // merkregels te kunnen zeggen. Dan is groen melden te stellig: er is niet
  // gemeten, er is niets gevonden.
  if (report.clean && curationStatus === "insufficient-data") {
    return (
      <div
        data-testid="brandstyle-calibration-panel"
        className="mt-6 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
      >
        <ClipboardCheck className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {t("calibration.insufficientData", {
            count: curationProgress?.generations ?? 0,
            required: curationProgress?.required ?? 10,
          })}
        </span>
      </div>
    );
  }

  // De "terughalen"-link hoort óók in de schone staat te staan: juist wie alles
  // heeft weggeklikt ziet groen, en zonder deze link is er geen weg terug.
  const restoreLink = (dismissedCount ?? 0) > 0 && onRestoreDismissed && (
    <button
      type="button"
      className="mt-3 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
      data-testid="calibration-restore-dismissed"
      onClick={() => void onRestoreDismissed()}
    >
      {t("calibration.restoreDismissed", { count: dismissedCount })}
    </button>
  );

  if (report.clean) {
    return (
      <div data-testid="brandstyle-calibration-panel" className="mt-6">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            {t("calibration.complete")}
          </span>
        </div>
        {restoreLink}
      </div>
    );
  }

  const sortedAsks = [...report.asks].sort(
    (a, b) => SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank,
  );

  const summary = [
    report.counts.critical > 0 ? t("calibration.summaryCritical", { count: report.counts.critical }) : null,
    report.counts.suggestion > 0 ? t("calibration.summaryToFix", { count: report.counts.suggestion }) : null,
    report.counts.review > 0 ? t("calibration.summaryToReview", { count: report.counts.review }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div data-testid="brandstyle-calibration-panel" className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">{t("calibration.title")}</h3>
        <span className="text-xs text-gray-500">{summary}</span>
      </div>

      {actionError && (
        <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {t("calibration.actionFailed", { error: actionError })}
        </p>
      )}

      <ul className="space-y-2">
        {sortedAsks.map((ask) => {
          const meta = SEVERITY_META[ask.severity];
          const targetTab = SECTION_TAB[ask.section];
          const Icon = meta.icon;
          return (
            <li
              key={ask.id}
              data-testid={`calibration-ask-${ask.id}`}
              className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <Icon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{ask.title}</span>
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium uppercase tracking-wide ${meta.chipClass}`}>
                    {ask.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{ask.detail}</p>
                {ask.actions && ask.actions.length > 0 && onRunAction && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ask.actions.map((action) => {
                      const busy = runningAction === `${ask.id}:${action.kind}`;
                      return (
                        <Button
                          key={action.kind}
                          variant="secondary"
                          size="sm"
                          disabled={runningAction !== null}
                          data-testid={`calibration-action-${ask.id}-${action.kind}`}
                          onClick={() => void runAction(ask.id, action)}
                        >
                          {busy ? t("calibration.actionRunning") : action.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {onDismiss && ask.id.startsWith("rule-violated-") && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700 disabled:opacity-50"
                    disabled={dismissing === ask.id}
                    data-testid={`calibration-dismiss-${ask.id}`}
                    onClick={() => void dismissAsk(ask.id)}
                  >
                    {dismissing === ask.id ? t("calibration.actionRunning") : t("calibration.dismiss")}
                  </button>
                )}
              </div>
              {!ask.hideJump && (
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onJumpToTab(targetTab)}>
                  {t(`tabNav.${targetTab}`)}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {restoreLink}
    </div>
  );
}
