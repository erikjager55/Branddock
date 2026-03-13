"use client";

import React from "react";
import {
  Sparkles,
  Target,
  Users,
  Share2,
  FileText,
  Lightbulb,
  LayoutDashboard,
  Layers,
  GitBranch,
  Radio,
  Package,
} from "lucide-react";
import { Badge, EmptyState } from "@/components/shared";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { BlueprintOverviewSection } from "./strategy/BlueprintOverviewSection";
import { StrategySection } from "./strategy/StrategySection";
import { ArchitectureSection } from "./strategy/ArchitectureSection";
import { ChannelPlanSection } from "./strategy/ChannelPlanSection";
import { AssetPlanSection } from "./strategy/AssetPlanSection";
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
}

// Legacy sub-tabs (backward compat)
const LEGACY_SUB_TABS = [
  { id: "core-concept" as const, label: "Core Concept", icon: Target },
  { id: "channel-mix" as const, label: "Channel Mix", icon: Share2 },
  { id: "target-audience" as const, label: "Target Audience", icon: Users },
  { id: "deliverables" as const, label: "Deliverables", icon: FileText },
];

// Blueprint sub-tabs (new 5-tab layout)
const BLUEPRINT_SUB_TABS = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "strategy" as const, label: "Strategy", icon: Layers },
  { id: "architecture" as const, label: "Architecture", icon: GitBranch },
  { id: "channel-plan" as const, label: "Channel Plan", icon: Radio },
  { id: "asset-plan" as const, label: "Asset Plan", icon: Package },
];

/** Strategy result tab with 5 sub-tabs for blueprint format, 4 for legacy */
export function StrategyResultTab({
  strategy,
  campaignId,
  isLoading,
  onGenerate,
  isGenerating,
  onBringToLife,
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

  // ─── Blueprint format ──────────────────────────────────────
  if (!isLegacyStrategy(strategy)) {
    const { blueprint } = strategy;

    // Ensure we're on a valid blueprint tab
    const validBlueprintIds = BLUEPRINT_SUB_TABS.map((t) => t.id);
    const currentTab = validBlueprintIds.includes(activeStrategySubTab as typeof validBlueprintIds[number])
      ? (activeStrategySubTab as typeof validBlueprintIds[number])
      : "overview";

    return (
      <div>
        {/* Sub-tab navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {BLUEPRINT_SUB_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStrategySubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
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

        {/* Sub-tab content */}
        <div className="bg-white rounded-lg border p-6">
          {currentTab === "overview" && (
            <BlueprintOverviewSection blueprint={blueprint} />
          )}

          {currentTab === "strategy" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Strategy</h3>
                <RegenerateSectionButton campaignId={campaignId} layer="strategy" />
              </div>
              <StrategySection strategy={blueprint.strategy} />
            </div>
          )}

          {currentTab === "architecture" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Architecture</h3>
                <RegenerateSectionButton campaignId={campaignId} layer="architecture" />
              </div>
              <ArchitectureSection architecture={blueprint.architecture} />
            </div>
          )}

          {currentTab === "channel-plan" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Channel & Media Plan</h3>
                <RegenerateSectionButton campaignId={campaignId} layer="channelPlan" />
              </div>
              <ChannelPlanSection channelPlan={blueprint.channelPlan} />
            </div>
          )}

          {currentTab === "asset-plan" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Asset Plan</h3>
                <RegenerateSectionButton campaignId={campaignId} layer="assetPlan" />
              </div>
              <AssetPlanSection assetPlan={blueprint.assetPlan} onBringToLife={onBringToLife} />
            </div>
          )}
        </div>
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
      <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
        {LEGACY_SUB_TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStrategySubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeStrategySubTab === tab.id
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
        {activeStrategySubTab === "core-concept" && (
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

        {activeStrategySubTab === "channel-mix" && (
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

        {activeStrategySubTab === "target-audience" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Target Audience</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {strategy.targetAudience || "Target audience insights will be generated with your strategy."}
            </p>
          </div>
        )}

        {activeStrategySubTab === "deliverables" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Recommended Deliverables</h3>
            <p className="text-gray-500">
              Deliverables based on your strategy will appear in the Deliverables tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
