"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, ImagePlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/shared";

interface ReferenceImageUploaderProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  currentCount: number;
  maxCount: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// Spiegel van de server-eis in src/lib/storage/image-validator.ts (sharp is
// niet client-safe, dus geen gedeelde import mogelijk).
const MIN_DIMENSION = 512;

/** Drag & drop + file picker for reference image uploads */
export function ReferenceImageUploader({
  onUpload,
  isUploading,
  currentCount,
  maxCount,
}: ReferenceImageUploaderProps) {
  const { t } = useTranslation("consistent-models");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = maxCount - currentCount;

  const validateFiles = useCallback(
    async (files: File[]): Promise<File[]> => {
      setError(null);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(t("uploader.unsupportedFormat", { file: file.name }));
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(t("uploader.tooLarge", { file: file.name }));
          continue;
        }
        // Afmetingen vooraf in de browser lezen: te kleine bestanden kregen
        // anders pas ná de upload een (Engelse) serverweigering — precies de
        // verwarring van 2026-07-20. Vangt en passant corrupte bestanden af.
        try {
          const bitmap = await createImageBitmap(file);
          const { width, height } = bitmap;
          bitmap.close();
          if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            errors.push(t("uploader.tooSmall", { file: file.name, width, height }));
            continue;
          }
        } catch {
          errors.push(t("uploader.unreadable", { file: file.name }));
          continue;
        }
        valid.push(file);
      }

      if (valid.length > remaining) {
        errors.push(t("uploader.onlyMore", { count: remaining }));
        valid.splice(remaining);
      }

      if (errors.length > 0) {
        setError(errors.join(". "));
      }

      return valid;
    },
    [remaining, t],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      void (async () => {
        const validated = await validateFiles(Array.from(files));
        if (validated.length > 0) {
          onUpload(validated);
        }
      })();
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
        {t("uploader.maxReached", { count: maxCount })}
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
            <p className="text-sm font-medium text-teal-700">{t("uploader.uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {t("uploader.dropHere")}
            </p>
            <p className="text-xs text-gray-400">
              {t("uploader.formatHint")}
            </p>
            <p className="text-xs text-gray-400">
              {t("uploader.remaining", { count: remaining })}
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
