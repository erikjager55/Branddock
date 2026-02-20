"use client";

import React from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { Badge, Button } from "@/components/shared";
import { useCampaignDetail, useDeliverables, useCoverage } from "../../hooks";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { ConvertBanner } from "./ConvertBanner";
import { ConvertToCampaignModal } from "./ConvertToCampaignModal";
import { DeliverablesTab } from "./DeliverablesTab";
import { getContentTypeById } from "@/lib/campaigns/content-types";

interface QuickContentDetailPageProps {
  campaignId: string;
  onBack: () => void;
  onConverted?: (campaignId: string) => void;
  onOpenInStudio?: (campaignId: string, deliverableId: string) => void;
}

export function QuickContentDetailPage({
  campaignId,
  onBack,
  onConverted,
  onOpenInStudio,
}: QuickContentDetailPageProps) {
  const { openConvertModal } = useCampaignStore();
  const { data: campaign, isLoading } = useCampaignDetail(campaignId);
  const { data: deliverables } = useDeliverables(campaignId);
  const { data: coverage } = useCoverage(campaignId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-8" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-8 text-center">
        <p className="text-gray-500">Campaign not found.</p>
        <Button variant="secondary" onClick={onBack} className="mt-4">Back</Button>
      </div>
    );
  }

  const contentType = campaign.contentType ? getContentTypeById(campaign.contentType) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Campaigns
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" className="bg-purple-100 text-purple-700">
              <Zap className="h-3 w-3 mr-1" /> Quick Content
            </Badge>
            {contentType && (
              <Badge variant="default">{contentType.name}</Badge>
            )}
            {campaign.qualityScore != null && (
              <Badge variant={campaign.qualityScore >= 8 ? "success" : campaign.qualityScore >= 6 ? "warning" : "danger"}>
                {campaign.qualityScore.toFixed(1)} quality
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Convert Banner */}
        <ConvertBanner onConvert={openConvertModal} />

        {/* Research Foundation */}
        {coverage && coverage.totalAssets > 0 && (
          <div className="bg-white rounded-lg border p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Research Foundation</h3>
            <p className="text-xs text-gray-500">
              {coverage.validatedAssets}/{coverage.totalAssets} knowledge assets validated ({coverage.coveragePercent}% coverage)
            </p>
          </div>
        )}

        {/* Deliverable */}
        <DeliverablesTab
          deliverables={deliverables || campaign.deliverables || []}
          onAddDeliverable={() => alert("Quick content has a single deliverable")}
          onOpenInStudio={(did) => onOpenInStudio?.(campaignId, did)}
        />
      </div>

      {/* Convert Modal */}
      <ConvertToCampaignModal campaignId={campaignId} onConverted={onConverted} />
    </div>
  );
}
