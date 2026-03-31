"use client";

import { Select } from "@/components/shared";
import { ILLUSTRATION_STYLE_OPTIONS } from "../../constants/model-constants";
import type { ConsistentModelDetail, UpdateModelBody, IllustrationStyleParams } from "../../types/consistent-model.types";
import type { UseMutationResult } from "@tanstack/react-query";

interface IllustrationStyleSectionProps {
  model: ConsistentModelDetail;
  updateModel: UseMutationResult<ConsistentModelDetail, Error, UpdateModelBody>;
}

/** Illustration-specific style form for step 1 of the ILLUSTRATION wizard */
export function IllustrationStyleSection({
  model,
  updateModel,
}: IllustrationStyleSectionProps) {
  const params = (model.generationParams as IllustrationStyleParams) ?? {};

  const handleParamChange = (field: keyof IllustrationStyleParams, value: string | null) => {
    const updatedParams: IllustrationStyleParams = { ...params, [field]: value };
    updateModel.mutate({ generationParams: updatedParams });
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Illustration Style</h3>

      {/* 2x2 grid: style selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Illustration Style"
          options={[...ILLUSTRATION_STYLE_OPTIONS.illustrationStyle]}
          value={params.illustrationStyle ?? null}
          onChange={(val) => handleParamChange("illustrationStyle", val)}
          placeholder="Select style..."
          allowClear
        />
        <Select
          label="Color Approach"
          options={[...ILLUSTRATION_STYLE_OPTIONS.colorApproach]}
          value={params.colorApproach ?? null}
          onChange={(val) => handleParamChange("colorApproach", val)}
          placeholder="Select color approach..."
          allowClear
        />
        <Select
          label="Line Quality"
          options={[...ILLUSTRATION_STYLE_OPTIONS.lineQuality]}
          value={params.lineQuality ?? null}
          onChange={(val) => handleParamChange("lineQuality", val)}
          placeholder="Select line quality..."
          allowClear
        />
        <Select
          label="Detail Level"
          options={[...ILLUSTRATION_STYLE_OPTIONS.detailLevel]}
          value={params.detailLevel ?? null}
          onChange={(val) => handleParamChange("detailLevel", val)}
          placeholder="Select detail level..."
          allowClear
        />
      </div>

      {/* Mood / Atmosphere */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Mood / Atmosphere
        </label>
        <input
          type="text"
          value={params.mood ?? ""}
          onChange={(e) => handleParamChange("mood", e.target.value || null)}
          placeholder="e.g. Playful, Corporate, Dreamy, Bold..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Style Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Style Description
        </label>
        <textarea
          value={model.modelDescription ?? ""}
          onChange={(e) => updateModel.mutate({ modelDescription: e.target.value })}
          placeholder="Describe this illustration style..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Style Prompt */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Style Prompt
        </label>
        <textarea
          value={model.stylePrompt ?? ""}
          onChange={(e) => updateModel.mutate({ stylePrompt: e.target.value })}
          placeholder="Style prompt for generation..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Negative Prompt
        </label>
        <textarea
          value={model.negativePrompt ?? ""}
          onChange={(e) => updateModel.mutate({ negativePrompt: e.target.value })}
          placeholder="What to avoid..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}
