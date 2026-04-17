"use client";

import React, { useState } from "react";
import { EmptyState, ProgressBar } from "@/components/shared";
import { CalendarDays, Megaphone } from "lucide-react";
import { CampaignOverflowMenu } from "./CampaignOverflowMenu";
import { CampaignTypePill } from "../shared/CampaignTypePill";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { deriveCampaignTrafficLight, TRAFFIC_LIGHT } from "../../lib/campaign-readiness";
import type { CampaignSummary } from "@/types/campaign";

interface CampaignListProps {
  campaigns: CampaignSummary[];
  isLoading: boolean;
  onCampaignClick: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CampaignList({
  campaigns,
  isLoading,
  onCampaignClick,
  onArchive,
  onDelete,
}: CampaignListProps) {
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

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
    <>
    {deleteTarget && (
      <DeleteConfirmModal
        title={deleteTarget.title}
        onConfirm={() => onDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    )}
    <div className="bg-white rounded-lg border divide-y overflow-hidden">
      {/* Header */}
      <div
        className="gap-4 px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
        style={{
          display: "grid",
          gridTemplateColumns: "6px 1fr 120px 110px 140px 80px 80px 60px",
        }}
      >
        <div />
        <div>Campaign</div>
        <div>Type</div>
        <div>Readiness</div>
        <div>Progress</div>
        <div>Content</div>
        <div>Scheduled</div>
        <div />
      </div>

      {/* Rows */}
      {safeCampaigns.map((campaign) => {
        const progress = campaign.deliverableCount > 0
          ? Math.round((campaign.completedDeliverableCount / campaign.deliverableCount) * 100)
          : 0;
        const { light, label: lightLabel } = deriveCampaignTrafficLight(campaign);
        const tl = TRAFFIC_LIGHT[light];

        return (
          <div
            key={campaign.id}
            role="button"
            tabIndex={0}
            onClick={() => onCampaignClick(campaign.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCampaignClick(campaign.id); } }}
            className="gap-4 px-4 py-3 items-center hover:brightness-95 cursor-pointer transition-all"
            style={{
              display: "grid",
              gridTemplateColumns: "6px 1fr 120px 110px 140px 80px 80px 60px",
              backgroundColor: tl.bg,
            }}
          >
            {/* Traffic light stripe */}
            <div
              className="w-1.5 h-full rounded-full self-stretch"
              style={{ backgroundColor: tl.stripe }}
            />

            {/* Campaign title + description */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{campaign.title}</p>
              {campaign.description && (
                <p className="text-xs text-gray-500 truncate">{campaign.description}</p>
              )}
            </div>

            {/* Type */}
            <div className="overflow-hidden">
              <CampaignTypePill type={campaign.type} confidence={campaign.confidence} />
            </div>

            {/* Readiness (traffic light pill) */}
            <div className="overflow-hidden">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${tl.stripe}18`, color: tl.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tl.dot }} />
                {lightLabel}
              </span>
            </div>

            {/* Progress */}
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar value={progress} color="emerald" size="sm" />
                </div>
                <span className="text-xs text-gray-500 w-8">{progress}%</span>
              </div>
            </div>

            {/* Content count */}
            <div>
              <span className="text-sm text-gray-700">{campaign.deliverableCount}</span>
            </div>

            {/* Scheduled date */}
            <div className="overflow-hidden">
              {campaign.startDate ? (
                <span className="inline-flex items-center gap-1 text-xs text-teal-600">
                  <CalendarDays className="w-3 h-3" />
                  {formatDate(campaign.startDate)}
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <CampaignOverflowMenu
                onArchive={() => onArchive(campaign.id)}
                onDelete={() => setDeleteTarget({ id: campaign.id, title: campaign.title })}
              />
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
