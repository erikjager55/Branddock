"use client";

import React from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { getModelsForTab } from "@/lib/studio/ai-model-config";
import type { ContentTab } from "@/types/studio";

interface AiModelSelectorProps {
  activeTab: ContentTab;
}

export function AiModelSelector({ activeTab }: AiModelSelectorProps) {
  const { aiModel, setAiModel } = useContentStudioStore();
  const models = getModelsForTab(activeTab);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        AI Model
      </label>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => setAiModel(model.id)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              aiModel === model.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title={model.description}
          >
            {model.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {models.find((m) => m.id === aiModel)?.description}
      </p>
    </div>
  );
}
