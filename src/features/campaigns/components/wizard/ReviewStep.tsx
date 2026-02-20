"use client";

import React from "react";
import {
  Settings,
  Database,
  Lightbulb,
  Package,
  Save,
  Calendar,
  Clock,
} from "lucide-react";
import { Badge, Input, ProgressBar } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useEstimateTimeline } from "../../hooks";

// ─── Goal label map ───────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  BRAND: "Brand Awareness",
  PRODUCT: "Product Launch",
  CONTENT: "Content Marketing",
  ENGAGEMENT: "Audience Engagement",
};

// ─── Section Wrapper ──────────────────────────────────────

function ReviewSection({
  title,
  icon: Icon,
  step,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ElementType;
  step: number;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export function ReviewStep() {
  const name = useCampaignWizardStore((s) => s.name);
  const description = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const selectedKnowledgeIds = useCampaignWizardStore(
    (s) => s.selectedKnowledgeIds,
  );
  const strategyResult = useCampaignWizardStore((s) => s.strategyResult);
  const selectedDeliverables = useCampaignWizardStore(
    (s) => s.selectedDeliverables,
  );
  const saveAsTemplate = useCampaignWizardStore((s) => s.saveAsTemplate);
  const setSaveAsTemplate = useCampaignWizardStore(
    (s) => s.setSaveAsTemplate,
  );
  const templateName = useCampaignWizardStore((s) => s.templateName);
  const setTemplateName = useCampaignWizardStore((s) => s.setTemplateName);
  const setCurrentStep = useCampaignWizardStore((s) => s.setCurrentStep);

  const { data: timeline } = useEstimateTimeline();

  const totalDeliverables = selectedDeliverables.reduce(
    (sum, d) => sum + d.quantity,
    0,
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 1. Campaign Setup */}
      <ReviewSection
        title="Campaign Setup"
        icon={Settings}
        step={1}
        onEdit={() => setCurrentStep(1)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{name}</span>
          </div>
          {description && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-gray-500 flex-shrink-0">
                Description
              </span>
              <span className="text-sm text-gray-700 text-right">
                {description}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Goal</span>
            <Badge variant="teal" size="sm">
              {campaignGoalType
                ? GOAL_LABELS[campaignGoalType] || campaignGoalType
                : "--"}
            </Badge>
          </div>
          {(startDate || endDate) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Dates</span>
              <span className="text-sm text-gray-700">
                {startDate || "TBD"} &mdash; {endDate || "TBD"}
              </span>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* 2. Knowledge Assets */}
      <ReviewSection
        title="Knowledge Assets"
        icon={Database}
        step={2}
        onEdit={() => setCurrentStep(2)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">
              {selectedKnowledgeIds.length}
            </span>{" "}
            {selectedKnowledgeIds.length === 1 ? "asset" : "assets"} selected
          </span>
        </div>
      </ReviewSection>

      {/* 3. Strategy */}
      <ReviewSection
        title="Strategy"
        icon={Lightbulb}
        step={3}
        onEdit={() => setCurrentStep(3)}
      >
        {strategyResult ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Confidence</span>
              <div className="flex-1 max-w-[200px]">
                <ProgressBar
                  value={strategyResult.confidence}
                  color={
                    strategyResult.confidence >= 80
                      ? "emerald"
                      : strategyResult.confidence >= 60
                        ? "amber"
                        : "red"
                  }
                  size="sm"
                  showLabel
                />
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Approach</span>
              <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                {strategyResult.strategicApproach}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No strategy generated yet
          </p>
        )}
      </ReviewSection>

      {/* 4. Deliverables */}
      <ReviewSection
        title="Deliverables"
        icon={Package}
        step={4}
        onEdit={() => setCurrentStep(4)}
      >
        {selectedDeliverables.length > 0 ? (
          <div className="space-y-1.5">
            {selectedDeliverables.map((d) => (
              <div
                key={d.type}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">{d.type}</span>
                <Badge size="sm">&times;{d.quantity}</Badge>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-sm font-semibold text-gray-900">
                {totalDeliverables} deliverables
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No deliverables selected
          </p>
        )}
      </ReviewSection>

      {/* 5. Template */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">
            Save as Template
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            Save this campaign configuration as a reusable template
          </span>
        </label>
        {saveAsTemplate && (
          <Input
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Quarterly Brand Campaign"
          />
        )}
      </div>

      {/* Estimated Timeline */}
      {timeline && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">
              Estimated Timeline
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-teal-500" />
            <span className="text-gray-700">
              Estimated completion in{" "}
              <span className="font-semibold text-gray-900">
                {timeline.estimatedDays} days
              </span>
            </span>
          </div>
          {timeline.breakdown.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              {timeline.breakdown.map((phase) => (
                <div
                  key={phase.phase}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-600">{phase.phase}</span>
                  <span className="text-gray-900 font-medium">
                    {phase.days} {phase.days === 1 ? "day" : "days"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewStep;
