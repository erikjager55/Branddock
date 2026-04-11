'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, ImageIcon, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useStockSearch, useImportStockPhoto } from '@/features/media-library/hooks';
import { StockSearchError } from '@/features/media-library/api/media.api';
import type { StockPhotoResult, ImportStockBody } from '@/features/media-library/types/media.types';
import type { InsertImageTabProps } from './types';

/**
 * Pexels stock photo search. Click a photo to import it as a MediaAsset
 * (medium size by default) and forward the URL/id to the parent modal.
 */
export function StockPhotosTab({ onSelected }: InsertImageTabProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const importStockPhoto = useImportStockPhoto();

  // Debounce the search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const {
    data: searchResults,
    isLoading,
    isError,
    error: searchError,
  } = useStockSearch(debouncedQuery, 1, debouncedQuery.length > 0);

  const isServiceUnconfigured =
    searchError instanceof StockSearchError && searchError.status === 503;
  const photos = searchResults?.photos ?? [];

  const handlePhotoClick = async (photo: StockPhotoResult) => {
    setError(null);
    setImportingId(photo.id);
    try {
      const body: ImportStockBody = {
        photoUrl: photo.src.large,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url,
        width: photo.width,
        height: photo.height,
        alt: photo.alt || undefined,
      };
      const asset = await importStockPhoto.mutateAsync(body);
      onSelected({
        url: asset.fileUrl,
        mediaAssetId: asset.id,
        alt: asset.name ?? undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search Pexels stock photos..."
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
        />
      </div>

      {/* Initial empty state */}
      {!debouncedQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Search Pexels for free stock photos
          </p>
        </div>
      )}

      {/* Loading */}
      {debouncedQuery && isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      )}

      {/* Service not configured */}
      {isError && isServiceUnconfigured && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings className="h-8 w-8 text-amber-500 mb-2" />
          <p className="text-sm font-medium text-gray-900">
            Pexels is not configured
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Add <code className="rounded bg-gray-100 px-1 font-mono">PEXELS_API_KEY</code> to enable stock photo search.
          </p>
        </div>
      )}

      {/* Generic error */}
      {(error || (isError && !isServiceUnconfigured)) && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            {error ?? (searchError instanceof Error ? searchError.message : 'Search failed')}
          </p>
        </div>
      )}

      {/* Results grid */}
      {debouncedQuery && !isLoading && !isError && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto">
          {photos.map((photo) => {
            const isImporting = importingId === photo.id;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => handlePhotoClick(photo)}
                disabled={importingId !== null}
                className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-wait"
              >
                <img src={photo.src.medium} alt={photo.alt} className="w-full h-full object-cover" />
                {isImporting && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                {!isImporting && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {debouncedQuery && !isLoading && !isError && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No photos found for &quot;{debouncedQuery}&quot;</p>
        </div>
      )}
    </div>
  );
}
