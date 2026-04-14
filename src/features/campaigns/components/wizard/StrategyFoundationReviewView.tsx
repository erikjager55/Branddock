"use client";

import React from "react";
import {
  Brain,
  Compass,
  Users,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { ElementRatingCard } from "./ElementRatingCard";
import type { StrategyFoundation } from "../../types/campaign-wizard.types";

// ─── Helpers ─────────────────────────────────────────────

/** Safely coerce an AI-returned value to a display string. The AI may return
 *  plain strings OR objects (e.g. {barrier, severity, comBComponent, description}).
 *  This picks the most descriptive string field, or JSON-stringifies as last resort. */
function toDisplayString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Pick the most descriptive text field available
    for (const key of ["barrier", "behavior", "name", "title", "description", "label", "text", "value", "techniqueName", "factor", "insight", "opportunity", "summary", "rationale"]) {
      if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
    }
    // Fallback: join all string values
    const strings = Object.values(obj).filter((v) => typeof v === "string" && v) as string[];
    if (strings.length > 0) return strings.join(" — ");
    return JSON.stringify(value);
  }
  return String(value);
}

// ─── Types ──────────────────────────────────────────────

interface StrategyFoundationReviewViewProps {
  foundation: StrategyFoundation;
  onProceed: () => void;
  errorMessage?: string | null;
}

// ─── Collapsible Section ─────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────

export function StrategyFoundationReviewView({
  foundation,
  onProceed,
  errorMessage,
}: StrategyFoundationReviewViewProps) {
  const strategyFeedback = useCampaignWizardStore((s) => s.strategyFeedback);
  const setStrategyFeedback = useCampaignWizardStore(
    (s) => s.setStrategyFeedback,
  );
  const skipConceptStep = useCampaignWizardStore((s) => s.skipConceptStep);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Strategy Foundation
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          AI has built a behavioral science-driven strategy foundation. Review
          the insights and provide feedback{skipConceptStep ? '.' : ' before creative concept generation.'}
        </p>
      </div>

      {/* Strategic Direction + Suggested Approach — read-only when concept step is active */}
      {!skipConceptStep && (
        <>
          <div className="bg-gradient-to-r from-primary-50 to-emerald-50 rounded-xl border border-primary-100 p-5">
            <div className="flex items-start gap-3">
              <Compass className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary-800 mb-1">
                  Strategic Direction
                </p>
                <p className="text-sm text-primary-700">
                  {toDisplayString(foundation.strategicDirection)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Suggested Approach
                </p>
                <p className="text-sm text-blue-700">
                  {toDisplayString(foundation.suggestedApproach)}
                </p>
              </div>
            </div>
          </div>

          {/* Core Message + Proof Points (read-only in concept flow) */}
          {foundation.coreMessage && (
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">Core Message</p>
                  <p className="text-sm text-amber-700">{toDisplayString(foundation.coreMessage)}</p>
                </div>
              </div>
            </div>
          )}
          {(foundation.proofPoints ?? []).length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Proof Points</p>
                  <ul className="space-y-1">
                    {(foundation.proofPoints ?? []).map((p, i) => (
                      <li key={i} className="text-sm text-gray-600">&bull; {toDisplayString(p)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {foundation.reasonToAct && (
            <div className="bg-rose-50 rounded-xl border border-rose-100 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-rose-800 mb-1">Reason to Act Now</p>
                  <p className="text-sm text-rose-700">{toDisplayString(foundation.reasonToAct)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Strategic Rationale Rating (replaces read-only cards when skipping concept step) */}
      {skipConceptStep && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Rate the strategic rationale
          </p>
          <ElementRatingCard
            label="Strategic Direction"
            value={toDisplayString(foundation.strategicDirection)}
            ratingKey="strategicDirection"
            icon={Compass}
            highlighted
            highlightBg="bg-emerald-50"
          />
          <ElementRatingCard
            label="Suggested Approach"
            value={toDisplayString(foundation.suggestedApproach)}
            ratingKey="suggestedApproach"
            icon={Target}
            highlighted
            highlightBg="bg-blue-50"
          />
          {foundation.coreMessage && (
            <ElementRatingCard
              label="Core Message"
              value={toDisplayString(foundation.coreMessage)}
              ratingKey="coreMessage"
              icon={Target}
              highlighted
              highlightBg="bg-amber-50"
            />
          )}
          {(foundation.proofPoints ?? []).length > 0 && (
            <ElementRatingCard
              label="Proof Points"
              value={(foundation.proofPoints ?? []).map((p, i) => `${i + 1}. ${toDisplayString(p)}`).join('\n')}
              ratingKey="proofPoints"
              icon={Lightbulb}
            />
          )}
          {foundation.reasonToAct && (
            <ElementRatingCard
              label="Reason to Act Now"
              value={toDisplayString(foundation.reasonToAct)}
              ratingKey="reasonToAct"
              icon={Sparkles}
            />
          )}
          {foundation.behavioralStrategy?.summary && (
            <ElementRatingCard
              label="Behavioral Strategy"
              value={toDisplayString(foundation.behavioralStrategy.summary)}
              ratingKey="behavioralStrategy"
              icon={Sparkles}
            />
          )}
          {foundation.elmRouteRecommendation?.rationale && (
            <ElementRatingCard
              label="ELM Route"
              value={`${foundation.elmRouteRecommendation.primaryRoute === 'central' ? 'Central' : 'Peripheral'} — ${toDisplayString(foundation.elmRouteRecommendation.rationale)}`}
              ratingKey="elmRoute"
              icon={Compass}
            />
          )}
        </div>
      )}

      {/* Feedback */}
      <div className="space-y-2">
        <label
          htmlFor="strategy-feedback"
          className="text-sm font-medium text-gray-700"
        >
          Feedback or refinements (optional)
        </label>
        <textarea
          id="strategy-feedback"
          className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
          rows={3}
          placeholder="Any strategic direction you want to emphasize, audiences to focus on, or approaches to avoid..."
          value={strategyFeedback}
          onChange={(e) => setStrategyFeedback(e.target.value)}
        />
      </div>

      {/* Behavioral Diagnosis */}
      <Section
        title="Behavioral Diagnosis"
        icon={Brain}
        iconColor="text-purple-500"
      >
        {/* Target behaviors */}
        {(foundation.targetBehaviors ?? []).length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">
              Target Behaviors
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(foundation.targetBehaviors ?? []).map((b, i) => (
                <Badge key={i} variant="default">
                  {toDisplayString(b)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {/* Barriers & desired behaviors */}
        {foundation.behavioralDiagnosis && (
          <>
            {(foundation.behavioralDiagnosis.behavioralBarriers ?? []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Behavioral Barriers
                </p>
                <ul className="space-y-1">
                  {(foundation.behavioralDiagnosis.behavioralBarriers ?? []).map(
                    (b, i) => (
                      <li key={i} className="text-sm text-gray-600">
                        &bull; {toDisplayString(b)}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
            {(foundation.behavioralDiagnosis.desiredBehaviors ?? []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Desired Behaviors
                </p>
                <ul className="space-y-1">
                  {(foundation.behavioralDiagnosis.desiredBehaviors ?? []).map(
                    (b, i) => (
                      <li key={i} className="text-sm text-gray-600">
                        &bull; {toDisplayString(b)}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Behavioral Strategy */}
      {foundation.behavioralStrategy && (
        <Section
          title="Behavioral Strategy"
          icon={Sparkles}
          iconColor="text-amber-500"
        >
          <p className="text-sm text-gray-700">
            {toDisplayString(foundation.behavioralStrategy.summary)}
          </p>
          {(foundation.behavioralStrategy.selectedBCTs ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">
                Selected BCTs
              </p>
              <div className="space-y-1.5">
                {(foundation.behavioralStrategy.selectedBCTs ?? []).map((bct, i) => (
                  <div
                    key={i}
                    className="text-sm text-gray-600 border-l-2 border-amber-300 pl-3"
                  >
                    <span className="font-medium">{toDisplayString(bct.techniqueName)}</span>
                    {bct.applicationHint && (
                      <span className="text-gray-500">
                        {" "}
                        — {toDisplayString(bct.applicationHint)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ELM Route */}
      {foundation.elmRouteRecommendation && (
        <Section
          title="ELM Route Recommendation"
          icon={Compass}
          iconColor="text-indigo-500"
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={
                foundation.elmRouteRecommendation.primaryRoute === "central"
                  ? "success"
                  : "info"
              }
            >
              {foundation.elmRouteRecommendation.primaryRoute === "central"
                ? "Central Route"
                : "Peripheral Route"}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            {toDisplayString(foundation.elmRouteRecommendation.rationale)}
          </p>
        </Section>
      )}

      {/* Key Insights */}
      <Section
        title="Key Insights"
        icon={Lightbulb}
        iconColor="text-yellow-500"
      >
        {(foundation.keyInsights ?? []).length > 0 && (
          <div className="space-y-2">
            {(foundation.keyInsights ?? []).map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{toDisplayString(insight.insight)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default">{toDisplayString(insight.source)}</Badge>
                    <Badge
                      variant={
                        insight.confidence === "high"
                          ? "success"
                          : insight.confidence === "medium"
                            ? "warning"
                            : "default"
                      }
                    >
                      {toDisplayString(insight.confidence)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Audience Insights */}
      {(foundation.audienceInsights ?? []).length > 0 && (
        <Section
          title="Audience Insights"
          icon={Users}
          iconColor="text-blue-500"
        >
          <div className="space-y-3">
            {(foundation.audienceInsights ?? []).map((ai, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-white p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-800">
                    {toDisplayString(ai.personaName) || "Unknown Persona"}
                  </span>
                  <Badge variant="default">{toDisplayString(ai.ttmStage) || "Unknown"}</Badge>
                  {ai.elmRoute && (
                    <Badge
                      variant={
                        ai.elmRoute === "central" ? "success" : "info"
                      }
                    >
                      {toDisplayString(ai.elmRoute)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{toDisplayString(ai.insight)}</p>
                {(ai.topCasiBarriers ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(ai.topCasiBarriers ?? []).map((b, j) => (
                      <Badge key={j} variant="warning">
                        {toDisplayString(b)}
                      </Badge>
                    ))}
                  </div>
                )}
                {(ai.recommendedBCTs ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(ai.recommendedBCTs ?? []).map((b, j) => (
                      <Badge key={j} variant="success">
                        {toDisplayString(b)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* MINDSPACE Assessment */}
      {(foundation.mindspaceAssessment ?? []).length > 0 && (
        <Section
          title="MINDSPACE Assessment"
          icon={Brain}
          iconColor="text-violet-500"
        >
          <div className="grid grid-cols-2 gap-2">
            {(foundation.mindspaceAssessment ?? []).map((m, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${
                  m.applicable
                    ? "bg-emerald-50 border border-emerald-100"
                    : "bg-gray-50 border border-gray-100"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`font-medium ${
                      m.applicable ? "text-emerald-800" : "text-gray-500"
                    }`}
                  >
                    {toDisplayString(m.factor)}
                  </span>
                  {m.applicable && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
                <p
                  className={
                    m.applicable ? "text-emerald-700" : "text-gray-500"
                  }
                >
                  {toDisplayString(m.opportunity)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Actions removed — the wizard Continue button handles progression */}
    </div>
  );
}
