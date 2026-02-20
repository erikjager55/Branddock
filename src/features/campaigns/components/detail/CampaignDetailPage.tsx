"use client";

import React from "react";
import { ArrowLeft, Megaphone, Zap } from "lucide-react";
import { Badge, Button } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { useCampaignStore } from "../../stores/useCampaignStore";
import {
  useCampaignDetail,
  useKnowledgeAssets,
  useRemoveKnowledgeAsset,
  useStrategy,
  useGenerateCampaignStrategy,
  useDeliverables,
} from "../../hooks";
import { ConfigureInputsTab } from "./ConfigureInputsTab";
import { StrategyResultTab } from "./StrategyResultTab";
import { DeliverablesTab } from "./DeliverablesTab";

interface CampaignDetailPageProps {
  campaignId: string;
  onBack: () => void;
  onOpenInStudio?: (campaignId: string, deliverableId: string) => void;
}

export function CampaignDetailPage({ campaignId, onBack, onOpenInStudio }: CampaignDetailPageProps) {
  const { activeCampaignTab, setActiveCampaignTab } = useCampaignStore();

  const { data: campaign, isLoading: campaignLoading } = useCampaignDetail(campaignId);
  const { data: assets, isLoading: assetsLoading } = useKnowledgeAssets(campaignId);
  const { data: strategy, isLoading: strategyLoading } = useStrategy(campaignId);
  const { data: deliverables } = useDeliverables(campaignId);
  const removeAsset = useRemoveKnowledgeAsset(campaignId);
  const generateStrategy = useGenerateCampaignStrategy(campaignId);

  if (campaignLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div className="py-8">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-8" />
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </PageShell>
    );
  }

  if (!campaign) {
    return (
      <PageShell maxWidth="5xl">
        <div className="py-8 text-center">
          <p className="text-gray-500">Campaign not found.</p>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            Back to Campaigns
          </Button>
        </div>
      </PageShell>
    );
  }

  const isStrategic = campaign.type === "STRATEGIC";

  return (
    <PageShell maxWidth="5xl">
      {/* Header */}
      <div className="bg-white border-b rounded-t-lg -mx-6 px-6 py-6 mb-6">
        <button
          data-testid="campaign-back-link"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isStrategic ? (
                <Badge variant="success">
                  <Megaphone className="h-3 w-3 mr-1" /> Strategic
                </Badge>
              ) : (
                <Badge variant="info" className="bg-purple-100 text-purple-700">
                  <Zap className="h-3 w-3 mr-1" /> Quick
                </Badge>
              )}
              <Badge
                variant={
                  campaign.status === "COMPLETED" ? "success" :
                  campaign.status === "ARCHIVED" ? "warning" : "default"
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <h1 data-testid="campaign-detail-title" className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>

        {/* Tab Navigation (Strategic campaigns only) */}
        {isStrategic && (
          <div className="flex gap-6 mt-6 border-b -mb-px">
            {(["configure", "strategy"] as const).map((tab) => (
              <button
                key={tab}
                data-testid={`campaign-tab-${tab}`}
                onClick={() => setActiveCampaignTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeCampaignTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "configure" ? "Configure Inputs" : "Strategy Result"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {isStrategic ? (
          activeCampaignTab === "configure" ? (
            <ConfigureInputsTab
              assets={assets || []}
              isLoading={assetsLoading}
              onAddAssets={() => alert("Asset selection modal coming in S6.B")}
              onRemoveAsset={(assetId) => removeAsset.mutate(assetId)}
            />
          ) : (
            <div className="space-y-8">
              <StrategyResultTab
                strategy={strategy}
                isLoading={strategyLoading}
                onGenerate={() => generateStrategy.mutate()}
                isGenerating={generateStrategy.isPending}
              />
              <DeliverablesTab
                deliverables={deliverables || campaign.deliverables || []}
                onAddDeliverable={() => alert("Add deliverable coming in S6.B")}
                onOpenInStudio={(did) => onOpenInStudio?.(campaignId, did)}
              />
            </div>
          )
        ) : (
          /* Quick Content shows deliverables directly */
          <DeliverablesTab
            deliverables={deliverables || campaign.deliverables || []}
            onAddDeliverable={() => alert("Add deliverable coming in S6.B")}
            onOpenInStudio={(did) => onOpenInStudio?.(campaignId, did)}
          />
        )}
      </div>
    </PageShell>
  );
}
