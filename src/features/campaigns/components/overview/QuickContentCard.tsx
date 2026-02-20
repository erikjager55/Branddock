"use client";

import React from "react";
import { Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/shared";
import { CampaignOverflowMenu } from "./CampaignOverflowMenu";
import { getContentTypeById } from "@/lib/campaigns/content-types";
import type { CampaignSummary } from "@/types/campaign";

interface QuickContentCardProps {
  campaign: CampaignSummary;
  onClick: () => void;
  onConvert: () => void;
  onDelete: () => void;
}

export function QuickContentCard({ campaign, onClick, onConvert, onDelete }: QuickContentCardProps) {
  const contentType = campaign.contentType ? getContentTypeById(campaign.contentType) : null;
  const ContentIcon = contentType?.icon;

  return (
    <div
      data-testid={`quick-card-${campaign.id}`}
      onClick={onClick}
      className="bg-white rounded-lg border p-5 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="info" className="bg-purple-100 text-purple-700">
            <Zap className="h-3 w-3 mr-1" />
            Quick
          </Badge>
          {campaign.status === "COMPLETED" && (
            <Badge variant="success">Done</Badge>
          )}
        </div>
        <CampaignOverflowMenu onDelete={onDelete} />
      </div>

      {/* Title + Content Type */}
      <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">
        {campaign.title}
      </h3>
      {contentType && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          {ContentIcon && <ContentIcon className="h-3.5 w-3.5" />}
          <span>{contentType.name}</span>
          {campaign.contentCategory && (
            <span className="text-gray-300">|</span>
          )}
          {campaign.contentCategory && (
            <span className="capitalize">{campaign.contentCategory}</span>
          )}
        </div>
      )}

      {/* Quality Score */}
      {campaign.qualityScore != null && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Quality</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  campaign.qualityScore >= 8 ? "bg-green-500" :
                  campaign.qualityScore >= 6 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${(campaign.qualityScore / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700">
              {campaign.qualityScore.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); onConvert(); }}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
        >
          Convert to Campaign <ArrowRight className="h-3 w-3" />
        </button>
        <span className="text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </div>
  );
}
