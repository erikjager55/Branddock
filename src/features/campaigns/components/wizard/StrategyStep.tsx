"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Pencil,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Target,
  Users as UsersIcon,
  Radio,
} from "lucide-react";
import { Badge, Button, ProgressBar } from "@/components/shared";
import { useGenerateStrategy, useRegenerateStrategy } from "../../hooks";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";

// ─── Collapsible Section ──────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">{title}</span>
      </button>
      {isOpen && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

// ─── Confidence Color ─────────────────────────────────────

function getConfidenceColor(confidence: number): "emerald" | "amber" | "red" {
  if (confidence >= 80) return "emerald";
  if (confidence >= 60) return "amber";
  return "red";
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 80) return "text-emerald-600";
  if (confidence >= 60) return "text-amber-500";
  return "text-red-500";
}

// ─── Component ────────────────────────────────────────────

export function StrategyStep() {
  const name = useCampaignWizardStore((s) => s.name);
  const description = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const selectedKnowledgeIds = useCampaignWizardStore(
    (s) => s.selectedKnowledgeIds,
  );
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const isGenerating = useCampaignWizardStore((s) => s.isGenerating);
  const setIsGenerating = useCampaignWizardStore((s) => s.setIsGenerating);
  const strategyResult = useCampaignWizardStore((s) => s.strategyResult);
  const setStrategyResult = useCampaignWizardStore(
    (s) => s.setStrategyResult,
  );
  const isStrategyEditing = useCampaignWizardStore(
    (s) => s.isStrategyEditing,
  );
  const setIsStrategyEditing = useCampaignWizardStore(
    (s) => s.setIsStrategyEditing,
  );

  const generateStrategy = useGenerateStrategy();
  const regenerateStrategy = useRegenerateStrategy();

  // Edit state for inline editing
  const [editApproach, setEditApproach] = useState("");
  const [editMessages, setEditMessages] = useState<string[]>([]);
  const [editAudience, setEditAudience] = useState("");

  const handleGenerate = () => {
    if (!campaignGoalType) return;

    setIsGenerating(true);
    generateStrategy.mutate(
      {
        campaignName: name,
        description,
        goalType: campaignGoalType,
        knowledgeIds: selectedKnowledgeIds,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      {
        onSuccess: (result) => {
          setStrategyResult(result);
          setIsGenerating(false);
        },
        onError: () => {
          setIsGenerating(false);
        },
      },
    );
  };

  const handleRegenerate = () => {
    if (!campaignGoalType) return;

    setIsGenerating(true);
    regenerateStrategy.mutate(
      {
        campaignName: name,
        description,
        goalType: campaignGoalType,
        knowledgeIds: selectedKnowledgeIds,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      {
        onSuccess: (result) => {
          setStrategyResult(result);
          setIsGenerating(false);
          setIsStrategyEditing(false);
        },
        onError: () => {
          setIsGenerating(false);
        },
      },
    );
  };

  const handleStartEdit = () => {
    if (!strategyResult) return;
    setEditApproach(strategyResult.strategicApproach);
    setEditMessages([...strategyResult.keyMessages]);
    setEditAudience(strategyResult.targetAudienceInsights);
    setIsStrategyEditing(true);
  };

  const handleSaveEdit = () => {
    if (!strategyResult) return;
    setStrategyResult({
      ...strategyResult,
      strategicApproach: editApproach,
      keyMessages: editMessages.filter((m) => m.trim()),
      targetAudienceInsights: editAudience,
    });
    setIsStrategyEditing(false);
  };

  const handleCancelEdit = () => {
    setIsStrategyEditing(false);
  };

  const updateMessage = (index: number, value: string) => {
    const updated = [...editMessages];
    updated[index] = value;
    setEditMessages(updated);
  };

  // ── Pre-generation state ──
  if (!strategyResult && !isGenerating) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generate AI Strategy
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Our AI will analyze your selected knowledge assets and campaign goals
          to create a tailored content strategy.
        </p>
        <Button variant="cta" size="lg" icon={Sparkles} onClick={handleGenerate}>
          Generate AI Strategy
        </Button>
      </div>
    );
  }

  // ── Generating state ──
  if (isGenerating) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generating Strategy...
        </h3>
        <p className="text-sm text-gray-500">
          Analyzing your brand knowledge and campaign goals
        </p>
      </div>
    );
  }

  // ── Post-generation: show results ──
  if (!strategyResult) return null;

  const confidenceColor = getConfidenceColor(strategyResult.confidence);
  const confidenceTextColor = getConfidenceTextColor(strategyResult.confidence);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Confidence bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Strategy Confidence
          </span>
          <span className={`text-lg font-bold ${confidenceTextColor}`}>
            {strategyResult.confidence}%
          </span>
        </div>
        <ProgressBar
          value={strategyResult.confidence}
          color={confidenceColor}
          size="md"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          onClick={handleRegenerate}
        >
          Regenerate
        </Button>
        {!isStrategyEditing && (
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={handleStartEdit}
          >
            Edit
          </Button>
        )}
        {isStrategyEditing && (
          <>
            <Button variant="cta" size="sm" onClick={handleSaveEdit}>
              Save Changes
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Strategy sections */}
      <div className="space-y-3">
        {/* Strategic Approach */}
        <CollapsibleSection title="Strategic Approach" icon={MessageSquare}>
          {isStrategyEditing ? (
            <textarea
              value={editApproach}
              onChange={(e) => setEditApproach(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">
              {strategyResult.strategicApproach}
            </p>
          )}
        </CollapsibleSection>

        {/* Key Messages */}
        <CollapsibleSection title="Key Messages" icon={Target}>
          {isStrategyEditing ? (
            <div className="space-y-2">
              {editMessages.map((msg, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={msg}
                  onChange={(e) => updateMessage(idx, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {strategyResult.keyMessages.map((msg, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold mt-0.5">
                    {idx + 1}
                  </span>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        {/* Target Audience Insights */}
        <CollapsibleSection
          title="Target Audience Insights"
          icon={UsersIcon}
        >
          {isStrategyEditing ? (
            <textarea
              value={editAudience}
              onChange={(e) => setEditAudience(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">
              {strategyResult.targetAudienceInsights}
            </p>
          )}
        </CollapsibleSection>

        {/* Recommended Channels */}
        <CollapsibleSection title="Recommended Channels" icon={Radio}>
          <div className="flex flex-wrap gap-2">
            {strategyResult.recommendedChannels.map((channel) => (
              <Badge key={channel} variant="teal">
                {channel}
              </Badge>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

export default StrategyStep;
