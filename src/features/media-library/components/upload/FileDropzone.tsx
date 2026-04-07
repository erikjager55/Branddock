'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, FileIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useUploadMedia } from '../../hooks';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';
import {
  MAX_FILE_SIZES,
  ACCEPTED_MIME_TYPES,
  getMediaTypeFromMime,
  formatFileSize,
} from '../../constants/media-constants';
import type { MediaType } from '../../types/media.types';

/** All accepted MIME types flattened into a single array */
const ALL_ACCEPTED_MIMES = Object.values(ACCEPTED_MIME_TYPES).flat();

/** Build an accept string for the file input */
const ACCEPT_STRING = ALL_ACCEPTED_MIMES.join(',');

interface FileEntry {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * Drag-and-drop file upload zone for the Media Library.
 * Validates file type and size before uploading via useUploadMedia.
 */
export function FileDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMedia = useUploadMedia();
  const setUploadModalOpen = useMediaLibraryStore((s) => s.setUploadModalOpen);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALL_ACCEPTED_MIMES.includes(file.type)) {
        return `"${file.name}" has an unsupported file type (${file.type || 'unknown'}).`;
      }

      const mediaType: MediaType = getMediaTypeFromMime(file.type);
      const maxSize = MAX_FILE_SIZES[mediaType];

      if (file.size > maxSize) {
        return `"${file.name}" exceeds the ${formatFileSize(maxSize)} limit for ${mediaType.toLowerCase()} files (${formatFileSize(file.size)}).`;
      }

      return null;
    },
    []
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      setUploadError(null);

      const fileArray = Array.from(files);
      const entries: FileEntry[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          entries.push({ file, status: 'error', error: validationError });
        } else {
          entries.push({ file, status: 'pending' });
        }
      }

      setSelectedFiles((prev) => [...prev, ...entries]);

      if (errors.length > 0) {
        setUploadError(errors.join(' '));
      }

      // Upload valid files concurrently using mutateAsync
      const validEntries = entries.filter((e) => e.status === 'pending');
      for (const entry of validEntries) {
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.file === entry.file ? { ...f, status: 'uploading' } : f
          )
        );

        uploadMedia
          .mutateAsync({ file: entry.file, body: { name: entry.file.name } })
          .then(() => {
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.file === entry.file ? { ...f, status: 'success' } : f
              )
            );
          })
          .catch((err) => {
            const message =
              err instanceof Error ? err.message : 'Upload failed';
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.file === entry.file
                  ? { ...f, status: 'error', error: message }
                  : f
              )
            );
          });
      }
    },
    [validateFile, uploadMedia]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback((file: File) => {
    setSelectedFiles((prev) => prev.filter((f) => f.file !== file));
  }, []);

  const allDone =
    selectedFiles.length > 0 &&
    selectedFiles.every((f) => f.status === 'success' || f.status === 'error');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-teal-500 bg-teal-50'
            : 'border-gray-300 hover:border-teal-400'
        }`}
      >
        <UploadCloud
          className={`mx-auto h-12 w-12 ${
            isDragging ? 'text-teal-500' : 'text-gray-400'
          }`}
        />

        <p className="mt-3 text-sm font-medium text-gray-700">
          Drag & drop files here
        </p>

        <p className="mt-1 text-xs text-gray-500">or</p>

        <button
          type="button"
          onClick={handleBrowseClick}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Browse Files
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="mt-4 text-xs text-gray-400">
          Images up to {formatFileSize(MAX_FILE_SIZES.IMAGE)} | Videos up to{' '}
          {formatFileSize(MAX_FILE_SIZES.VIDEO)} | Audio up to{' '}
          {formatFileSize(MAX_FILE_SIZES.AUDIO)} | Documents up to{' '}
          {formatFileSize(MAX_FILE_SIZES.DOCUMENT)}
        </p>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Files ({selectedFiles.length})
          </p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {selectedFiles.map((entry, idx) => (
              <li
                key={`${entry.file.name}-${idx}`}
                className="flex items-center gap-3 px-3 py-2"
              >
                <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">
                    {entry.file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(entry.file.size)}
                  </p>
                </div>

                {entry.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                )}
                {entry.status === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {entry.status === 'error' && (
                  <span
                    className="text-xs text-red-500 max-w-[160px] truncate"
                    title={entry.error}
                  >
                    {entry.error ?? 'Failed'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveFile(entry.file)}
                  className="p-0.5 text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Close after all done */}
      {allDone && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setUploadModalOpen(false)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default FileDropzone;
