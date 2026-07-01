"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Database,
  Lightbulb,
  Palette,
  Package,
  Save,
  Calendar,
  Clock,
} from "lucide-react";
import { Badge, Input, ProgressBar } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useEstimateTimeline } from "../../hooks";
import { GOAL_LABELS } from "../../lib/goal-types";

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
  const { t } = useTranslation("campaigns-wizard");
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
          className="text-xs text-primary hover:text-primary-700 font-medium"
        >
          {t("actions.edit")}
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export function ReviewStep() {
  const { t } = useTranslation("campaigns-wizard");
  const name = useCampaignWizardStore((s) => s.name);
  const description = useCampaignWizardStore((s) => s.description);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const selectedKnowledgeIds = useCampaignWizardStore(
    (s) => s.selectedKnowledgeIds,
  );
  const blueprintResult = useCampaignWizardStore((s) => s.blueprintResult);
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
    <div className="space-y-4">
      {/* Review sections — 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Campaign Setup */}
        <ReviewSection
          title={t("reviewStep.sections.setup")}
          icon={Settings}
          step={1}
          onEdit={() => setCurrentStep(1)}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("reviewStep.name")}</span>
              <span className="text-sm font-medium text-gray-900">{name}</span>
            </div>
            {description && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {t("reviewStep.description")}
                </span>
                <span className="text-sm text-gray-700 text-right">
                  {description}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("reviewStep.goal")}</span>
              <Badge variant="teal" size="sm">
                {campaignGoalType
                  ? GOAL_LABELS[campaignGoalType] || campaignGoalType
                  : "--"}
              </Badge>
            </div>
            {(startDate || endDate) && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t("reviewStep.dates")}</span>
                <span className="text-sm text-gray-700">
                  {startDate || t("reviewStep.tbd")} &mdash; {endDate || t("reviewStep.tbd")}
                </span>
              </div>
            )}
          </div>
        </ReviewSection>

        {/* 2. Knowledge Assets */}
        <ReviewSection
          title={t("reviewStep.sections.knowledge")}
          icon={Database}
          step={2}
          onEdit={() => setCurrentStep(2)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">
                {selectedKnowledgeIds.length}
              </span>{" "}
              {t("reviewStep.assetsSelected", { count: selectedKnowledgeIds.length })}
            </span>
          </div>
        </ReviewSection>

        {/* 3. Strategy */}
        <ReviewSection
          title={t("reviewStep.sections.strategy")}
          icon={Lightbulb}
          step={3}
          onEdit={() => setCurrentStep(3)}
        >
          {blueprintResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{t("reviewStep.confidence")}</span>
                {blueprintResult.confidence > 0 ? (
                  <div className="flex-1 max-w-[200px]">
                    <ProgressBar
                      value={blueprintResult.confidence}
                      color={
                        blueprintResult.confidence >= 80
                          ? "emerald"
                          : blueprintResult.confidence >= 60
                            ? "amber"
                            : "red"
                      }
                      size="sm"
                      showLabel
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">{t("reviewStep.calculatedOnLaunch")}</span>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-500">{t("reviewStep.theme")}</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {blueprintResult.strategy.campaignTheme}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">{t("reviewStep.positioning")}</span>
                <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                  {blueprintResult.strategy.positioningStatement}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{t("reviewStep.journeyPhases", { count: blueprintResult.architecture.journeyPhases.length })}</span>
                <span>{t("reviewStep.channels", { count: blueprintResult.channelPlan.channels.length })}</span>
                {(blueprintResult.variantAScore > 0 || blueprintResult.variantBScore > 0 || blueprintResult.variantCScore > 0) && (
                  <span>{t("reviewStep.variantScores", { a: (blueprintResult.variantAScore ?? 0).toFixed(1), b: (blueprintResult.variantBScore ?? 0).toFixed(1), c: (blueprintResult.variantCScore ?? 0).toFixed(1) })}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {t("reviewStep.noStrategy")}
            </p>
          )}
        </ReviewSection>

        {/* 4. Concept */}
        <ReviewSection
          title={t("reviewStep.sections.concept")}
          icon={Palette}
          step={4}
          onEdit={() => setCurrentStep(4)}
        >
          {blueprintResult ? (
            <div className="space-y-2">
              {blueprintResult.strategy.creativePlatform && (
                <div>
                  <span className="text-xs text-gray-500">{t("reviewStep.creativePlatform")}</span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {blueprintResult.strategy.creativePlatform}
                  </p>
                </div>
              )}
              {blueprintResult.strategy.memorableDevice && (
                <div>
                  <span className="text-xs text-gray-500">{t("reviewStep.memorableDevice")}</span>
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                    {blueprintResult.strategy.memorableDevice}
                  </p>
                </div>
              )}
              {blueprintResult.strategy.effieRationale && (
                <div>
                  <span className="text-xs text-gray-500">{t("reviewStep.awardPotential")}</span>
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                    {blueprintResult.strategy.effieRationale}
                  </p>
                </div>
              )}
              {!blueprintResult.strategy.creativePlatform && !blueprintResult.strategy.memorableDevice && (
                <p className="text-sm text-gray-400 italic">
                  {t("reviewStep.conceptAfterElaboration")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {t("reviewStep.noConcept")}
            </p>
          )}
        </ReviewSection>

        {/* 5. Deliverables */}
        <ReviewSection
          title={t("reviewStep.sections.deliverables")}
          icon={Package}
          step={5}
          onEdit={() => setCurrentStep(5)}
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
                <span className="text-xs text-gray-500">{t("reviewStep.total")}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {t("reviewStep.deliverablesTotal", { count: totalDeliverables })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {t("reviewStep.noDeliverables")}
            </p>
          )}
        </ReviewSection>
      </div>

      {/* Template + Timeline — 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 5. Template */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">
              {t("reviewStep.saveAsTemplate")}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              {t("reviewStep.saveTemplateDescription")}
            </span>
          </label>
          {saveAsTemplate && (
            <Input
              label={t("reviewStep.templateName")}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t("reviewStep.templatePlaceholder")}
            />
          )}
        </div>

        {/* Estimated Timeline */}
        {timeline && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">
                {t("reviewStep.estimatedTimeline")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary-500" />
              <span className="text-gray-700">
                {t("reviewStep.estimatedCompletion")}{" "}
                <span className="font-semibold text-gray-900">
                  {t("reviewStep.daysCount", { count: timeline.estimatedDays })}
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
                      {t("reviewStep.daysCount", { count: phase.days })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewStep;
