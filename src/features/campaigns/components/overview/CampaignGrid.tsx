"use client";

import React from "react";
import { EmptyState } from "@/components/shared";
import { Megaphone } from "lucide-react";
import { StrategicCampaignCard } from "./StrategicCampaignCard";
import { QuickContentCard } from "./QuickContentCard";
import type { CampaignSummary } from "@/types/campaign";

interface CampaignGridProps {
  campaigns: CampaignSummary[];
  isLoading: boolean;
  onCampaignClick: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
}

export function CampaignGrid({
  campaigns,
  isLoading,
  onCampaignClick,
  onArchive,
  onDelete,
  onConvert,
}: CampaignGridProps) {
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 bg-gray-100 rounded-lg animate-pulse" />
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
    <div data-testid="campaigns-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {safeCampaigns.map((campaign) =>
        campaign.type === "STRATEGIC" ? (
          <StrategicCampaignCard
            key={campaign.id}
            campaign={campaign}
            onClick={() => onCampaignClick(campaign.id)}
            onArchive={() => onArchive(campaign.id)}
            onDelete={() => onDelete(campaign.id)}
          />
        ) : (
          <QuickContentCard
            key={campaign.id}
            campaign={campaign}
            onClick={() => onCampaignClick(campaign.id)}
            onConvert={() => onConvert(campaign.id)}
            onDelete={() => onDelete(campaign.id)}
          />
        )
      )}
    </div>
  );
}
