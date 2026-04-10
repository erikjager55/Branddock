"use client";

import { useState, useCallback } from "react";
import { Trash2, Maximize2, ImageOff } from "lucide-react";
import { Card, Badge } from "@/components/shared";
import { ReferenceImageUploader } from "./ReferenceImageUploader";
import { TRAINING_DEFAULTS, MIN_IMAGES_BY_TYPE } from "../../constants/model-constants";
import { useUpdateReferenceCaption } from "../../hooks";
import type { ReferenceImageWithMeta, ConsistentModelType } from "../../types/consistent-model.types";

interface ReferenceImagesSectionProps {
  images: ReferenceImageWithMeta[];
  modelId: string;
  modelType: ConsistentModelType;
  onUpload: (files: File[]) => void;
  onDelete: (imageId: string) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

/** Reference images grid with upload zone and per-image captions */
export function ReferenceImagesSection({
  images,
  modelId,
  modelType,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}: ReferenceImagesSectionProps) {
  const count = images.length;
  const minRequired = MIN_IMAGES_BY_TYPE[modelType];
  const maxAllowed = TRAINING_DEFAULTS.maxReferenceImages;
  const updateCaption = useUpdateReferenceCaption(modelId);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Reference Images
          </h2>
          <Badge variant={count >= minRequired ? "success" : "warning"} size="sm">
            {count} / {maxAllowed}
          </Badge>
        </div>
        {count < minRequired && (
          <span className="text-xs text-amber-600">
            Min {minRequired} images required for training
          </span>
        )}
      </div>

      <ReferenceImageUploader
        onUpload={onUpload}
        isUploading={isUploading}
        currentCount={count}
        maxCount={maxAllowed}
      />

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((img) => (
            <ReferenceImageCard
              key={img.id}
              image={img}
              modelId={modelId}
              onDelete={onDelete}
              onEnlarge={setLightboxUrl}
              isDeleting={isDeleting}
              updateCaption={updateCaption}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
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
            ✕
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

function ReferenceImageCard({
  image,
  modelId,
  onDelete,
  onEnlarge,
  isDeleting,
  updateCaption,
}: {
  image: ReferenceImageWithMeta;
  modelId: string;
  onDelete: (id: string) => void;
  onEnlarge: (url: string) => void;
  isDeleting: boolean;
  updateCaption: ReturnType<typeof useUpdateReferenceCaption>;
}) {
  const [caption, setCaption] = useState(image.caption ?? "");
  const [saved, setSaved] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const handleBlur = useCallback(() => {
    const trimmed = caption.trim();
    if (trimmed === (image.caption ?? "")) return;
    setSaved(false);
    updateCaption.mutate(
      { imageId: image.id, caption: trimmed },
      { onSuccess: () => setSaved(true) },
    );
  }, [caption, image.caption, image.id, updateCaption]);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className="relative">
        <div className="aspect-square bg-gray-100">
          {imageFailed ? (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <ImageOff className="h-8 w-8" />
            </div>
          ) : (
            <img
              src={image.storageUrl}
              alt={image.caption ?? image.fileName}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="truncate text-xs text-white">
            {image.fileName}
          </span>
          <button
            type="button"
            onClick={() => onDelete(image.id)}
            disabled={isDeleting}
            className="rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Enlarge button */}
        <button
          type="button"
          onClick={() => onEnlarge(image.storageUrl)}
          className="absolute left-2 top-2 z-10 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          aria-label="Enlarge image"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Dimensions badge */}
        {image.width && image.height && (
          <div className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
            {image.width}x{image.height}
          </div>
        )}

        {/* AI badge */}
        {image.source === "AI_GENERATED" && (
          <div className="absolute right-1.5 bottom-10 rounded bg-teal-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
            AI
          </div>
        )}
      </div>

      {/* Caption input */}
      <div className="border-t border-gray-200 p-2">
        <textarea
          value={caption}
          onChange={(e) => { setCaption(e.target.value); setSaved(false); }}
          onBlur={handleBlur}
          placeholder="Notes for training (e.g. 'good lighting, correct logo placement')"
          rows={2}
          className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
        />
        {!saved && (
          <span className="text-[10px] text-gray-400">Saving...</span>
        )}
      </div>
    </div>
  );
}
