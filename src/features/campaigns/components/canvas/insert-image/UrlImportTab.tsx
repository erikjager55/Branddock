'use client';

import React, { useState } from 'react';
import { Link as LinkIcon, Loader2, AlertCircle } from 'lucide-react';
import { useImportFromUrl } from '@/features/media-library/hooks';
import type { InsertImageTabProps } from './types';

/**
 * Import an image from a public URL.
 * Server downloads it, creates a MediaAsset, returns its URL + id.
 * On success: forwards to onSelected (modal closes + canvas store updates).
 */
export function UrlImportTab({ onSelected }: InsertImageTabProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const importMutation = useImportFromUrl();

  const handleImport = async () => {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }
    try {
      const response = await importMutation.mutateAsync({ url: trimmed });
      onSelected({
        url: response.asset.fileUrl,
        mediaAssetId: response.asset.id,
        alt: response.asset.name ?? undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        Paste an image URL from any public website. We&apos;ll download and save
        it to your media library.
      </div>

      <div className="relative">
        <LinkIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          placeholder="https://example.com/image.jpg"
          disabled={importMutation.isPending}
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={!url.trim() || importMutation.isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 text-sm transition-colors"
      >
        {importMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          'Import image'
        )}
      </button>
    </div>
  );
}
