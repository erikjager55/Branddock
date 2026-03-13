"use client";

import { Megaphone, Target, PenTool, Users, TrendingUp, Zap, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/shared";
import { SelectionCard } from "@/components/ui/layout";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { CampaignGoalType, StrategicIntent } from "../../types/campaign-wizard.types";

// ─── Goal Type Cards ──────────────────────────────────────

const GOAL_TYPES: {
  type: CampaignGoalType;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    type: "BRAND",
    label: "Brand Awareness",
    description: "Increase visibility and recognition of your brand",
    icon: Megaphone,
  },
  {
    type: "PRODUCT",
    label: "Product Launch",
    description: "Promote a new product or service to your audience",
    icon: Target,
  },
  {
    type: "CONTENT",
    label: "Content Marketing",
    description: "Create valuable content to attract and retain customers",
    icon: PenTool,
  },
  {
    type: "ENGAGEMENT",
    label: "Audience Engagement",
    description: "Build deeper connections with your target audience",
    icon: Users,
  },
];

// ─── Strategic Intent Cards ──────────────────────────────

const STRATEGIC_INTENTS: {
  type: StrategicIntent;
  label: string;
  ratio: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    type: "brand_building",
    label: "Brand Building",
    ratio: "60/40",
    description: "Build long-term brand equity and awareness",
    icon: TrendingUp,
  },
  {
    type: "sales_activation",
    label: "Sales Activation",
    ratio: "40/60",
    description: "Drive short-term conversions and leads",
    icon: Zap,
  },
  {
    type: "hybrid",
    label: "Hybrid",
    ratio: "50/50",
    description: "Balance brand building with direct response",
    icon: Scale,
  },
];

// ─── Component ────────────────────────────────────────────

export function SetupStep() {
  const name = useCampaignWizardStore((s) => s.name);
  const setName = useCampaignWizardStore((s) => s.setName);
  const description = useCampaignWizardStore((s) => s.description);
  const setDescription = useCampaignWizardStore((s) => s.setDescription);
  const campaignGoalType = useCampaignWizardStore((s) => s.campaignGoalType);
  const setCampaignGoalType = useCampaignWizardStore(
    (s) => s.setCampaignGoalType,
  );
  const strategicIntent = useCampaignWizardStore((s) => s.strategicIntent);
  const setStrategicIntent = useCampaignWizardStore((s) => s.setStrategicIntent);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const setStartDate = useCampaignWizardStore((s) => s.setStartDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const setEndDate = useCampaignWizardStore((s) => s.setEndDate);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Campaign name */}
      <Input
        label="Campaign Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Q2 Brand Awareness Campaign"
        required
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the purpose and goals of this campaign..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>

      {/* Goal type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="text-red-500 mr-0.5">*</span>
          Campaign Goal
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GOAL_TYPES.map(({ type, label, description: desc, icon }) => (
            <SelectionCard
              key={type}
              icon={icon}
              title={label}
              subtitle={desc}
              selected={campaignGoalType === type}
              onSelect={() => setCampaignGoalType(type)}
            />
          ))}
        </div>
      </div>

      {/* Strategic Intent */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Strategic Intent
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          How should the campaign balance long-term brand building vs. short-term activation? (Binet & Field IPA data)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STRATEGIC_INTENTS.map(({ type, label, ratio, description: desc, icon }) => (
            <SelectionCard
              key={type}
              icon={icon}
              title={label}
              subtitle={desc}
              selected={strategicIntent === type}
              onSelect={() => setStrategicIntent(type)}
              badges={
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {ratio} brand/activation
                </span>
              }
            />
          ))}
        </div>
      </div>

      {/* Date fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Start Date (optional)
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
            End Date (optional)
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
    </div>
  );
}

export default SetupStep;
