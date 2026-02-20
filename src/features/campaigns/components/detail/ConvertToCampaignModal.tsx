"use client";

import React from "react";
import { CheckCircle, Sparkles } from "lucide-react";
import { Modal, Button, Input } from "@/components/shared";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useConvertToCampaign } from "../../hooks";

interface ConvertToCampaignModalProps {
  campaignId: string;
  onConverted?: (campaignId: string) => void;
}

const BENEFITS = [
  "AI-powered campaign strategy",
  "Knowledge context integration",
  "Team collaboration & assignments",
  "Multi-deliverable management",
];

export function ConvertToCampaignModal({ campaignId, onConverted }: ConvertToCampaignModalProps) {
  const {
    isConvertModalOpen,
    closeConvertModal,
    convertCampaignName,
    setConvertCampaignName,
  } = useCampaignStore();

  const convert = useConvertToCampaign();

  const handleConvert = () => {
    if (!convertCampaignName.trim()) return;
    convert.mutate(
      { id: campaignId, body: { campaignName: convertCampaignName } },
      {
        onSuccess: (data) => {
          closeConvertModal();
          onConverted?.(data.id);
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isConvertModalOpen}
      onClose={closeConvertModal}
      title="Convert to Strategic Campaign"
      subtitle="Unlock the full power of Branddock campaigns"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeConvertModal}>
            Cancel
          </Button>
          <Button
            icon={Sparkles}
            onClick={handleConvert}
            disabled={!convertCampaignName.trim()}
            isLoading={convert.isPending}
          >
            Convert
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Benefits */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">What you'll get:</p>
          {BENEFITS.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Campaign Name */}
        <Input
          label="Campaign Name"
          value={convertCampaignName}
          onChange={(e) => setConvertCampaignName(e.target.value)}
          placeholder="Enter campaign name..."
        />
      </div>
    </Modal>
  );
}
