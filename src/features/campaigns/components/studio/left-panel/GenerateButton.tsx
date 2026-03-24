"use client";

import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { useGenerateContent, useCostEstimate } from "../../../hooks/studio.hooks";
import type { ContentTab } from "@/types/studio";
import { STUDIO } from "@/lib/constants/design-tokens";

interface GenerateButtonProps {
  deliverableId: string;
  activeTab: ContentTab;
}

const TAB_LABELS: Record<ContentTab, string> = {
  text: "Text",
  images: "Images",
  video: "Video",
  carousel: "Carousel",
};

export function GenerateButton({ deliverableId, activeTab }: GenerateButtonProps) {
  const { prompt, aiModel, settings, isGenerating, setIsGenerating, setTextContent, setImageUrls, setVideoUrl, setSlides, setIsDirty, selectedPersonaIds, campaignKnowledgeAssetIds } = useContentStudioStore();
  const generate = useGenerateContent(deliverableId);
  const { data: costData } = useCostEstimate(deliverableId);

  const handleGenerate = () => {
    if (!prompt.trim() || !settings) return;
    setIsGenerating(true);
    generate.mutate(
      { model: aiModel, prompt, settings, knowledgeAssetIds: campaignKnowledgeAssetIds, personaIds: selectedPersonaIds },
      {
        onSuccess: (data) => {
          if (activeTab === "text" && data.generatedText) {
            setTextContent(data.generatedText);
          } else if (activeTab === "images" && data.generatedImageUrls) {
            setImageUrls(data.generatedImageUrls);
          } else if (activeTab === "video" && data.generatedVideoUrl !== undefined) {
            setVideoUrl(data.generatedVideoUrl);
          } else if (activeTab === "carousel" && data.generatedSlides) {
            setSlides(data.generatedSlides);
          }
          setIsDirty(true);
          setIsGenerating(false);
        },
        onError: () => {
          setIsGenerating(false);
        },
      }
    );
  };

  const isDisabled = !prompt.trim() || isGenerating;

  return (
    <button
      onClick={handleGenerate}
      disabled={isDisabled}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isDisabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : `${STUDIO.generateButton} text-white shadow-sm`
      }`}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {isGenerating ? "Generating..." : `Generate ${TAB_LABELS[activeTab]}`}
      {costData && !isGenerating && (
        <span className="text-xs opacity-75">
          ~${costData.estimatedCost.toFixed(2)}
        </span>
      )}
    </button>
  );
}
