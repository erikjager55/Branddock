"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { GENERATION_PRESETS, TYPE_CONFIG } from "../../constants/model-constants";
import { GenerationResultCard } from "./GenerationResultCard";
import type {
  ConsistentModelDetail,
  GeneratedImageWithMeta,
} from "../../types/consistent-model.types";
import type { GenerationPreset } from "../../constants/model-constants";

interface GenerateSectionProps {
  model: ConsistentModelDetail;
  generations: GeneratedImageWithMeta[];
  onGenerate: (body: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    seed?: number;
  }) => void;
  isGenerating: boolean;
}

/** Image generation prompt + params + results */
export function GenerateSection({
  model,
  generations,
  onGenerate,
  isGenerating,
}: GenerateSectionProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preset, setPreset] = useState<GenerationPreset>("square");
  const [seed, setSeed] = useState("");

  const triggerWord = model.triggerWord ?? TYPE_CONFIG[model.type].triggerWord;
  const selectedPreset = GENERATION_PRESETS[preset];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      width: selectedPreset.width,
      height: selectedPreset.height,
      seed: seed ? Number(seed) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Generate</h2>

      <Card className="p-5">
        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`e.g. "${triggerWord}" in a professional studio setting`}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Include the trigger word{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5">
                {triggerWord}
              </code>{" "}
              in your prompt for best results
            </p>
          </div>

          {/* Size presets */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Size
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(GENERATION_PRESETS) as [GenerationPreset, typeof GENERATION_PRESETS[GenerationPreset]][]).map(
                ([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      preset === key
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Negative Prompt
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Elements to avoid in the generation..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Seed <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random"
                  className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Generate button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              isLoading={isGenerating}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Generate
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {generations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Generated Images ({generations.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {generations.map((gen) => (
              <GenerationResultCard key={gen.id} generation={gen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
