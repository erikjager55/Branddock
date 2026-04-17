'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useUploadMedia } from '@/features/media-library/hooks';
import type { InsertImageTabProps } from './types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * Upload tab for InsertImageModal. Drag-and-drop or click to upload an image
 * file. The file is saved to the Media Library and then selected as the hero
 * image for the deliverable.
 */
export function UploadTab({ onSelected }: InsertImageTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const uploadMedia = useUploadMedia();

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Use JPEG, PNG, GIF, WebP, or SVG.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploadedName(null);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        const name = file.name.replace(/\.[^.]+$/, '');
        const result = await uploadMedia.mutateAsync({
          file,
          body: { name, source: 'UPLOAD' },
        });

        setUploadedName(name);

        onSelected({
          url: result.fileUrl ?? result.thumbnailUrl ?? '',
          mediaAssetId: result.id,
          alt: name,
        });
      } catch {
        setError('Upload failed. Please try again.');
      }
    },
    [validateFile, uploadMedia, onSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile]
  );

  const isUploading = uploadMedia.isPending;

  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center">
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        className={`w-full rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-teal-400 bg-teal-50/50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-teal-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-medium text-gray-700">Uploading...</p>
          </>
        ) : uploadedName ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              &ldquo;{uploadedName}&rdquo; uploaded and saved to Media Library
            </p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Drag and drop an image here, or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, GIF, WebP, SVG — max {MAX_SIZE_MB}MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 text-sm text-red-600" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
