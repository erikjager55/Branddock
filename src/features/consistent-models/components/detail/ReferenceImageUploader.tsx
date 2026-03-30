"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImagePlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/shared";
import { TRAINING_DEFAULTS } from "../../constants/model-constants";

interface ReferenceImageUploaderProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  currentCount: number;
  maxCount: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** Drag & drop + file picker for reference image uploads */
export function ReferenceImageUploader({
  onUpload,
  isUploading,
  currentCount,
  maxCount,
}: ReferenceImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = maxCount - currentCount;

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      setError(null);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: unsupported format (use JPEG, PNG, or WebP)`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: exceeds 10MB limit`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length > remaining) {
        errors.push(
          `Only ${remaining} more image${remaining !== 1 ? "s" : ""} can be added`,
        );
        valid.splice(remaining);
      }

      if (errors.length > 0) {
        setError(errors.join(". "));
      }

      return valid;
    },
    [remaining],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const validated = validateFiles(Array.from(files));
      if (validated.length > 0) {
        onUpload(validated);
      }
    },
    [validateFiles, onUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  if (remaining <= 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
        Maximum of {maxCount} reference images reached
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-teal-400 bg-teal-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 animate-bounce text-teal-500" />
            <p className="text-sm font-medium text-teal-700">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Drop images here or click to browse
            </p>
            <p className="text-xs text-gray-400">
              JPEG, PNG, or WebP. Min 512x512px. Max 10MB each.
            </p>
            <p className="text-xs text-gray-400">
              {remaining} more image{remaining !== 1 ? "s" : ""} can be added
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
