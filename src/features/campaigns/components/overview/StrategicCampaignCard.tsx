"use client";

import React, { useState } from "react";
import { Database, FileText, Users, CalendarDays } from "lucide-react";
import { ProgressBar } from "@/components/shared";
import { CardLockIndicator } from "@/components/lock";
import { CampaignOverflowMenu } from "./CampaignOverflowMenu";
import { CampaignTypePill } from "../shared/CampaignTypePill";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { deriveCampaignTrafficLight, TRAFFIC_LIGHT } from "../../lib/campaign-readiness";
import type { CampaignSummary } from "@/types/campaign";

interface StrategicCampaignCardProps {
  campaign: CampaignSummary;
  onClick: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function StrategicCampaignCard({ campaign, onClick, onArchive, onDelete }: StrategicCampaignCardProps) {
  const [deleteTarget, setDeleteTarget] = useState(false);
  const progress = campaign.deliverableCount > 0
    ? Math.round((campaign.completedDeliverableCount / campaign.deliverableCount) * 100)
    : 0;

  const { light, label: lightLabel } = deriveCampaignTrafficLight(campaign);
  const tl = TRAFFIC_LIGHT[light];

  return (
    <>
    {deleteTarget && (
      <DeleteConfirmModal
        title={campaign.title}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(false)}
      />
    )}
    <div
      data-testid={`campaign-card-${campaign.id}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="rounded-lg border hover:shadow-md transition-all cursor-pointer group flex overflow-hidden"
      style={{ backgroundColor: tl.bg, borderColor: tl.border }}
    >
      {/* Traffic light stripe */}
      <div
        className="w-1.5 flex-shrink-0"
        style={{ backgroundColor: tl.stripe }}
        aria-label={lightLabel}
      />

      <div className="flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CampaignTypePill type={campaign.type} confidence={campaign.confidence} />
            {/* Traffic light readiness pill */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: `${tl.stripe}18`, color: tl.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tl.dot }} />
              {lightLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CardLockIndicator isLocked={campaign.isLocked} />
            <CampaignOverflowMenu
              onArchive={onArchive}
              onDelete={() => { setDeleteTarget(true); }}
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-700 transition-colors">
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
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {campaign.startDate && (
              <span className="flex items-center gap-1 text-teal-600">
                <CalendarDays className="w-3 h-3" />
                {formatDate(campaign.startDate)}
                {campaign.endDate && ` — ${formatDate(campaign.endDate)}`}
              </span>
            )}
            <span>Updated {new Date(campaign.updatedAt).toLocaleDateString()}</span>
          </div>
          <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View Campaign →
          </span>
        </div>
      </div>
    </div>
    </>
  );
}
