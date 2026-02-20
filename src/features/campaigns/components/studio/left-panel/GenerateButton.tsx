"use client";

import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { useGenerateContent, useCostEstimate } from "../../../hooks/studio.hooks";
import type { ContentTab } from "@/types/studio";

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
  const { prompt, aiModel, settings, isGenerating, setIsGenerating, setTextContent, setImageUrls, setVideoUrl, setSlides, setIsDirty } = useContentStudioStore();
  const generate = useGenerateContent(deliverableId);
  const { data: costData } = useCostEstimate(deliverableId);

  const handleGenerate = () => {
    if (!prompt.trim() || !settings) return;
    setIsGenerating(true);
    generate.mutate(
      { model: aiModel, prompt, settings, knowledgeAssetIds: [] },
      {
        onSuccess: (data) => {
          // The API returns content as a string, but we set it based on active tab
          if (activeTab === "text") {
            setTextContent(data.content);
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
          : "bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-sm"
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
