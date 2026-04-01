"use client";

import { useState, useMemo } from "react";
import { Sparkles, Check, X, Loader2, ChevronRight, Info } from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useGenerateReferenceImages, useCurateReferences } from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import type { ConsistentModelDetail, ReferenceImageWithMeta } from "../../types/consistent-model.types";

interface GenerateReferencesSectionProps {
  model: ConsistentModelDetail;
  modelId: string;
}

/** Step 1 — Generate AI reference images using brand context */
export function GenerateReferencesSection({
  model,
  modelId,
}: GenerateReferencesSectionProps) {
  const generateRefs = useGenerateReferenceImages(modelId);
  const curateRefs = useCurateReferences(modelId);
  const { nextWizardStep } = useConsistentModelStore();

  const [provider, setProvider] = useState<"imagen" | "dalle">("imagen");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const aiImages = useMemo(
    () => model.referenceImages.filter((img) => img.source === "AI_GENERATED"),
    [model.referenceImages],
  );

  const handleGenerate = () => {
    generateRefs.mutate({ provider, count: 6 });
  };

  const toggleImage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(aiImages.map((img) => img.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleUseSelected = () => {
    const deselectedIds = aiImages
      .filter((img) => !selectedIds.has(img.id))
      .map((img) => img.id);

    curateRefs.mutate(
      { selectedIds: Array.from(selectedIds), deselectedIds },
      {
        onSuccess: () => {
          nextWizardStep();
        },
      },
    );
  };

  const contextSummary = model.brandContext?.contextSummary;

  return (
    <div className="space-y-6">
      {/* Brand context summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-teal-50 p-2">
            <Info className="h-5 w-5 text-teal-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Brand Context</h3>
            {contextSummary ? (
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {contextSummary}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-400 italic">
                No brand context available. Reference images will be generated with default prompts.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Provider selector + generate button */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Generate Reference Images
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Use AI to generate reference images based on your brand context. This step is optional — you can skip to manual upload.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Provider:</label>
            <div className="flex rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setProvider("imagen")}
                className={`px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                  provider === "imagen"
                    ? "bg-teal-50 text-teal-700 border-r border-gray-200"
                    : "text-gray-500 hover:bg-gray-50 border-r border-gray-200"
                }`}
              >
                Imagen 4
              </button>
              <button
                type="button"
                onClick={() => setProvider("dalle")}
                className={`px-3 py-1.5 text-xs font-medium rounded-r-lg transition-colors ${
                  provider === "dalle"
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                DALL-E 3
              </button>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={generateRefs.isPending}
          >
            {generateRefs.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate References
              </>
            )}
          </Button>
        </div>

        {generateRefs.isError && (
          <p className="mt-3 text-sm text-red-600">
            {generateRefs.error?.message ?? "Failed to generate reference images."}
          </p>
        )}
      </div>

      {/* Generated images grid */}
      {aiImages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Generated Images
              </h3>
              <Badge variant="info" size="sm">
                {selectedIds.size} / {aiImages.length} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {aiImages.map((img) => (
              <ImageSelectCard
                key={img.id}
                image={img}
                isSelected={selectedIds.has(img.id)}
                onToggle={() => toggleImage(img.id)}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={nextWizardStep}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip — go to manual upload
            </button>
            <Button
              variant="primary"
              onClick={handleUseSelected}
              disabled={selectedIds.size === 0 || curateRefs.isPending}
            >
              {curateRefs.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Use Selected & Continue
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Skip link when no images generated yet */}
      {aiImages.length === 0 && !generateRefs.isPending && (
        <div className="text-center">
          <button
            type="button"
            onClick={nextWizardStep}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip this step — go directly to manual upload
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ───────────────────────────────────────────

interface ImageSelectCardProps {
  image: ReferenceImageWithMeta;
  isSelected: boolean;
  onToggle: () => void;
}

function ImageSelectCard({ image, isSelected, onToggle }: ImageSelectCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
        isSelected
          ? "border-teal-500 ring-2 ring-teal-200"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="aspect-square">
        <img
          src={image.thumbnailUrl ?? image.storageUrl}
          alt={image.caption ?? image.fileName}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Selection overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          isSelected ? "bg-teal-500/20" : "bg-black/0 group-hover:bg-black/10"
        }`}
      >
        {isSelected ? (
          <div className="rounded-full bg-teal-500 p-1.5">
            <Check className="h-4 w-4 text-white" />
          </div>
        ) : (
          <div className="rounded-full border-2 border-white/80 bg-black/20 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="h-4 w-4 text-white/80" />
          </div>
        )}
      </div>

      {/* Provider badge */}
      {image.aiProvider && (
        <div className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          {image.aiProvider === "imagen" ? "Imagen" : "DALL-E"}
        </div>
      )}
    </button>
  );
}
