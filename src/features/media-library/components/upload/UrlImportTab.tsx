'use client';

import { useState, useCallback } from 'react';
import {
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { useImportFromUrl } from '../../hooks';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';
import { MEDIA_CATEGORY_CONFIG } from '../../constants/media-constants';
import type { MediaCategory, ImportUrlBody } from '../../types/media.types';

/**
 * URL import form. Prominent inline URL input + Import button visible at first
 * paint. Optional Name and Category live behind a collapsible "Advanced
 * options" section. Auto-closes the modal shortly after a successful import.
 */
export function UrlImportTab() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MediaCategory | ''>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const importFromUrl = useImportFromUrl();
  const setUploadModalOpen = useMediaLibraryStore((s) => s.setUploadModalOpen);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!url.trim() || importFromUrl.isPending) return;

      setSuccessMessage(null);

      const body: ImportUrlBody = { url: url.trim() };
      if (name.trim()) body.name = name.trim();
      if (category) body.category = category as MediaCategory;

      importFromUrl.mutate(body, {
        onSuccess: () => {
          setSuccessMessage('Imported successfully!');
          setUrl('');
          setName('');
          setCategory('');
          // Auto-close after the user can see the checkmark.
          setTimeout(() => setUploadModalOpen(false), 800);
        },
      });
    },
    [url, name, category, importFromUrl, setUploadModalOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const isDisabled = !url.trim() || importFromUrl.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Primary input row: URL + Import button (always visible) ── */}
      <div>
        <label htmlFor="import-url" className="block text-sm font-medium text-gray-700 mb-1.5">
          Paste a URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="import-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSuccessMessage(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/image.jpg"
              autoFocus
              className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {importFromUrl.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import
              </>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Direct links to images, videos, audio, or documents.
        </p>
      </div>

      {/* ── Collapsible advanced options ── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors rounded-lg"
        >
          <span className="text-sm font-medium text-gray-700">Advanced options</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div>
              <label htmlFor="import-name" className="block text-xs font-medium text-gray-700 mb-1">
                Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="import-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My imported media"
                className="block w-full rounded-md border border-gray-300 bg-white py-1.5 px-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="import-category" className="block text-xs font-medium text-gray-700 mb-1">
                Category <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="import-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MediaCategory | '')}
                className="block w-full rounded-md border border-gray-300 bg-white py-1.5 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
              >
                <option value="">Select a category...</option>
                {Object.entries(MEDIA_CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Error state ── */}
      {importFromUrl.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            {importFromUrl.error instanceof Error
              ? importFromUrl.error.message
              : 'Failed to import from URL. Please check the URL and try again.'}
          </p>
        </div>
      )}

      {/* ── Success state ── */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </div>
      )}
    </form>
  );
}

export default UrlImportTab;
