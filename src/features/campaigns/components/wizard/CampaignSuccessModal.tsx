"use client";

import React from "react";
import { CheckCircle2, Eye, PenTool, ArrowLeft } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { useCampaignStore } from "../../stores/useCampaignStore";

// ─── Types ────────────────────────────────────────────────

interface CampaignSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  deliverableCount: number;
  onNavigate: (section: string) => void;
}

// ─── Component ────────────────────────────────────────────

export function CampaignSuccessModal({
  isOpen,
  onClose,
  campaignId,
  deliverableCount,
  onNavigate,
}: CampaignSuccessModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Campaign Launched!"
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center py-4 space-y-5">
        {/* Success icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        {/* Heading */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Campaign Launched!
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Your campaign has been created successfully.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-2xl font-bold text-emerald-600">
            {deliverableCount}
          </span>
          <span className="text-sm text-gray-600 ml-1">
            {deliverableCount === 1
              ? "deliverable created"
              : "deliverables created"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            variant="cta"
            fullWidth
            icon={Eye}
            onClick={() => {
              onClose();
              useCampaignStore.getState().setSelectedCampaignId(campaignId);
              onNavigate("campaign-detail");
            }}
          >
            View Campaign
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={PenTool}
            onClick={() => {
              onClose();
              useCampaignStore.getState().setSelectedCampaignId(campaignId);
              onNavigate("campaign-detail");
            }}
          >
            Create First Content
          </Button>
          <Button
            variant="ghost"
            fullWidth
            icon={ArrowLeft}
            onClick={() => {
              onClose();
              onNavigate("active-campaigns");
            }}
          >
            Back to Campaigns
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default CampaignSuccessModal;
