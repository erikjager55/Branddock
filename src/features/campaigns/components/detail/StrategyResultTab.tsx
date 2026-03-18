"use client";

import React from "react";
import {
  Sparkles,
  Target,
  Users,
  Share2,
  FileText,
  Lightbulb,
  CalendarDays,
} from "lucide-react";
import { Badge, EmptyState, StatCard } from "@/components/shared";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { StrategySection } from "./strategy/StrategySection";
import { ChannelPlanSection } from "./strategy/ChannelPlanSection";
import { DeploymentTimelineSection } from "./strategy/DeploymentTimelineSection";
import { RegenerateSectionButton } from "./strategy/RegenerateSectionButton";
import type { StrategyResponse, LegacyStrategyResponse } from "@/types/campaign";

/** Type guard for legacy strategy format */
function isLegacyStrategy(s: StrategyResponse): s is LegacyStrategyResponse {
  return !("format" in s) || s.format !== "blueprint";
}

interface StrategyResultTabProps {
  strategy: StrategyResponse | undefined;
  campaignId: string;
  isLoading: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  /** Called when user clicks "Bring to Life" on an asset plan deliverable */
  onBringToLife?: (deliverableTitle: string, contentType: string) => void;
  /** Optional campaign start date — enables week date labels in the timeline */
  campaignStartDate?: string | null;
}

// Blueprint tabs (3 tabs: Timeline, Campaign Strategy, Channel & Media)
const BLUEPRINT_TABS = [
  { id: "timeline" as const, label: "Campaign Timeline", icon: CalendarDays },
  { id: "strategy" as const, label: "Campaign Strategy", icon: Target },
  { id: "channel-plan" as const, label: "Channel & Media", icon: Share2 },
];

// Legacy sub-tabs (backward compat)
const LEGACY_SUB_TABS = [
  { id: "core-concept" as const, label: "Core Concept", icon: Target },
  { id: "channel-mix" as const, label: "Channel Mix", icon: Share2 },
  { id: "target-audience" as const, label: "Target Audience", icon: Users },
  { id: "deliverables" as const, label: "Deliverables", icon: FileText },
];

/** Strategy result with summary stats at top, then Timeline / Strategy / Channel Plan tabs */
export function StrategyResultTab({
  strategy,
  campaignId,
  isLoading,
  onGenerate,
  isGenerating,
  onBringToLife,
  campaignStartDate,
}: StrategyResultTabProps) {
  const { activeStrategySubTab, setActiveStrategySubTab } = useCampaignStore();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // No strategy generated yet
  if (!strategy) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Strategy not generated yet"
        description="Generate an AI-powered strategy based on your knowledge assets."
        action={{ label: "Generate Strategy", onClick: onGenerate }}
      />
    );
  }

  // ─── Blueprint format — tabbed layout ──────────────────────
  if (!isLegacyStrategy(strategy)) {
    const { blueprint } = strategy;

    // Ensure we're on a valid blueprint tab
    const validBlueprintIds = BLUEPRINT_TABS.map((t) => t.id);
    const currentTab = validBlueprintIds.includes(activeStrategySubTab as typeof validBlueprintIds[number])
      ? (activeStrategySubTab as typeof validBlueprintIds[number])
      : "timeline";

    const phaseCount = blueprint.architecture?.journeyPhases?.length ?? 0;
    const touchpointCount = (blueprint.architecture?.journeyPhases ?? []).reduce(
      (sum: number, p: { touchpoints?: unknown[] }) => sum + (p.touchpoints?.length ?? 0), 0
    );
    const channelCount = blueprint.channelPlan?.channels?.length ?? 0;
    const deliverableCount = blueprint.assetPlan?.totalDeliverables ?? 0;

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Journey Phases" value={phaseCount} icon={Target} />
          <StatCard label="Touchpoints" value={touchpointCount} icon={Share2} />
          <StatCard label="Channels" value={channelCount} icon={Share2} />
          <StatCard label="Deliverables" value={deliverableCount} icon={FileText} />
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          {BLUEPRINT_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStrategySubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Campaign Timeline tab */}
        {currentTab === "timeline" && (
          blueprint.assetPlan && blueprint.architecture && blueprint.channelPlan ? (
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Timeline</h3>
                <div className="flex items-center gap-2">
                  <RegenerateSectionButton campaignId={campaignId} layer="architecture" label="Regenerate Journey" />
                  <RegenerateSectionButton campaignId={campaignId} layer="assetPlan" label="Regenerate Assets" />
                </div>
              </div>
              <DeploymentTimelineSection
                assetPlan={blueprint.assetPlan}
                architecture={blueprint.architecture}
                channelPlan={blueprint.channelPlan}
                onBringToLife={onBringToLife}
                campaignStartDate={campaignStartDate}
              />
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Timeline not available yet"
              description="Generate a campaign strategy to see the deployment timeline."
            />
          )
        )}

        {/* Campaign Strategy tab */}
        {currentTab === "strategy" && (
          blueprint.strategy ? (
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Strategy</h3>
                <RegenerateSectionButton campaignId={campaignId} layer="strategy" />
              </div>
              <StrategySection strategy={blueprint.strategy} />
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="Strategy not available yet"
              description="Generate a campaign strategy to see the strategic approach."
            />
          )
        )}

        {/* Channel & Media Plan tab */}
        {currentTab === "channel-plan" && (
          blueprint.channelPlan ? (
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Channel & Media Plan</h3>
                <RegenerateSectionButton campaignId={campaignId} layer="channelPlan" />
              </div>
              <ChannelPlanSection channelPlan={blueprint.channelPlan} />
            </div>
          ) : (
            <EmptyState
              icon={Share2}
              title="Channel plan not available yet"
              description="Generate a campaign strategy to see the channel and media plan."
            />
          )
        )}
      </div>
    );
  }

  // ─── Legacy format ─────────────────────────────────────────
  if (!strategy.strategicApproach) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Strategy not generated yet"
        description="Generate an AI-powered strategy based on your knowledge assets."
        action={{ label: "Generate Strategy", onClick: onGenerate }}
      />
    );
  }

  return (
    <div>
      {/* Confidence Badge + Persona Context */}
      {strategy.confidence != null && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <Badge variant="success">
            {Math.round(strategy.confidence)}% Confidence
          </Badge>
          {strategy.generatedAt && (
            <span className="text-xs text-gray-400">
              Generated {new Date(strategy.generatedAt).toLocaleDateString()}
            </span>
          )}
          {strategy.personaCount != null && strategy.personaCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {strategy.personaCount} persona{strategy.personaCount !== 1 ? "s" : ""} used as context
            </span>
          )}
          {strategy.personaCount === 0 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600">
              <Lightbulb className="w-3.5 h-3.5" />
              Add personas to get more targeted campaign strategies
            </span>
          )}
        </div>
      )}

      {/* Legacy Sub Tabs */}
      {(() => {
        // Ensure we're on a valid legacy tab (e.g. after switching from blueprint campaign)
        const validLegacyIds = LEGACY_SUB_TABS.map((t) => t.id);
        const currentLegacyTab = validLegacyIds.includes(activeStrategySubTab as typeof validLegacyIds[number])
          ? (activeStrategySubTab as typeof validLegacyIds[number])
          : "core-concept";

        return (
          <>
            <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
              {LEGACY_SUB_TABS.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveStrategySubTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      currentLegacyTab === tab.id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Legacy Sub Tab Content */}
            <div className="bg-white rounded-lg border p-6">
              {currentLegacyTab === "core-concept" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Core Concept</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {strategy.strategicApproach}
            </p>
            {strategy.keyMessages.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Messages</h4>
                <ul className="space-y-2">
                  {strategy.keyMessages.map((msg, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="h-5 w-5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

              {currentLegacyTab === "channel-mix" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Channel Mix</h3>
            {strategy.recommendedChannels.length > 0 ? (
              <div className="space-y-3">
                {strategy.recommendedChannels.map((channel, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{channel}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No channel recommendations available.</p>
            )}
          </div>
        )}

              {currentLegacyTab === "target-audience" && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Target Audience</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {strategy.targetAudience || "Target audience insights will be generated with your strategy."}
                  </p>
                </div>
              )}

              {currentLegacyTab === "deliverables" && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recommended Deliverables</h3>
                  <p className="text-gray-500">
                    Deliverables based on your strategy will appear in the Deliverables tab.
                  </p>
                </div>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
