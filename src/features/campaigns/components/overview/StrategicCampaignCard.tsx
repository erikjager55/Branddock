"use client";

import React from "react";
import { Megaphone, Database, FileText, Users } from "lucide-react";
import { Badge, ProgressBar } from "@/components/shared";
import { CardLockIndicator } from "@/components/lock";
import { CampaignOverflowMenu } from "./CampaignOverflowMenu";
import type { CampaignSummary } from "@/types/campaign";

interface StrategicCampaignCardProps {
  campaign: CampaignSummary;
  onClick: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function StrategicCampaignCard({ campaign, onClick, onArchive, onDelete }: StrategicCampaignCardProps) {
  const progress = campaign.deliverableCount > 0
    ? Math.round((campaign.completedDeliverableCount / campaign.deliverableCount) * 100)
    : 0;

  return (
    <div
      data-testid={`campaign-card-${campaign.id}`}
      onClick={onClick}
      className="bg-white rounded-lg border p-5 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="success">Strategic</Badge>
          {campaign.confidence != null && (
            <span className="text-xs font-medium text-gray-500">
              {Math.round(campaign.confidence)}% confidence
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <CardLockIndicator isLocked={campaign.isLocked} />
          <CampaignOverflowMenu onArchive={onArchive} onDelete={onDelete} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-teal-700 transition-colors">
        {campaign.title}
      </h3>
      {campaign.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{campaign.description}</p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5" />
          {campaign.knowledgeAssetCount} assets
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {campaign.deliverableCount} deliverables
        </span>
        {campaign.teamMemberCount > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {campaign.teamMemberCount}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar value={progress} color="emerald" size="sm" />
        </div>
        <span className="text-xs font-medium text-gray-500 w-8 text-right">{progress}%</span>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Updated {new Date(campaign.updatedAt).toLocaleDateString()}
        </span>
        <span className="text-xs font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View Campaign →
        </span>
      </div>
    </div>
  );
}
