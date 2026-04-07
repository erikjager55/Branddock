"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Sparkles,
  Check,
  X,
  Loader2,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Maximize2,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useGenerateReferenceImages, useCurateReferences } from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import { getFalProvidersForType, FAL_PROVIDERS, TYPE_GENERATION_FIELDS, MIN_IMAGES_BY_TYPE } from "../../constants/model-constants";
import { extractBrandTags } from "@/lib/consistent-models/reference-prompt-builder";
import type {
  ConsistentModelDetail,
  ReferenceImageWithMeta,
} from "../../types/consistent-model.types";

interface GenerateReferencesSectionProps {
  model: ConsistentModelDetail;
  modelId: string;
}

/** Step 1 — Generate AI reference images using brand context + type-specific fields via fal.ai */
export function GenerateReferencesSection({
  model,
  modelId,
}: GenerateReferencesSectionProps) {
  const generateRefs = useGenerateReferenceImages(modelId);
  const curateRefs = useCurateReferences(modelId);
  const { nextWizardStep } = useConsistentModelStore();

  // Provider state — filtered by model type
  const typeProviders = useMemo(() => getFalProvidersForType(model.type), [model.type]);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    typeProviders[0]?.id ?? "fal-ai/flux-2-pro",
  );

  // Brand tag state
  const initialTags = useMemo(
    () => extractBrandTags(model.brandContext ?? null),
    [model.brandContext],
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(initialTags),
  );
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Type-specific field state
  const [typeConfig, setTypeConfig] = useState<Record<string, string>>({});

  // Do's & Don'ts
  const [dos, setDos] = useState("");
  const [donts, setDonts] = useState("");

  // Generated image selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [imageCaptions, setImageCaptions] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const allTags = useMemo(
    () => [...initialTags, ...customTags],
    [initialTags, customTags],
  );

  const aiImages = useMemo(
    () => model.referenceImages.filter((img) => img.source === "AI_GENERATED"),
    [model.referenceImages],
  );

  const typeFields = useMemo(
    () =>
      TYPE_GENERATION_FIELDS[
        model.type as keyof typeof TYPE_GENERATION_FIELDS
      ] ?? [],
    [model.type],
  );

  const minImages = MIN_IMAGES_BY_TYPE[model.type] || 5;

  // Generation progress tracking (estimated, ~8s per image)
  const [generatingCount, setGeneratingCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const GENERATE_COUNT = 20;
  const CURATE_TARGET = 10;
  const [targetCount, setTargetCount] = useState(GENERATE_COUNT);
  const estimatedSecondsPerImage = 8;

  useEffect(() => {
    if (generateRefs.isPending) {
      setGeneratingCount(0);
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          setGeneratingCount(Math.min(Math.floor(next / estimatedSecondsPerImage), targetCount - 1));
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (generatingCount > 0) {
        setGeneratingCount(targetCount); // snap to complete
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generateRefs.isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ────────────────────────────────────────────

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!customTags.includes(trimmed) && !initialTags.includes(trimmed)) {
      setCustomTags((prev) => [...prev, trimmed]);
      setSelectedTags((prev) => new Set([...prev, trimmed]));
    }
    setNewTagInput("");
  }, [newTagInput, customTags, initialTags]);

  const handleTypeFieldChange = useCallback((key: string, value: string) => {
    setTypeConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = () => {
    setTargetCount(GENERATE_COUNT);
    setGeneratedThumbnails([]);
    const mergedConfig = {
      ...typeConfig,
      ...(dos.trim() ? { dos: dos.trim() } : {}),
      ...(donts.trim() ? { avoid: donts.trim() } : {}),
    };
    generateRefs.mutate(
      {
        falModel: selectedProvider,
        brandTags: Array.from(selectedTags),
        typeConfig: mergedConfig,
        count: GENERATE_COUNT,
      },
      {
        onSuccess: (data) => {
          const result = data as { generated?: Array<{ thumbnailUrl?: string; storageUrl?: string }> };
          const urls = (result?.generated ?? []).map((g) => g.thumbnailUrl ?? g.storageUrl ?? '').filter(Boolean);
          if (urls.length > 0) {
            setTargetCount(urls.length);
            setGeneratingCount(urls.length);
            setGeneratedThumbnails(urls);
          }
        },
      },
    );
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

  const handleSetCaption = useCallback((id: string, caption: string) => {
    setImageCaptions((prev) => ({ ...prev, [id]: caption }));
  }, []);

  const handleUseSelected = () => {
    const deselectedIds = aiImages
      .filter((img) => !selectedIds.has(img.id))
      .map((img) => img.id);

    curateRefs.mutate(
      {
        selectedIds: Array.from(selectedIds),
        deselectedIds,
        captions: imageCaptions,
      },
      {
        onSuccess: () => {
          nextWizardStep();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Brand Context Tags ────────────────────────────── */}
      <div
        id="generate-section"
        className="rounded-lg border border-gray-200 bg-white p-5"
      >
        <h3 className="text-sm font-semibold text-gray-900">
          Brand Context Tags
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Select the brand keywords to include in the generation prompts.
          Deselect tags you don&apos;t want to influence the output.
        </p>

        {allTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTags.has(tag)
                    ? "bg-teal-100 text-teal-700 border border-teal-300"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-400 italic">
            No brand context available. Reference images will be generated with
            default prompts.
          </p>
        )}

        {/* Add keyword */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add keyword..."
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!newTagInput.trim()}
            className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>

      {/* ─── Type-Specific Fields ──────────────────────────── */}
      {typeFields.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Model Details — {model.type.replace(/_/g, " ")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Provide details to get better reference images for this model type.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {typeFields.map((field) => (
              <div
                key={field.key}
                className={
                  field.type === "textarea" ? "sm:col-span-2" : undefined
                }
              >
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  {field.label}
                </label>
                {field.type === "select" && field.options ? (
                  <select
                    value={typeConfig[field.key] ?? ""}
                    onChange={(e) =>
                      handleTypeFieldChange(field.key, e.target.value)
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={typeConfig[field.key] ?? ""}
                    onChange={(e) =>
                      handleTypeFieldChange(field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    rows={2}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={typeConfig[field.key] ?? ""}
                    onChange={(e) =>
                      handleTypeFieldChange(field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Do's & Don'ts ──────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Style Guidelines
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Describe what the generated images should and should not include.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Do&apos;s
            </label>
            <textarea
              value={dos}
              onChange={(e) => setDos(e.target.value)}
              placeholder="e.g. Natural lighting, warm tones, eye contact with camera, professional attire..."
              rows={3}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <X className="h-3.5 w-3.5 text-red-500" />
              Don&apos;ts
            </label>
            <textarea
              value={donts}
              onChange={(e) => setDonts(e.target.value)}
              placeholder="e.g. No sunglasses, no hats, no busy backgrounds, no text overlays..."
              rows={3}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* ─── fal.ai Provider Selector + Generate ───────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">
          AI Image Provider
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose an AI model to generate reference images.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {typeProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProvider(provider.id)}
              className={`group overflow-hidden rounded-xl border-2 text-left transition-all ${
                selectedProvider === provider.id
                  ? "border-teal-500 ring-2 ring-teal-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Preview image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <img
                  src={`/images/fal-providers/${provider.preview}`}
                  alt={provider.label}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {selectedProvider === provider.id && (
                  <div className="absolute right-2 top-2 rounded-full bg-teal-500 p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {provider.label}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {provider.cost}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {provider.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Generate button / Progress indicator */}
        {generateRefs.isPending ? (
          <div className="mt-8 rounded-lg border border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  Generating reference images...
                </h4>
                <p className="mt-0.5 text-xs text-gray-500">
                  Creating {targetCount} images with AI — this takes about {Math.ceil(targetCount * estimatedSecondsPerImage / 60)} minutes
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-teal-700">
                  {generatingCount}/{targetCount}
                </span>
                <p className="text-[10px] text-gray-400">
                  {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} elapsed
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-teal-100">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-1000 ease-linear"
                style={{ width: `${Math.max(5, (generatingCount / targetCount) * 100)}%` }}
              />
            </div>

            {/* Progress grid */}
            <div className="mt-4 grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {Array.from({ length: targetCount }).map((_, i) => {
                const thumb = generatedThumbnails[i];
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-md overflow-hidden flex items-center justify-center ${
                      i < generatingCount
                        ? "border border-teal-300"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {thumb ? (
                      <img src={thumb} alt={`Generated ${i + 1}`} className="h-full w-full object-cover" />
                    ) : i < generatingCount ? (
                      <Check className="h-4 w-4 text-teal-500" />
                    ) : i === generatingCount ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={handleGenerate}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Generate {targetCount} References
            </Button>
          </div>
        )}

        {generateRefs.isError && (
          <p className="mt-3 text-sm text-red-600">
            {generateRefs.error?.message ??
              "Failed to generate reference images."}
          </p>
        )}
      </div>

      {/* ─── Generated Images Grid ─────────────────────────── */}
      {aiImages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Generated Images
              </h3>
              <Badge variant="info" size="sm">
                {selectedIds.size} / {CURATE_TARGET} selected
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            {aiImages.map((img) => (
              <ImageSelectCard
                key={img.id}
                image={img}
                isSelected={selectedIds.has(img.id)}
                onToggle={() => toggleImage(img.id)}
                caption={imageCaptions[img.id]}
                onCaptionChange={(val) => handleSetCaption(img.id, val)}
                onEnlarge={setLightboxUrl}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Select {CURATE_TARGET} images for training (minimum {minImages})
            </p>
            <Button
              variant="primary"
              onClick={handleUseSelected}
              disabled={selectedIds.size < minImages || curateRefs.isPending}
            >
              {curateRefs.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Use Selected & Continue ({selectedIds.size})
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Lightbox ─────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Enlarged preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
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
  caption?: string;
  onCaptionChange?: (caption: string) => void;
  onEnlarge?: (url: string) => void;
}

function ImageSelectCard({ image, isSelected, onToggle, caption, onCaptionChange, onEnlarge }: ImageSelectCardProps) {
  const providerLabel = useMemo(() => {
    if (!image.aiProvider) return null;
    const provider = FAL_PROVIDERS.find((p) => p.id === image.aiProvider);
    return provider?.label ?? image.aiProvider;
  }, [image.aiProvider]);

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
        isSelected
          ? "border-teal-500 ring-2 ring-teal-200"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="relative w-full overflow-hidden"
      >
        <div className="aspect-square">
          <img
            src={image.storageUrl}
            alt={image.caption ?? image.fileName}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Selection overlay — scoped to image area */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none ${
            isSelected ? "bg-teal-500/20" : "bg-black/0 group-hover:bg-black/10"
          }`}
        >
          {isSelected ? (
            <div className="rounded-full bg-teal-500 p-1.5">
              <Check className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="rounded-full border-2 border-white/80 bg-black/20 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="h-4 w-4 text-white/80" />
            </div>
          )}
        </div>

        {/* Provider badge */}
        {providerLabel && (
          <div className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
            {providerLabel}
          </div>
        )}

      </button>

      {/* Enlarge button */}
      {onEnlarge && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEnlarge(image.storageUrl); }}
          className="absolute left-2 top-2 z-10 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          aria-label="Enlarge image"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}

      {/* Caption input — visible when selected */}
      {isSelected && onCaptionChange && (
        <div className="border-t border-teal-200 bg-teal-50/50 p-2">
          <textarea
            value={caption ?? ""}
            onChange={(e) => onCaptionChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Why this image? (optional)"
            rows={2}
            className="w-full rounded border border-teal-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
          />
        </div>
      )}
    </div>
  );
}
