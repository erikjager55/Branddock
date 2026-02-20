"use client";

import React from "react";
import { Zap } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { ContentTypeTabs } from "./ContentTypeTabs";
import { ContentTypeGrid } from "./ContentTypeGrid";
import { PromptTextarea } from "./PromptTextarea";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useCreateQuickContent, usePromptSuggestions } from "../../hooks";
import { getContentTypeById } from "@/lib/campaigns/content-types";

interface QuickContentModalProps {
  onCreated?: (campaignId: string) => void;
}

export function QuickContentModal({ onCreated }: QuickContentModalProps) {
  const {
    isQuickModalOpen,
    closeQuickModal,
    selectedContentCategory,
    selectedContentType,
    quickPrompt,
    setSelectedContentCategory,
    setSelectedContentType,
    setQuickPrompt,
  } = useCampaignStore();

  const createQuick = useCreateQuickContent();
  const { data: suggestionsData } = usePromptSuggestions();

  const canCreate = selectedContentType && quickPrompt.trim().length > 0;

  const handleCreate = () => {
    if (!selectedContentType) return;
    const contentType = getContentTypeById(selectedContentType);
    createQuick.mutate(
      {
        contentType: selectedContentType,
        contentCategory: selectedContentCategory,
        prompt: quickPrompt,
      },
      {
        onSuccess: (data) => {
          closeQuickModal();
          onCreated?.(data.id);
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isQuickModalOpen}
      onClose={closeQuickModal}
      title="Quick Content"
      subtitle="Create content fast with AI"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeQuickModal}>
            Cancel
          </Button>
          <Button
            data-testid="quick-create-button"
            icon={Zap}
            onClick={handleCreate}
            disabled={!canCreate}
            isLoading={createQuick.isPending}
          >
            Create Content
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Content Type Selection */}
        <div>
          <ContentTypeTabs
            activeCategory={selectedContentCategory}
            onChange={setSelectedContentCategory}
          />
          <ContentTypeGrid
            category={selectedContentCategory}
            selectedTypeId={selectedContentType}
            onSelect={setSelectedContentType}
          />
        </div>

        {/* Prompt */}
        <PromptTextarea
          value={quickPrompt}
          onChange={setQuickPrompt}
          suggestions={suggestionsData?.suggestions}
        />
      </div>
    </Modal>
  );
}
