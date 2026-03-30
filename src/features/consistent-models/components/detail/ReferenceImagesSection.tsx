"use client";

import { Trash2, GripVertical, Image } from "lucide-react";
import { Card, Badge } from "@/components/shared";
import { ReferenceImageUploader } from "./ReferenceImageUploader";
import { TRAINING_DEFAULTS, MIN_IMAGES_BY_TYPE } from "../../constants/model-constants";
import type { ReferenceImageWithMeta, ConsistentModelType } from "../../types/consistent-model.types";

interface ReferenceImagesSectionProps {
  images: ReferenceImageWithMeta[];
  modelType: ConsistentModelType;
  onUpload: (files: File[]) => void;
  onDelete: (imageId: string) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

/** Reference images grid with upload zone */
export function ReferenceImagesSection({
  images,
  modelType,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}: ReferenceImagesSectionProps) {
  const count = images.length;
  const minRequired = MIN_IMAGES_BY_TYPE[modelType];
  const maxAllowed = TRAINING_DEFAULTS.maxReferenceImages;

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="aspect-square">
                <img
                  src={img.thumbnailUrl ?? img.storageUrl}
                  alt={img.caption ?? img.fileName}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="truncate text-xs text-white">
                  {img.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(img.id)}
                  disabled={isDeleting}
                  className="rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Dimensions badge */}
              {img.width && img.height && (
                <div className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  {img.width}x{img.height}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !isUploading && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-8">
          <Image className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            Upload reference images to train your model
          </p>
        </div>
      )}
    </div>
  );
}
