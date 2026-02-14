/**
 * Campaign Card - Using Unified StatusCard
 * Campaign cards displayed with consistent design system
 */

import React from 'react';
import { StatusCard } from '../unified/StatusCard';
import { campaignToCardData } from '../../utils/status-card-adapters';

interface CampaignData {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  targetAudience?: string;
  deliverables?: number;
  completedDeliverables?: number;
  description?: string;
  dueDate?: string;
}

interface CampaignCardUnifiedProps {
  campaign: CampaignData;
  onClick?: () => void;
}

export function CampaignCardUnified({ campaign, onClick }: CampaignCardUnifiedProps) {
  const cardData = campaignToCardData(campaign, onClick);

  return <StatusCard data={cardData} />;
}

/**
 * Grid component for multiple campaigns
 */
interface CampaignGridUnifiedProps {
  campaigns: CampaignData[];
  onCampaignClick?: (campaignId: string) => void;
}

export function CampaignGridUnified({ campaigns, onCampaignClick }: CampaignGridUnifiedProps) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No campaigns available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <CampaignCardUnified
          key={campaign.id}
          campaign={campaign}
          onClick={onCampaignClick ? () => onCampaignClick(campaign.id) : undefined}
        />
      ))}
    </div>
  );
}
