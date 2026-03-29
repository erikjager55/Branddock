"use client";

import React from "react";
import {
  Sparkles,
  Target,
  Layers,
  Eye,
  Palette,
  Megaphone,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Users,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/shared";
import type {
  StrategyLayer,
  ArchitectureLayer,
  HookConcept,
} from "../../types/campaign-wizard.types";
import type { StrategicChoice } from "@/lib/campaigns/strategy-blueprint.types";

function getChoiceText(choice: string | StrategicChoice): string {
  return typeof choice === "string" ? choice : choice.choice;
}

// ─── Types ──────────────────────────────────────────────

interface ProposalReviewViewProps {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
  hookConcept: HookConcept;
  onElaborate: () => void;
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

// ─── Strategy Field ──────────────────────────────────────

function StrategyField({
  icon: Icon,
  iconColor,
  label,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 border border-primary-100/60">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-primary-100 shadow-sm">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <div className="text-sm text-primary-900 break-words">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function ProposalReviewView({
  strategy,
  architecture,
  hookConcept,
  onElaborate: _onElaborate,
  errorMessage,
}: ProposalReviewViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Refined Campaign Proposal
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your selected hook has been refined into a production-ready campaign
          concept. Review the proposal and proceed to journey elaboration.
        </p>
      </div>

      {/* Campaign Strategy — visually rich, moved to top */}
      <div className="bg-gradient-to-br from-primary-50 via-emerald-50 to-cyan-50 rounded-xl border border-primary-200 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shadow-sm">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-base font-semibold text-primary-900">
            Campaign Strategy
          </h4>
        </div>

        <div className="space-y-2.5">
          {strategy.campaignTheme && (
            <StrategyField icon={Compass} iconColor="text-primary-500" label="Theme">
              {strategy.campaignTheme}
            </StrategyField>
          )}
          {strategy.positioningStatement && (
            <StrategyField icon={Target} iconColor="text-emerald-500" label="Positioning">
              {strategy.positioningStatement}
            </StrategyField>
          )}
          {strategy.humanInsight && (
            <StrategyField icon={Lightbulb} iconColor="text-amber-500" label="Human Insight">
              {strategy.humanInsight}
            </StrategyField>
          )}
          {strategy.creativePlatform && (
            <StrategyField icon={Sparkles} iconColor="text-violet-500" label="Creative Platform">
              {strategy.creativePlatform}
            </StrategyField>
          )}
          {strategy.strategicChoices && strategy.strategicChoices.length > 0 && (
            <StrategyField icon={CheckCircle2} iconColor="text-blue-500" label="Strategic Choices">
              <ul className="space-y-1">
                {strategy.strategicChoices.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary-400 mt-0.5 shrink-0">&bull;</span>
                    <span>{getChoiceText(c)}</span>
                  </li>
                ))}
              </ul>
            </StrategyField>
          )}
        </div>
      </div>

      {/* Hook Concept Highlight */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <h4 className="text-base font-semibold text-violet-900">
            {hookConcept.hookTitle}
          </h4>
        </div>
        <p className="text-sm text-violet-800 mb-3 break-words">{hookConcept.bigIdea}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Megaphone className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-600">
                Campaign Line
              </p>
              <p className="text-sm text-violet-800 break-words">
                {hookConcept.campaignLine}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Eye className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-600">
                Visual Direction
              </p>
              <p className="text-sm text-violet-800 break-words">
                {hookConcept.visualDirection}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Palette className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-600">Tone</p>
              <p className="text-sm text-violet-800 break-words">
                {hookConcept.toneOfVoice}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Award className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-600">
                Effie Rationale
              </p>
              <p className="text-sm text-violet-800 break-words">
                {hookConcept.effieRationale}
              </p>
            </div>
          </div>
        </div>
        {hookConcept.extendability.length > 0 && (
          <div className="mt-3 pt-3 border-t border-violet-200">
            <p className="text-xs font-medium text-violet-600 mb-1.5">
              Extendability
            </p>
            <div className="flex flex-wrap gap-1.5">
              {hookConcept.extendability.map((e, i) => (
                <Badge key={i} variant="default">
                  <span className="break-words">{e}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Architecture Preview */}
      <Section
        title="Campaign Architecture"
        icon={Layers}
        iconColor="text-blue-500"
      >
        {architecture.campaignType && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Campaign Type
            </p>
            <p className="text-sm text-gray-700 break-words">{architecture.campaignType}</p>
          </div>
        )}
        {architecture.journeyPhases && architecture.journeyPhases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">
              Journey Phases ({architecture.journeyPhases.length})
            </p>
            <div className="space-y-2">
              {architecture.journeyPhases.map((phase, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-gray-50 border border-gray-100 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {phase.name}
                    </span>
                    {phase.kpis && phase.kpis.length > 0 && (
                      <div className="flex gap-1 shrink-0">
                        {phase.kpis.slice(0, 2).map((kpi, j) => (
                          <Badge key={j} variant="default">
                            {kpi}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {phase.goal && (
                    <p className="text-xs text-gray-500 break-words">{phase.goal}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Messaging */}
      {strategy.messagingHierarchy && (
        <Section
          title="Messaging"
          icon={MessageSquare}
          iconColor="text-amber-500"
        >
          {strategy.messagingHierarchy.brandMessage && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Brand Message
              </p>
              <p className="text-sm text-gray-700 break-words">
                {strategy.messagingHierarchy.brandMessage}
              </p>
            </div>
          )}
          {strategy.messagingHierarchy.campaignMessage && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Campaign Message
              </p>
              <p className="text-sm text-gray-700 break-words">
                {strategy.messagingHierarchy.campaignMessage}
              </p>
            </div>
          )}
          {strategy.messagingHierarchy.proofPoints &&
            strategy.messagingHierarchy.proofPoints.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Proof Points
                </p>
                <ul className="space-y-1">
                  {strategy.messagingHierarchy.proofPoints.map(
                    (m, i) => (
                      <li key={i} className="text-sm text-gray-600 break-words">
                        &bull; {m}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
        </Section>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
