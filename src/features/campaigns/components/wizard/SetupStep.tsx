"use client";

import { useTranslation } from "react-i18next";
import { TrendingUp, Zap, Scale, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/shared";
import { SelectionCard } from "@/components/ui/layout";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { GOAL_CATEGORIES, getTimeBinding } from "../../lib/goal-types";
import { CAMPAIGN_TYPES, getRecommendedCampaignType } from "../../lib/campaign-types";
import { DELIVERABLE_CATEGORIES, getDeliverablesByCategory } from "../../lib/deliverable-types";
import type { StrategicIntent } from "../../types/campaign-wizard.types";
import { PipelineConfigCard } from "./PipelineConfigCard";
import { BriefingSourcesField } from "./BriefingSourcesField";

// ─── Strategic Intent Cards ──────────────────────────────

const STRATEGIC_INTENTS: {
  type: StrategicIntent;
  ratio: string;
  icon: LucideIcon;
}[] = [
  { type: "brand_building", ratio: "60/40", icon: TrendingUp },
  { type: "sales_activation", ratio: "40/60", icon: Zap },
  { type: "hybrid", ratio: "50/50", icon: Scale },
];

// ─── Component ────────────────────────────────────────────

export function SetupStep() {
  const { t } = useTranslation("campaigns-wizard");
  const name = useCampaignWizardStore((s) => s.name);
  const setName = useCampaignWizardStore((s) => s.setName);
  const description = useCampaignWizardStore((s) => s.description);
  const setDescription = useCampaignWizardStore((s) => s.setDescription);
  const wizardMode = useCampaignWizardStore((s) => s.wizardMode);
  const isContentMode = wizardMode === 'content';
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const setCampaignGoalType = useCampaignWizardStore((s) => s.setCampaignGoalType);
  const campaignType = useCampaignWizardStore((s) => s.campaignType);
  const setCampaignType = useCampaignWizardStore((s) => s.setCampaignType);
  const selectedContentType = useCampaignWizardStore((s) => s.selectedContentType);
  const setSelectedContentType = useCampaignWizardStore((s) => s.setSelectedContentType);
  const strategicIntent = useCampaignWizardStore((s) => s.strategicIntent);
  const setStrategicIntent = useCampaignWizardStore((s) => s.setStrategicIntent);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const setStartDate = useCampaignWizardStore((s) => s.setStartDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const setEndDate = useCampaignWizardStore((s) => s.setEndDate);

  // Skip concept toggle
  const skipConceptStep = useCampaignWizardStore((s) => s.skipConceptStep);
  const setSkipConceptStep = useCampaignWizardStore((s) => s.setSkipConceptStep);

  // Briefing fields
  const briefingOccasion = useCampaignWizardStore((s) => s.briefingOccasion);
  const setBriefingOccasion = useCampaignWizardStore((s) => s.setBriefingOccasion);
  const briefingAudienceObjective = useCampaignWizardStore((s) => s.briefingAudienceObjective);
  const setBriefingAudienceObjective = useCampaignWizardStore((s) => s.setBriefingAudienceObjective);
  const briefingCoreMessage = useCampaignWizardStore((s) => s.briefingCoreMessage);
  const setBriefingCoreMessage = useCampaignWizardStore((s) => s.setBriefingCoreMessage);
  const briefingTonePreference = useCampaignWizardStore((s) => s.briefingTonePreference);
  const setBriefingTonePreference = useCampaignWizardStore((s) => s.setBriefingTonePreference);
  const briefingConstraints = useCampaignWizardStore((s) => s.briefingConstraints);
  const setBriefingConstraints = useCampaignWizardStore((s) => s.setBriefingConstraints);
  return (
    <div className="space-y-6">
      {/* Campaign name */}
      <Input
        label={t("setup.nameLabel")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("setup.namePlaceholder")}
        required
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("setup.descriptionLabel")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("setup.descriptionPlaceholder")}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>

      {/* Campaign Briefing */}
      <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-gray-50/50">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="h-4 w-4 text-primary" />
          <label className="text-sm font-medium text-gray-700">
            {t("setup.briefing.title")}
          </label>
          <span className="text-xs text-muted-foreground">{t("setup.briefing.optional")}</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("setup.briefing.occasionLabel")}
          </label>
          <textarea
            value={briefingOccasion}
            onChange={(e) => setBriefingOccasion(e.target.value)}
            placeholder={t("setup.briefing.occasionPlaceholder")}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("setup.briefing.audienceLabel")}
          </label>
          <textarea
            value={briefingAudienceObjective}
            onChange={(e) => setBriefingAudienceObjective(e.target.value)}
            placeholder={t("setup.briefing.audiencePlaceholder")}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("setup.briefing.coreMessageLabel")}
          </label>
          <textarea
            value={briefingCoreMessage}
            onChange={(e) => setBriefingCoreMessage(e.target.value)}
            placeholder={t("setup.briefing.coreMessagePlaceholder")}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("setup.briefing.toneLabel")}
          </label>
          <textarea
            value={briefingTonePreference}
            onChange={(e) => setBriefingTonePreference(e.target.value)}
            placeholder={t("setup.briefing.tonePlaceholder")}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("setup.briefing.constraintsLabel")}
          </label>
          <textarea
            value={briefingConstraints}
            onChange={(e) => setBriefingConstraints(e.target.value)}
            placeholder={t("setup.briefing.constraintsPlaceholder")}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y bg-white"
          />
        </div>

        {/* Reference materials — optional briefing sources (URL or PDF) */}
        <BriefingSourcesField />
      </div>

      {/* Content Type selector — content mode only */}
      {isContentMode && (
        <ContentTypeSelector
          selectedTypeId={selectedContentType}
          onSelect={setSelectedContentType}
        />
      )}

      {/* Content-specific inputs (SEO keyword, landing page URL, etc.) are
          intentionally NOT shown here — they live exclusively in the Content
          Canvas per the design principle: Setup = universal campaign info only,
          Canvas = content-specific parameters. */}

      {/* Campaign Type — 3-column cards (campaign mode only) */}
      {!isContentMode && <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="text-red-500 mr-0.5">*</span>
          {t("setup.campaignTypeLabel")}
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          {t("setup.campaignTypeHelp")}
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {CAMPAIGN_TYPES.map(({ id, label, description: desc, icon, creativeApproach }) => {
            const isRecommended = campaignGoalType ? getRecommendedCampaignType(campaignGoalType) === id : false;
            return (
              <SelectionCard
                key={id}
                icon={icon}
                title={t(`campaigns-setup:campaignTypes.${id}`, { defaultValue: label })}
                subtitle={t(`campaigns-setup:campaignTypes.${id}Desc`, { defaultValue: desc })}
                selected={campaignType === id}
                onSelect={() => setCampaignType(id)}
                badges={
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                      {t(`campaigns-setup:campaignTypes.${id}Approach`, { defaultValue: creativeApproach })}
                    </span>
                    {isRecommended && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                        {t("setup.recommended")}
                      </span>
                    )}
                  </span>
                }
              />
            );
          })}
        </div>
      </div>}

      {/* Strategic Intent — 3-column cards */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t("setup.strategicIntentLabel")}
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          {t("setup.strategicIntentHelp")}
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {STRATEGIC_INTENTS.map(({ type, ratio, icon }) => (
            <SelectionCard
              key={type}
              icon={icon}
              title={t(`setup.intent.${type}.title`)}
              subtitle={t(`setup.intent.${type}.subtitle`)}
              selected={strategicIntent === type}
              onSelect={() => setStrategicIntent(type)}
              badges={
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {t("setup.brandActivationRatio", { ratio })}
                </span>
              }
            />
          ))}
        </div>
      </div>

      {/* Campaign Goal — 3-column category grid (campaign mode only) */}
      {!isContentMode && <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="text-red-500 mr-0.5">*</span>
          {t("setup.campaignGoalLabel")}
        </label>
        <div className="space-y-5">
          {GOAL_CATEGORIES.map((category) => (
            <div key={category.key}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t(`campaigns-setup:categories.${category.key}`, { defaultValue: category.label })}
              </h4>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {category.types.map(({ id, label, description: desc, icon }) => (
                  <SelectionCard
                    key={id}
                    icon={icon}
                    title={t(`campaigns-setup:goals.${id}`, { defaultValue: label })}
                    subtitle={t(`campaigns-setup:goals.${id}Desc`, { defaultValue: desc })}
                    selected={campaignGoalType === id}
                    onSelect={() => setCampaignGoalType(id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* Pipeline Configuration (sliders + presets) */}
      <PipelineConfigCard />

      {/* Skip Creative Concept toggle — available in both campaign and content mode.
          Useful for SEO / informative long-form types where creative pipeline is overkill. */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={skipConceptStep}
            onChange={(e) => setSkipConceptStep(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">{t("setup.skipConcept.label")}</span>
            <p className="text-xs text-gray-500 mt-0.5">
              {isContentMode
                ? t("setup.skipConcept.contentHelp")
                : t("setup.skipConcept.campaignHelp")}
            </p>
          </div>
        </label>
      </div>

      {/* Date fields — campaign mode only, hidden for content mode */}
      {(() => {
        if (isContentMode) return null;
        const tb = campaignGoalType ? getTimeBinding(campaignGoalType) : 'hybrid';
        if (tb === 'always-on') return null;
        const dateLabel = tb === 'time-bound' ? t("setup.dateRequired") : t("setup.dateOptional");
        return (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("setup.startDateLabel")} <span className="text-xs text-gray-400 font-normal">{dateLabel}</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("setup.endDateLabel")} <span className="text-xs text-gray-400 font-normal">{dateLabel}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default SetupStep;

// ─── Content Type Selector (content mode) ──────────────────

import { useState } from "react";

function ContentTypeSelector({
  selectedTypeId,
  onSelect,
}: {
  selectedTypeId: string | null;
  onSelect: (typeId: string) => void;
}) {
  const { t } = useTranslation("campaigns-wizard");
  const [activeCategory, setActiveCategory] = useState<string>(DELIVERABLE_CATEGORIES[0]);

  const types = getDeliverablesByCategory(activeCategory);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        <span className="text-red-500 mr-0.5">*</span>
        {t("setup.contentTypeLabel")}
      </label>
      <p className="text-xs text-muted-foreground mb-3">
        {t("setup.contentTypeHelp")}
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {DELIVERABLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Type grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type.id)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              selectedTypeId === type.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{type.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{type.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
