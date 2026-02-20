"use client";

import React from "react";
import { EmptyState, Badge, ProgressBar } from "@/components/shared";
import { Megaphone, Zap } from "lucide-react";
import { CampaignOverflowMenu } from "./CampaignOverflowMenu";
import type { CampaignSummary } from "@/types/campaign";

interface CampaignListProps {
  campaigns: CampaignSummary[];
  isLoading: boolean;
  onCampaignClick: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
}

export function CampaignList({
  campaigns,
  isLoading,
  onCampaignClick,
  onArchive,
  onDelete,
  onConvert,
}: CampaignListProps) {
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (safeCampaigns.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="No campaigns found"
        description="Create your first campaign or quick content to get started."
      />
    );
  }

  return (
    <div className="bg-white rounded-lg border divide-y">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="col-span-4">Campaign</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Progress</div>
        <div className="col-span-1">Content</div>
        <div className="col-span-1" />
      </div>

      {/* Rows */}
      {safeCampaigns.map((campaign) => {
        const progress = campaign.deliverableCount > 0
          ? Math.round((campaign.completedDeliverableCount / campaign.deliverableCount) * 100)
          : 0;

        return (
          <div
            key={campaign.id}
            onClick={() => onCampaignClick(campaign.id)}
            className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="col-span-4">
              <p className="text-sm font-medium text-gray-900 truncate">{campaign.title}</p>
              {campaign.description && (
                <p className="text-xs text-gray-500 truncate">{campaign.description}</p>
              )}
            </div>
            <div className="col-span-2">
              {campaign.type === "STRATEGIC" ? (
                <Badge variant="success">Strategic</Badge>
              ) : (
                <Badge variant="info" className="bg-purple-100 text-purple-700">
                  <Zap className="h-3 w-3 mr-1" /> Quick
                </Badge>
              )}
            </div>
            <div className="col-span-2">
              <Badge
                variant={
                  campaign.status === "COMPLETED" ? "success" :
                  campaign.status === "ACTIVE" ? "default" : "warning"
                }
              >
                {campaign.status === "ACTIVE" ? "Active" : campaign.status === "COMPLETED" ? "Completed" : "Archived"}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar value={progress} color="emerald" size="sm" />
                </div>
                <span className="text-xs text-gray-500 w-8">{progress}%</span>
              </div>
            </div>
            <div className="col-span-1">
              <span className="text-sm text-gray-700">{campaign.deliverableCount}</span>
            </div>
            <div className="col-span-1 flex justify-end">
              <CampaignOverflowMenu
                onArchive={() => onArchive(campaign.id)}
                onDelete={() => onDelete(campaign.id)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
