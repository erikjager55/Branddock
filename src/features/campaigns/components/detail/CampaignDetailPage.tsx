"use client";

import React from "react";
import { ArrowLeft, Megaphone, Zap } from "lucide-react";
import { Badge, Button } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { LockShield, LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useLockVisibility } from "@/hooks/useLockVisibility";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import {
  useCampaignDetail,
  useKnowledgeAssets,
  useRemoveKnowledgeAsset,
  useStrategy,
  useGenerateCampaignStrategy,
  useDeliverables,
  useAddDeliverable,
} from "../../hooks";
import { ConfigureInputsTab } from "./ConfigureInputsTab";
import { StrategyResultTab } from "./StrategyResultTab";
import { DeliverablesTab } from "./DeliverablesTab";
import type { BlueprintStrategyResponse } from "@/types/campaign";
import type { CampaignBlueprint } from "@/lib/campaigns/strategy-blueprint.types";

interface CampaignDetailPageProps {
  campaignId: string;
  onBack: () => void;
  onOpenInStudio?: (campaignId: string, deliverableId: string) => void;
}

export function CampaignDetailPage({ campaignId, onBack, onOpenInStudio }: CampaignDetailPageProps) {
  const { activeCampaignTab, setActiveCampaignTab } = useCampaignStore();

  const { data: campaign, isLoading: campaignLoading } = useCampaignDetail(campaignId);

  const lock = useLockState({
    entityType: 'campaigns',
    entityId: campaignId,
    entityName: campaign?.title ?? 'Campaign',
    initialState: {
      isLocked: campaign?.isLocked ?? false,
      lockedAt: campaign?.lockedAt ?? null,
      lockedBy: campaign?.lockedBy ?? null,
    },
  });
  const visibility = useLockVisibility(lock.isLocked);
  const { data: assets, isLoading: assetsLoading } = useKnowledgeAssets(campaignId);
  const { data: strategy, isLoading: strategyLoading } = useStrategy(campaignId);
  const { data: deliverables } = useDeliverables(campaignId);
  const removeAsset = useRemoveKnowledgeAsset(campaignId);
  const generateStrategy = useGenerateCampaignStrategy(campaignId);
  const addDeliverable = useAddDeliverable(campaignId);

  /** Warm handover: set campaign context in Content Studio store before navigation */
  const handleOpenInStudio = (cId: string, did: string) => {
    // Extract blueprint if strategy is in blueprint format
    let blueprint: CampaignBlueprint | null = null;
    if (strategy && 'format' in strategy && strategy.format === 'blueprint') {
      blueprint = (strategy as BlueprintStrategyResponse).blueprint;
    }

    // Find matching deliverable brief from asset plan
    const deliverableBrief = blueprint?.assetPlan?.deliverables?.find(
      (d) => d.title === deliverables?.find((del) => del.id === did)?.title
    )?.brief ?? null;

    useContentStudioStore.getState().setCampaignContext({
      campaignId: cId,
      campaignName: campaign?.title ?? '',
      campaignGoalType: campaign?.campaignGoalType ?? null,
      campaignKnowledgeAssetIds: (assets ?? []).map((a) => a.id),
      campaignBlueprint: blueprint,
      deliverableBrief,
    });

    onOpenInStudio?.(cId, did);
  };

  /** "Bring to Life" from AssetPlanSection: create deliverable → set context → navigate to studio */
  const [bringToLifeError, setBringToLifeError] = React.useState<string | null>(null);
  const handleBringToLife = async (deliverableTitle: string, contentType: string) => {
    setBringToLifeError(null);
    try {
      const result = await addDeliverable.mutateAsync({ title: deliverableTitle, contentType });
      if (result?.id) {
        // Pass deliverableTitle directly for brief matching — avoids stale deliverables cache
        // since the newly created deliverable may not yet be in the TanStack cache
        let bpBlueprint: CampaignBlueprint | null = null;
        if (strategy && 'format' in strategy && strategy.format === 'blueprint') {
          bpBlueprint = (strategy as BlueprintStrategyResponse).blueprint;
        }

        const matchedBrief = bpBlueprint?.assetPlan?.deliverables?.find(
          (d) => d.title === deliverableTitle
        )?.brief ?? null;

        useContentStudioStore.getState().setCampaignContext({
          campaignId,
          campaignName: campaign?.title ?? '',
          campaignGoalType: campaign?.campaignGoalType ?? null,
          campaignKnowledgeAssetIds: (assets ?? []).map((a) => a.id),
          campaignBlueprint: bpBlueprint,
          deliverableBrief: matchedBrief,
        });

        onOpenInStudio?.(campaignId, result.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create deliverable";
      console.error("[handleBringToLife]", message);
      setBringToLifeError(message);
    }
  };

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
          <div className="flex items-center gap-2">
            <LockShield
              isLocked={lock.isLocked}
              isToggling={lock.isToggling}
              onClick={lock.requestToggle}
            />
            <LockStatusPill
              isLocked={lock.isLocked}
              lockedAt={lock.lockedAt}
              lockedBy={lock.lockedBy}
            />
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

      {/* Lock Banner */}
      <LockBanner isLocked={lock.isLocked} onUnlock={lock.requestToggle} />

      {/* Content */}
      <LockOverlay isLocked={lock.isLocked}>
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
                {bringToLifeError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {bringToLifeError}
                  </div>
                )}
                {visibility.showAITools && (
                  <StrategyResultTab
                    strategy={strategy}
                    campaignId={campaignId}
                    isLoading={strategyLoading}
                    onGenerate={() => generateStrategy.mutate()}
                    isGenerating={generateStrategy.isPending}
                    onBringToLife={onOpenInStudio ? handleBringToLife : undefined}
                  />
                )}
                <DeliverablesTab
                  deliverables={deliverables || campaign.deliverables || []}
                  onAddDeliverable={() => alert("Add deliverable coming in S6.B")}
                  onOpenInStudio={visibility.showAITools ? (did) => handleOpenInStudio(campaignId, did) : undefined}
                />
              </div>
            )
          ) : (
            /* Quick Content shows deliverables directly */
            <DeliverablesTab
              deliverables={deliverables || campaign.deliverables || []}
              onAddDeliverable={() => alert("Add deliverable coming in S6.B")}
              onOpenInStudio={visibility.showAITools ? (did) => handleOpenInStudio(campaignId, did) : undefined}
            />
          )}
        </div>
      </LockOverlay>

      {/* Lock Confirm Dialog */}
      <LockConfirmDialog
        isOpen={lock.showConfirm}
        isLocking={!lock.isLocked}
        entityName={campaign.title}
        onConfirm={lock.confirmToggle}
        onCancel={lock.cancelToggle}
      />
    </PageShell>
  );
}
